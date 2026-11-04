import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * Agent avatars are set by humans, never by agents, and only to a known set of
 * variants — the database must not accumulate paths the UI cannot draw.
 */

const ALLOWLIST = parseAllowlist('12345:Kieron')
const BOARD = 'brd_demo'

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

function patch(profileId: string, body: unknown) {
  return app.request(
    `/api/v1/profiles/${profileId}`,
    {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    env(db),
  )
}

describe('PATCH /api/v1/profiles/:profileId', () => {
  it('sets an agent avatar and returns it in the profile list', async () => {
    const response = await patch('prf_bob', { avatarPath: 'svg:teal' })
    expect(response.status).toBe(200)

    const list = await app.request('/api/v1/profiles', { headers: { cookie } }, env(db))
    const body = (await list.json()) as { profiles: { id: string; avatarPath: string | null }[] }
    const bob = body.profiles.find((profile) => profile.id === 'prf_bob')

    expect(bob?.avatarPath).toBe('svg:teal')
  })

  it('refuses an unknown variant instead of storing it', async () => {
    expect((await patch('prf_bob', { avatarPath: 'svg:chartreuse' })).status).toBe(400)
    expect((await patch('prf_bob', { avatarPath: 'robot.png' })).status).toBe(400)
    expect((await patch('prf_bob', { avatarPath: 42 })).status).toBe(400)
  })

  it('refuses to set a picture on a human, whose picture is GitHub', async () => {
    const response = await patch('prf_abdul', { avatarPath: 'svg:rose' })
    expect(response.status).toBe(400)
  })

  it('returns 404 for a profile that does not exist', async () => {
    expect((await patch('prf_missing', { avatarPath: 'svg:teal' })).status).toBe(404)
  })

  it('requires a session', async () => {
    const response = await app.request(
      '/api/v1/profiles/prf_bob',
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatarPath: 'svg:teal' }),
      },
      env(db),
    )
    expect(response.status).toBe(401)
  })

  it('is not reachable by an agent token', async () => {
    const created = await app.request(
      `/api/v1/boards/${BOARD}/tokens`,
      {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ profileId: 'prf_bob' }),
      },
      env(db),
    )
    const token = ((await created.json()) as { token: string }).token

    const response = await app.request(
      '/api/v1/profiles/prf_bob',
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ avatarPath: 'svg:teal' }),
      },
      env(db),
    )

    // Appearance is administration; the agent namespace has no profile write.
    expect(response.status).toBe(401)
  })
})
