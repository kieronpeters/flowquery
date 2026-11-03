import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { sha256Hex } from '../src/worker/lib/ids'
import { createSqliteD1 } from './helpers/sqlite-d1'

/** Agent token management (AGT-001…005). */

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

function call(method: string, path: string, body?: unknown) {
  return app.request(
    path,
    {
      method,
      headers: { cookie, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env(db),
  )
}

type Created = { token: string; record: { id: string; label: string; tokenPrefix: string } }

async function createToken(label = 'Bob — main'): Promise<Created> {
  const response = await call('POST', '/api/v1/boards/brd_demo/tokens', { label })
  expect(response.status).toBe(201)
  return (await response.json()) as Created
}

describe('POST /api/v1/boards/:boardId/tokens', () => {
  it('returns the plaintext once and stores only a hash', async () => {
    const created = await createToken('Bob — main')

    expect(created.token).toMatch(/^fq_[0-9A-HJKMNP-TV-Z]+$/)
    expect(created.token.length).toBeGreaterThan(30)
    expect(created.record.tokenPrefix).toBe(created.token.slice(0, 8))
    expect(created.record.label).toBe('Bob — main')

    const { results } = await db
      .prepare('SELECT token_hash, token_prefix FROM agent_tokens WHERE id = ?')
      .bind(created.record.id)
      .all<{ token_hash: string; token_prefix: string }>()

    const stored = results?.[0]
    expect(stored?.token_hash).toBe(await sha256Hex(created.token))
    expect(stored?.token_hash).not.toBe(created.token)
    expect(stored?.token_prefix).not.toBe(created.token)
  })

  it('never returns the plaintext again on list', async () => {
    const created = await createToken()

    const response = await call('GET', '/api/v1/boards/brd_demo/tokens')
    expect(response.status).toBe(200)

    const body = (await response.json()) as { tokens: Record<string, unknown>[] }
    expect(body.tokens).toHaveLength(1)

    // The prefix is shown so tokens can be told apart; the secret is not.
    const serialised = JSON.stringify(body)
    expect(serialised).not.toContain(created.token)
    expect(body.tokens[0]).toMatchObject({
      label: 'Bob — main',
      tokenPrefix: created.token.slice(0, 8),
      revokedAt: null,
    })
  })

  it('allows several tokens on one board', async () => {
    await createToken('Bob — main')
    await createToken('Bob — backlog cleanup')

    const response = await call('GET', '/api/v1/boards/brd_demo/tokens')
    const body = (await response.json()) as { tokens: { label: string }[] }
    expect(body.tokens.map((token) => token.label)).toEqual(['Bob — backlog cleanup', 'Bob — main'])
  })

  it('rejects an empty or oversized label', async () => {
    for (const label of ['', '   ', 'x'.repeat(81), 42]) {
      const response = await call('POST', '/api/v1/boards/brd_demo/tokens', { label })
      expect(response.status).toBe(400)
    }
  })

  it('returns 404 for an unknown board', async () => {
    const response = await call('POST', '/api/v1/boards/brd_missing/tokens', { label: 'x' })
    expect(response.status).toBe(404)
  })

  it('requires a human session', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo/tokens',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: 'x' }),
      },
      env(db),
    )
    expect(response.status).toBe(401)
  })
})

describe('DELETE /api/v1/boards/:boardId/tokens/:tokenId', () => {
  it('revokes a token, which then stops working immediately', async () => {
    const created = await createToken()

    const before = await app.request(
      '/api/v1/agent/board',
      { headers: { authorization: `Bearer ${created.token}` } },
      env(db),
    )
    expect(before.status).toBe(200)

    const revoke = await call('DELETE', `/api/v1/boards/brd_demo/tokens/${created.record.id}`)
    expect(revoke.status).toBe(204)

    const after = await app.request(
      '/api/v1/agent/board',
      { headers: { authorization: `Bearer ${created.token}` } },
      env(db),
    )
    expect(after.status).toBe(401)
  })

  it('keeps the revoked row for the record', async () => {
    const created = await createToken()
    await call('DELETE', `/api/v1/boards/brd_demo/tokens/${created.record.id}`)

    const response = await call('GET', '/api/v1/boards/brd_demo/tokens')
    const body = (await response.json()) as { tokens: { revokedAt: string | null }[] }
    expect(body.tokens[0]?.revokedAt).toBeTruthy()
  })

  it('returns 404 for an unknown token', async () => {
    const response = await call('DELETE', '/api/v1/boards/brd_demo/tokens/tok_missing')
    expect(response.status).toBe(404)
  })

  it('cannot revoke a token through another board', async () => {
    const created = await createToken()

    const other = await call('POST', '/api/v1/boards', { name: 'Other board' })
    const otherBoard = (await other.json()) as { board: { id: string } }

    const response = await call(
      'DELETE',
      `/api/v1/boards/${otherBoard.board.id}/tokens/${created.record.id}`,
    )
    expect(response.status).toBe(404)
  })
})
