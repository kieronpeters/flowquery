import type { DocAudience, DocDetail, DocSummary } from '../../shared/api-types'

/**
 * The documentation catalogue.
 *
 * Markdown is imported raw at build time from the repository itself, so the
 * website never keeps a second copy in the database or in a React component.
 * The worker owns the catalogue; the browser only receives the documents it is
 * allowed to read through `/api/v1/docs`.
 *
 * Internal documents are therefore never bundled into the client JavaScript.
 */

const docModules = import.meta.glob('/docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

type RawDoc = DocDetail

function normalisePath(key: string): string {
  return key.replace(/^\//, '')
}

function slugFor(path: string): string {
  if (path === 'docs/README.md') return 'internal/docs-index'
  return path
    .replace(/^docs\//, '')
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/_/g, '-')
}

function audienceFor(path: string): DocAudience {
  if (path.startsWith('docs/agents/')) return 'agents'
  if (path.startsWith('docs/user/')) return 'user'
  return 'internal'
}

function stripInline(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .trim()
}

function titleFor(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? stripInline(match[1]!) : fallback
}

function descriptionFor(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  let seenTitle = false

  for (const line of lines) {
    const text = line.trim()
    if (!text) continue
    if (/^#\s+/.test(text)) {
      seenTitle = true
      continue
    }
    if (!seenTitle) continue
    if (/^(#{2,6}\s|[-*+]\s|\d+\.\s|>|\||```|<!--)/.test(text)) continue
    return stripInline(text).slice(0, 180)
  }

  return ''
}

function headingsFor(markdown: string): string[] {
  return [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) => stripInline(match[1]!))
}

function build(): RawDoc[] {
  return Object.entries(docModules)
    .map(([key, markdown]) => {
      const path = normalisePath(key)
      const slug = slugFor(path)
      const fallback = path.split('/').pop()?.replace(/\.md$/, '') ?? slug
      return {
        slug,
        path,
        audience: audienceFor(path),
        title: titleFor(markdown, fallback),
        description: descriptionFor(markdown),
        headings: headingsFor(markdown),
        markdown,
      }
    })
    .sort((a, b) => {
      const order: Record<DocAudience, number> = { agents: 0, user: 1, internal: 2 }
      if (order[a.audience] !== order[b.audience]) return order[a.audience] - order[b.audience]
      if (a.slug === 'agents/ai-agent-entrypoint') return -1
      if (b.slug === 'agents/ai-agent-entrypoint') return 1
      return a.title.localeCompare(b.title)
    })
}

const catalogue = build()

export function listDocs(): DocSummary[] {
  return catalogue.map(({ slug, path, audience, title, description, headings }) => ({
    slug,
    path,
    audience,
    title,
    description,
    headings,
  }))
}

export function getDoc(slug: string): DocDetail | null {
  const wanted = slug.replace(/^\/+|\/+$/g, '').toLowerCase()
  return catalogue.find((doc) => doc.slug === wanted) ?? null
}
