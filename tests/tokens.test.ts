import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { sha256Hex } from '../src/worker/lib/ids'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
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

type Created = {
  token: string
  record: { id: string; profileId: string | null; label: string; tokenPrefix: string }
}

/** Issues a token for the seeded Bob profile. */
async function createToken(profileId = 'prf_bob'): Promise<Created> {
  const response = await call('POST', '/api/v1/boards/brd_demo/tokens', { profileId })
  expect(response.status).toBe(201)
  return (await response.json()) as Created
}

function agentCall(token: string, path: string) {
  return app.request(path, { headers: { authorization: `Bearer ${token}` } }, env(db))
}

describe('POST /api/v1/boards/:boardId/tokens', () => {
  it('returns the plaintext once and stores only a hash', async () => {
    const created = await createToken()

    expect(created.token).toMatch(/^fq_[0-9A-HJKMNP-TV-Z]+$/)
    expect(created.token.length).toBeGreaterThan(30)
    expect(created.record.tokenPrefix).toBe(created.token.slice(0, 8))

    const { results } = await db
      .prepare('SELECT token_hash, token_prefix FROM agent_tokens WHERE id = ?')
      .bind(created.record.id)
      .all<{ token_hash: string; token_prefix: string }>()

    const stored = results?.[0]
    expect(stored?.token_hash).toBe(await sha256Hex(created.token))
    expect(stored?.token_hash).not.toBe(created.token)
    expect(stored?.token_prefix).not.toBe(created.token)
  })

  it('takes the label from the agent, not from the request', async () => {
    // A caller that tries to name the token something else is ignored: the
    // label is what activity attribution matches on, so it is not negotiable.
    const response = await call('POST', '/api/v1/boards/brd_demo/tokens', {
      profileId: 'prf_bob',
      label: 'something else entirely',
    })

    const body = (await response.json()) as Created
    expect(body.record.label).toBe('Bob')
    expect(body.record.profileId).toBe('prf_bob')
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
      profileId: 'prf_bob',
      label: 'Bob',
      tokenPrefix: created.token.slice(0, 8),
      revokedAt: null,
    })
  })

  it('allows one token per agent, and refuses a second', async () => {
    await createToken()

    const again = await call('POST', '/api/v1/boards/brd_demo/tokens', { profileId: 'prf_bob' })
    expect(again.status).toBe(409)

    const body = (await again.json()) as { error: { message: string } }
    expect(body.error.message).toContain('Bob')
  })

  it('lets a different agent hold its own token on the same board', async () => {
    await createToken('prf_bob')
    await createToken('prf_alex')

    const response = await call('GET', '/api/v1/boards/brd_demo/tokens')
    const body = (await response.json()) as { tokens: { label: string }[] }
    expect(body.tokens.map((token) => token.label).sort()).toEqual(['Alex', 'Bob'])
  })

  it('lets the same agent hold one token on each board', async () => {
    await createToken('prf_bob')

    const other = await call('POST', '/api/v1/boards', { name: 'Other board' })
    const otherBoard = (await other.json()) as { board: { id: string } }

    const response = await call('POST', `/api/v1/boards/${otherBoard.board.id}/tokens`, {
      profileId: 'prf_bob',
    })
    expect(response.status).toBe(201)
  })

  it('refuses a human profile', async () => {
    const response = await call('POST', '/api/v1/boards/brd_demo/tokens', {
      profileId: 'prf_abdul',
    })
    expect(response.status).toBe(400)
  })

  it('rejects a missing or unknown agent', async () => {
    for (const body of [{}, { profileId: '' }, { profileId: 42 }]) {
      const response = await call('POST', '/api/v1/boards/brd_demo/tokens', body)
      expect(response.status).toBe(400)
    }

    const missing = await call('POST', '/api/v1/boards/brd_demo/tokens', { profileId: 'prf_nope' })
    expect(missing.status).toBe(404)
  })

  it('returns 404 for an unknown board', async () => {
    const response = await call('POST', '/api/v1/boards/brd_missing/tokens', {
      profileId: 'prf_bob',
    })
    expect(response.status).toBe(404)
  })

  it('requires a human session', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo/tokens',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profileId: 'prf_bob' }),
      },
      env(db),
    )
    expect(response.status).toBe(401)
  })
})

describe('POST /api/v1/boards/:boardId/tokens/:tokenId/rotate', () => {
  it('replaces the token, and the old one stops working immediately', async () => {
    const created = await createToken()

    expect((await agentCall(created.token, '/api/v1/agent/board')).status).toBe(200)

    const response = await call(
      'POST',
      `/api/v1/boards/brd_demo/tokens/${created.record.id}/rotate`,
    )
    expect(response.status).toBe(201)

    const rotated = (await response.json()) as Created
    expect(rotated.token).not.toBe(created.token)
    expect(rotated.record.label).toBe('Bob')

    // The whole point of rotating: the old value is dead, the new one works.
    expect((await agentCall(created.token, '/api/v1/agent/board')).status).toBe(401)
    expect((await agentCall(rotated.token, '/api/v1/agent/board')).status).toBe(200)
  })

  it('leaves exactly one live token, keeping the old row for the record', async () => {
    const created = await createToken()
    await call('POST', `/api/v1/boards/brd_demo/tokens/${created.record.id}/rotate`)

    const response = await call('GET', '/api/v1/boards/brd_demo/tokens')
    const body = (await response.json()) as { tokens: { revokedAt: string | null }[] }

    expect(body.tokens).toHaveLength(2)
    expect(body.tokens.filter((token) => token.revokedAt === null)).toHaveLength(1)
  })

  it('does not allow a second rotation of an already revoked token', async () => {
    const created = await createToken()
    await call('POST', `/api/v1/boards/brd_demo/tokens/${created.record.id}/rotate`)

    const again = await call('POST', `/api/v1/boards/brd_demo/tokens/${created.record.id}/rotate`)
    expect(again.status).toBe(404)
  })

  it('returns 404 for an unknown token, and cannot cross boards', async () => {
    const missing = await call('POST', '/api/v1/boards/brd_demo/tokens/tok_missing/rotate')
    expect(missing.status).toBe(404)

    const created = await createToken()
    const other = await call('POST', '/api/v1/boards', { name: 'Other board' })
    const otherBoard = (await other.json()) as { board: { id: string } }

    const crossed = await call(
      'POST',
      `/api/v1/boards/${otherBoard.board.id}/tokens/${created.record.id}/rotate`,
    )
    expect(crossed.status).toBe(404)
  })
})

describe('DELETE /api/v1/boards/:boardId/tokens/:tokenId', () => {
  it('revokes a token, which then stops working immediately', async () => {
    const created = await createToken()

    expect((await agentCall(created.token, '/api/v1/agent/board')).status).toBe(200)

    const revoke = await call('DELETE', `/api/v1/boards/brd_demo/tokens/${created.record.id}`)
    expect(revoke.status).toBe(204)

    expect((await agentCall(created.token, '/api/v1/agent/board')).status).toBe(401)
  })

  it('keeps the revoked row for the record', async () => {
    const created = await createToken()
    await call('DELETE', `/api/v1/boards/brd_demo/tokens/${created.record.id}`)

    const response = await call('GET', '/api/v1/boards/brd_demo/tokens')
    const body = (await response.json()) as { tokens: { revokedAt: string | null }[] }
    expect(body.tokens[0]?.revokedAt).toBeTruthy()
  })

  it('frees the agent to be issued a fresh token afterwards', async () => {
    const created = await createToken()
    await call('DELETE', `/api/v1/boards/brd_demo/tokens/${created.record.id}`)

    const again = await call('POST', '/api/v1/boards/brd_demo/tokens', { profileId: 'prf_bob' })
    expect(again.status).toBe(201)
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
