import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { createSqliteD1 } from './helpers/sqlite-d1'

/** Uploaded profile pictures. */

const ALLOWLIST = parseAllowlist('12345:Kieron')

/** A real 1×1 PNG. Magic bytes matter: the Worker sniffs them. */
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

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

function upload(profileId: string, body: unknown, withCookie = true) {
  return app.request(
    `/api/v1/profiles/${profileId}/image`,
    {
      method: 'PUT',
      headers: withCookie
        ? { cookie, 'content-type': 'application/json' }
        : { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    env(db),
  )
}

function serve(profileId: string, withCookie = true) {
  return app.request(
    `/api/v1/avatars/${profileId}`,
    { headers: withCookie ? { cookie } : {} },
    env(db),
  )
}

async function profiles(): Promise<{ id: string; avatarUrl: string | null }[]> {
  const response = await app.request('/api/v1/profiles', { headers: { cookie } }, env(db))
  const body = (await response.json()) as { profiles: { id: string; avatarUrl: string | null }[] }
  return body.profiles
}

describe('PUT /api/v1/profiles/:profileId/image', () => {
  it('stores a picture for an agent and serves it back', async () => {
    const response = await upload('prf_bob', { mime: 'image/png', data: PNG })
    expect(response.status).toBe(200)

    const body = (await response.json()) as { avatarUrl: string }
    expect(body.avatarUrl).toContain('/api/v1/avatars/prf_bob?v=')

    const image = await serve('prf_bob')
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/png')
    expect(image.headers.get('x-content-type-options')).toBe('nosniff')

    const bytes = new Uint8Array(await image.arrayBuffer())
    expect(bytes[0]).toBe(0x89)
    expect(bytes[1]).toBe(0x50)
  })

  it('reports the picture in the profile list, without the bytes', async () => {
    const before = await profiles()
    expect(before.find((profile) => profile.id === 'prf_bob')?.avatarUrl).toBeNull()

    await upload('prf_bob', { mime: 'image/png', data: PNG })

    const after = await profiles()
    expect(after.find((profile) => profile.id === 'prf_bob')?.avatarUrl).toContain(
      '/api/v1/avatars/prf_bob',
    )

    // The list is loaded on every board view: it must never carry image data.
    const response = await app.request('/api/v1/profiles', { headers: { cookie } }, env(db))
    expect(await response.text()).not.toContain(PNG)
  })

  it('replaces an existing picture rather than accumulating rows', async () => {
    await upload('prf_bob', { mime: 'image/png', data: PNG })
    await upload('prf_bob', { mime: 'image/png', data: PNG })

    const { results } = await db
      .prepare('SELECT COUNT(*) AS total FROM profile_avatars WHERE profile_id = ?')
      .bind('prf_bob')
      .all<{ total: number }>()

    expect(results?.[0]?.total).toBe(1)
  })

  it('refuses anything that is not a raster image', async () => {
    // SVG is a document, not a picture: it can carry script.
    for (const mime of ['image/svg+xml', 'image/gif', 'text/html', 'application/octet-stream']) {
      const response = await upload('prf_bob', { mime, data: PNG })
      expect(response.status).toBe(400)
    }
  })

  it('refuses a body whose bytes disagree with its declared type', async () => {
    // A PNG announced as a JPEG. Either value alone would look plausible.
    const response = await upload('prf_bob', { mime: 'image/jpeg', data: PNG })
    expect(response.status).toBe(400)
  })

  it('refuses data that is not base64, or not base64 of an image', async () => {
    for (const data of ['not base64 at all!', '', 'AAAA', 'aGVsbG8gd29ybGQ=']) {
      const response = await upload('prf_bob', { mime: 'image/png', data })
      expect(response.status).toBe(400)
    }
  })

  it('refuses an image over the size limit', async () => {
    // Passes the base64 alphabet check, then fails on size.
    const response = await upload('prf_bob', { mime: 'image/png', data: 'A'.repeat(200_000) })
    expect(response.status).toBe(400)
  })

  it('lets a human set their own picture', async () => {
    const me = await app.request('/api/v1/auth/me', { headers: { cookie } }, env(db))
    const profileId = ((await me.json()) as { user: { profileId: string } }).user.profileId

    const response = await upload(profileId, { mime: 'image/png', data: PNG })
    expect(response.status).toBe(200)
  })

  it('does not let a human change another human', async () => {
    // Abdul is a seeded human profile; Kieron is signed in.
    const response = await upload('prf_abdul', { mime: 'image/png', data: PNG })
    expect(response.status).toBe(403)
  })

  it('returns 404 for an unknown profile', async () => {
    const response = await upload('prf_nope', { mime: 'image/png', data: PNG })
    expect(response.status).toBe(404)
  })

  it('requires a session, and an agent token is not one', async () => {
    expect((await upload('prf_bob', { mime: 'image/png', data: PNG }, false)).status).toBe(401)
    expect((await serve('prf_bob', false)).status).toBe(401)

    const created = await app.request(
      '/api/v1/boards/brd_demo/tokens',
      {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ profileId: 'prf_bob' }),
      },
      env(db),
    )
    const token = ((await created.json()) as { token: string }).token

    const viaAgent = await app.request(
      '/api/v1/avatars/prf_bob',
      { headers: { authorization: `Bearer ${token}` } },
      env(db),
    )
    expect(viaAgent.status).toBe(401)
  })
})

describe('DELETE /api/v1/profiles/:profileId/image', () => {
  it('removes the picture, falling back to the drawn avatar', async () => {
    await upload('prf_bob', { mime: 'image/png', data: PNG })

    const response = await app.request(
      '/api/v1/profiles/prf_bob/image',
      { method: 'DELETE', headers: { cookie } },
      env(db),
    )
    expect(response.status).toBe(204)

    expect((await serve('prf_bob')).status).toBe(404)
    expect((await profiles()).find((profile) => profile.id === 'prf_bob')?.avatarUrl).toBeNull()
  })

  it('is harmless when there was no picture', async () => {
    const response = await app.request(
      '/api/v1/profiles/prf_bob/image',
      { method: 'DELETE', headers: { cookie } },
      env(db),
    )
    expect(response.status).toBe(204)
  })

  it('does not let a human clear another human', async () => {
    const response = await app.request(
      '/api/v1/profiles/prf_abdul/image',
      { method: 'DELETE', headers: { cookie } },
      env(db),
    )
    expect(response.status).toBe(403)
  })
})

describe('GET /api/v1/avatars/:profileId', () => {
  it('returns 404 when the profile has no uploaded picture', async () => {
    expect((await serve('prf_bob')).status).toBe(404)
  })
})
