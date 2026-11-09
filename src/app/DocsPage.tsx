import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import type { DocAudience, DocDetail, DocSummary } from '../shared/api-types'
import { AI_AGENT_ENTRYPOINT_PATH } from '../shared/ai-onboarding'

/**
 * The documentation browser.
 *
 * Markdown comes from `/api/v1/docs`, which reads the repository files in the
 * worker. The client never bundles internal documentation: it only receives the
 * document it asks for, after the session check.
 */

const SECTIONS: Array<{ audience: DocAudience; label: string }> = [
  { audience: 'agents', label: 'AI agents' },
  { audience: 'user', label: 'User guides' },
  { audience: 'internal', label: 'Internal' },
]

function matches(doc: DocSummary, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [doc.title, doc.description, ...doc.headings].some((value) =>
    value.toLowerCase().includes(needle),
  )
}

/**
 * Resolve a repository-relative Markdown link to a docs route.
 *
 * The source documents use repository-relative links such as
 * `../internal/ARCHITECTURE.md`, which work on GitHub and in an editor. The
 * website translates them to its own slugs instead of maintaining a second set
 * of links.
 */
function resolveDocHref(
  href: string | undefined,
  currentPath: string,
): { external: true; href: string } | { external: false; href: string } | null {
  if (!href) return null
  if (/^(https?:|mailto:)/i.test(href)) return { external: true, href }
  if (href.startsWith('#')) return null
  if (!href.endsWith('.md')) return null

  const parts = [...currentPath.split('/').slice(0, -1), ...href.split('/')]
  const resolved: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  const path = resolved.join('/')

  if (path.startsWith('docs/')) {
    const slug = path.slice('docs/'.length).replace(/\.md$/, '').toLowerCase().replace(/_/g, '-')
    if (slug === 'readme') return { external: false, href: '/docs/internal/docs-index' }
    return { external: false, href: `/docs/${slug}` }
  }

  return null
}

function MarkdownDocument({ doc }: { doc: DocDetail }) {
  return (
    <article className="doc-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const target = resolveDocHref(href, doc.path)
            if (!target) {
              return <a href={href}>{children}</a>
            }
            if (target.external) {
              return (
                <a href={target.href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              )
            }
            return <Link to={target.href}>{children}</Link>
          },
          img({ src, alt }) {
            return <img src={src} alt={alt ?? ''} loading="lazy" />
          },
        }}
      >
        {doc.markdown}
      </ReactMarkdown>
    </article>
  )
}

export function DocsPage() {
  const params = useParams()
  const slug = params['*'] ?? ''
  const navigate = useNavigate()

  const [docs, setDocs] = useState<DocSummary[] | null>(null)
  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/docs')
      .then(async (response) => {
        if (response.status === 401) {
          navigate(`/login?next=${encodeURIComponent(slug ? `/docs/${slug}` : '/docs')}`, {
            replace: true,
          })
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = (await response.json()) as { docs?: DocSummary[] }
        if (!Array.isArray(body.docs)) throw new Error('Unexpected payload')
        if (!cancelled) setDocs(body.docs)
      })
      .catch(() => {
        if (!cancelled) setError('The documentation index could not be loaded.')
      })

    return () => {
      cancelled = true
    }
  }, [navigate, slug])

  useEffect(() => {
    if (!slug) {
      setDoc(null)
      return
    }

    let cancelled = false
    setError(null)
    setDoc(null)

    fetch(`/api/v1/docs/${slug}`)
      .then(async (response) => {
        if (response.status === 401) {
          navigate(`/login?next=${encodeURIComponent(`/docs/${slug}`)}`, { replace: true })
          return
        }
        if (response.status === 404) {
          if (!cancelled) setError('That document does not exist.')
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = (await response.json()) as { doc?: DocDetail }
        if (!body.doc) throw new Error('Unexpected payload')
        if (!cancelled) setDoc(body.doc)
      })
      .catch(() => {
        if (!cancelled) setError('The document could not be loaded.')
      })

    return () => {
      cancelled = true
    }
  }, [navigate, slug])

  const filtered = useMemo(() => (docs ?? []).filter((item) => matches(item, query)), [docs, query])

  if (!slug && docs && docs.length > 0) {
    const entrypoint = docs.find((item) => item.slug === 'agents/ai-agent-entrypoint')
    return (
      <Navigate to={entrypoint ? AI_AGENT_ENTRYPOINT_PATH : `/docs/${docs[0]!.slug}`} replace />
    )
  }

  return (
    <main className="page docs-page">
      <header className="docs-header">
        <div>
          <h1>Documentation</h1>
          <p className="lede">
            The repository is the source of truth. These pages read the Markdown directly.
          </p>
        </div>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar" aria-label="Documentation navigation">
          <label className="field docs-search">
            <span className="field-label">Search</span>
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents and headings"
            />
          </label>

          {docs === null ? (
            <p role="status">Loading index…</p>
          ) : (
            SECTIONS.map((section) => {
              const items = filtered.filter((item) => item.audience === section.audience)
              if (items.length === 0) return null

              return (
                <section className="docs-nav-section" key={section.audience}>
                  <h2 className="section-heading">{section.label}</h2>
                  <ul className="docs-nav-list">
                    {items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          className={
                            item.slug === slug
                              ? 'docs-nav-link docs-nav-link-active'
                              : 'docs-nav-link'
                          }
                          to={`/docs/${item.slug}`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          )}
        </aside>

        <div className="docs-body">
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          {!slug ? (
            <p className="note">Choose a document from the navigation.</p>
          ) : doc === null && !error ? (
            <p role="status">Loading document…</p>
          ) : doc ? (
            <MarkdownDocument doc={doc} />
          ) : null}
        </div>
      </div>
    </main>
  )
}
