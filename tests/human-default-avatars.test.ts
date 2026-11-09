import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * The two human administrators get supplied default portraits.
 *
 * The mapping is keyed by the immutable GitHub numeric id, not by a display
 * name. Abdul's profile is pre-created, so the profile id is a fallback until
 * his identity row exists.
 */

const ALLOWLIST = parseAllowlist('51761129:Kieron,37402145:Abdul')

/** A real 1x1 PNG; the Worker sniffs magic bytes. */
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const KIERON = {
  id: '51761129',
  login: 'kieronpeters',
  email: 'kieron@example.com',
  displayName: 'Kieron',
}

const ABDUL = {
  id: '37402145',
  login: 'abdulfs2018',
  email: 'abdul@example.com',
  displayName: 'Abdul',
}

function env(db: D1Database): never {
  return { DB: db } as never
}

async function signIn(db: D1Database, profile: typeof KIERON): Promise<string> {
  const result = await completeSignIn({
    store: createD1AuthStore(db),
    allowlist: ALLOWLIST,
    profile,
    now: Date.now(),
  })
  return `__Host-fq_session=${result.token}`
}

let db: D1Database
let cookie: string
let ownProfileId: string

beforeEach(async () => {
  db = createSqliteD1({ seed: true })
  cookie = await signIn(db, KIERON)

  const me = await app.request('/api/v1/auth/me', { headers: { cookie } }, env(db))
  ownProfileId = ((await me.json()) as { user: { profileId: string } }).user.profileId
})

function get(path: string, headers: Record<string, string> = { cookie }) {
  return app.request(path, { headers }, env(db))
}

type Me = { user: { profileId: string; avatarUrl: string | null } }
type Detail = {
  profile: {
    id: string
    displayName: string
    avatarUrl: string | null
    hasUploadedImage: boolean
    hasDefaultAvatar: boolean
  }
}

describe('human default avatars', () => {
  it('shows Kieron his supplied portrait in the account menu payload', async () => {
    const body = (await (await get('/api/v1/auth/me')).json()) as Me

    expect(body.user.profileId).toBe(ownProfileId)
    expect(body.user.avatarUrl).toBe('/brand/humans/kieron-default.png')
  })

  it('maps Kieron and the pre-created Abdul profile to different files', async () => {
    const body = (await (await get('/api/v1/profiles')).json()) as {
      profiles: { id: string; displayName: string; avatarUrl: string | null }[]
    }

    expect(body.profiles.find((profile) => profile.id === ownProfileId)?.avatarUrl).toBe(
      '/brand/humans/kieron-default.png',
    )
    expect(body.profiles.find((profile) => profile.id === 'prf_abdul')?.avatarUrl).toBe(
      '/brand/humans/abdul-default.png',
    )
  })

  it('keeps Abdul’s default after he signs in and adopts prf_abdul', async () => {
    const abdulCookie = await signIn(db, ABDUL)

    const body = (await (
      await get('/api/v1/profiles/prf_abdul', { cookie: abdulCookie })
    ).json()) as Detail
    expect(body.profile.displayName).toBe('Abdul')
    expect(body.profile.avatarUrl).toBe('/brand/humans/abdul-default.png')
    expect(body.profile.hasDefaultAvatar).toBe(true)
  })

  it('lets an upload win and restores the default when it is removed', async () => {
    const upload = await app.request(
      `/api/v1/profiles/${ownProfileId}/image`,
      {
        method: 'PUT',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ mime: 'image/png', data: PNG }),
      },
      env(db),
    )
    expect(upload.status).toBe(200)

    const afterUpload = (await (await get('/api/v1/profiles/' + ownProfileId)).json()) as Detail
    expect(afterUpload.profile.avatarUrl).toContain('/api/v1/avatars/')
    expect(afterUpload.profile.hasUploadedImage).toBe(true)
    expect(afterUpload.profile.hasDefaultAvatar).toBe(true)

    const remove = await app.request(
      `/api/v1/profiles/${ownProfileId}/image`,
      { method: 'DELETE', headers: { cookie } },
      env(db),
    )
    expect(remove.status).toBe(204)

    const restored = (await (await get('/api/v1/profiles/' + ownProfileId)).json()) as Detail
    expect(restored.profile.avatarUrl).toBe('/brand/humans/kieron-default.png')
    expect(restored.profile.hasUploadedImage).toBe(false)
  })

  it('does not let Kieron replace Abdul’s picture', async () => {
    const response = await app.request(
      '/api/v1/profiles/prf_abdul/image',
      {
        method: 'PUT',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ mime: 'image/png', data: PNG }),
      },
      env(db),
    )
    expect(response.status).toBe(403)
  })
})
