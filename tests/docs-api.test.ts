import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * Repository documentation, served from the worker.
 *
 * The Markdown is imported from the repository at build time; these tests prove
 * the catalogue, the audience grouping, the session gate and the 404.
 */

const ALLOWLIST = parseAllowlist('12345:Kieron')

function env(db: D1Database): never {
  return { DB: db } as never
}

async function signIn(db: D1Database): Promise<string> {
  const result = await completeSignIn({
    store: createD1AuthStore(db),
    allowlist: ALLOWLIST,
    profile: { id: '12345', login: 'kieron', email: 'kieron@example.com', displayName: 'Kieron' },
    now: Date.now(),
  })
  return `__Host-fq_session=${result.token}`
}

let db: D1Database
let cookie: string

beforeEach(async () => {
  db = createSqliteD1({ seed: true })
  cookie = await signIn(db)
})

type DocList = {
  docs: Array<{ slug: string; audience: string; title: string; path: string }>
}

describe('GET /api/v1/docs', () => {
  it('requires a session', async () => {
    const response = await app.request('/api/v1/docs', {}, env(db))
    expect(response.status).toBe(401)
  })

  it('lists the agents, user and internal sections', async () => {
    const response = await app.request('/api/v1/docs', { headers: { cookie } }, env(db))
    expect(response.status).toBe(200)

    const body = (await response.json()) as DocList
    const entrypoint = body.docs.find((doc) => doc.slug === 'agents/ai-agent-entrypoint')
    expect(entrypoint).toBeTruthy()
    expect(entrypoint?.path).toBe('docs/agents/AI_AGENT_ENTRYPOINT.md')

    expect(body.docs.some((doc) => doc.audience === 'agents')).toBe(true)
    expect(body.docs.some((doc) => doc.audience === 'user')).toBe(true)
    expect(body.docs.some((doc) => doc.audience === 'internal')).toBe(true)
  })

  it('discovers the consolidated docs tree and nothing outside docs/', async () => {
    const response = await app.request('/api/v1/docs', { headers: { cookie } }, env(db))
    const body = (await response.json()) as DocList

    const bySlug = new Map(body.docs.map((doc) => [doc.slug, doc.path]))

    expect(bySlug.get('agents/team-directory')).toBe('docs/agents/TEAM_DIRECTORY.md')
    expect(bySlug.get('agents/agent-operating-model')).toBe('docs/agents/AGENT_OPERATING_MODEL.md')
    expect(bySlug.get('internal/architecture')).toBe('docs/internal/ARCHITECTURE.md')
    expect(bySlug.get('internal/docs-index')).toBe('docs/README.md')
    expect(bySlug.get('internal/decisions')).toBe('docs/internal/DECISIONS.md')

    for (const doc of body.docs) {
      expect(doc.path.startsWith('docs/')).toBe(true)
    }
  })

  it('returns the Markdown for one document', async () => {
    const response = await app.request(
      '/api/v1/docs/agents/ai-agent-entrypoint',
      { headers: { cookie } },
      env(db),
    )
    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      doc: { title: string; markdown: string; path: string }
    }
    expect(body.doc.title).toBe('FlowQuery — AI Agent Entry Point')
    expect(body.doc.markdown).toContain('Canonical AI roster')
    expect(body.doc.path).toBe('docs/agents/AI_AGENT_ENTRYPOINT.md')
  })

  it('returns 404 for an unknown document', async () => {
    const response = await app.request('/api/v1/docs/nope', { headers: { cookie } }, env(db))
    expect(response.status).toBe(404)
  })

  it('does not accept an agent bearer token as a session', async () => {
    const response = await app.request(
      '/api/v1/docs',
      { headers: { authorization: 'Bearer not-a-session' } },
      env(db),
    )
    expect(response.status).toBe(401)
  })
})
