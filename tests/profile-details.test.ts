import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * Profile pages: everyone may read, but only your own profile or an agent's may
 * be edited. The text is optional, and an emptied field is stored as NULL.
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

type Detail = {
  profile: {
    id: string
    displayName: string
    roleTitle: string
    kind: 'human' | 'ai' | 'contractor'
    about: string | null
    skills: string | null
    development: string | null
    canEdit: boolean
  }
}

let db: D1Database
let cookie: string
let ownProfileId: string

beforeEach(async () => {
  db = createSqliteD1({ seed: true })
  cookie = await signIn(db)

  const me = await app.request('/api/v1/auth/me', { headers: { cookie } }, env(db))
  ownProfileId = ((await me.json()) as { user: { profileId: string } }).user.profileId
})

function get(profileId: string, headers: Record<string, string> = { cookie }) {
  return app.request(`/api/v1/profiles/${profileId}`, { headers }, env(db))
}

function patchDetails(
  profileId: string,
  body: unknown,
  headers: Record<string, string> = { cookie },
) {
  return app.request(
    `/api/v1/profiles/${profileId}/details`,
    {
      method: 'PATCH',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    env(db),
  )
}

describe('GET /api/v1/profiles/:profileId', () => {
  it('returns your own profile with an edit marker', async () => {
    const response = await get(ownProfileId)
    expect(response.status).toBe(200)

    const { profile } = (await response.json()) as Detail
    expect(profile.id).toBe(ownProfileId)
    expect(profile.kind).toBe('human')
    expect(profile.canEdit).toBe(true)
    // Nothing is required beyond a name and a job title.
    expect(profile.about).toBeNull()
    expect(profile.skills).toBeNull()
    expect(profile.development).toBeNull()
  })

  it('lets you read another human’s page, without an edit button', async () => {
    const response = await get('prf_abdul')
    expect(response.status).toBe(200)

    const { profile } = (await response.json()) as Detail
    expect(profile.displayName).toBe('Abdul')
    expect(profile.canEdit).toBe(false)
  })

  it('lets you read and edit an agent', async () => {
    const { profile } = (await (await get('prf_bob')).json()) as Detail
    expect(profile.kind).toBe('ai')
    expect(profile.canEdit).toBe(true)
  })

  it('ships each agent with a purpose already written', async () => {
    const { profile } = (await (await get('prf_bob')).json()) as Detail
    expect(profile.about).toContain('Coordinates the specialist agents')
    expect(profile.skills).toBeTruthy()
    expect(profile.development).toBeTruthy()
  })

  it('returns 404 for an unknown id', async () => {
    expect((await get('prf_missing')).status).toBe(404)
  })

  it('requires a session', async () => {
    expect((await get('prf_bob', {})).status).toBe(401)
  })
})

describe('PATCH /api/v1/profiles/:profileId/details', () => {
  it('stores your own text and returns it on a re-read', async () => {
    const response = await patchDetails(ownProfileId, {
      roleTitle: '  Administrator  ',
      about: '  Keeps the boards tidy.  ',
      skills: 'TypeScript, SQL',
      development: 'Ship the profile pages',
    })
    expect(response.status).toBe(200)

    const { profile } = (await (await get(ownProfileId)).json()) as Detail
    expect(profile.roleTitle).toBe('Administrator')
    expect(profile.about).toBe('Keeps the boards tidy.')
    expect(profile.skills).toBe('TypeScript, SQL')
    expect(profile.development).toBe('Ship the profile pages')
  })

  it('normalises CRLF to LF so a textarea does not gain blank lines', async () => {
    await patchDetails(ownProfileId, { about: 'first\r\nsecond' })
    const { profile } = (await (await get(ownProfileId)).json()) as Detail
    expect(profile.about).toBe('first\nsecond')
  })

  it('stores an emptied field as NULL', async () => {
    await patchDetails(ownProfileId, { about: 'something' })
    await patchDetails(ownProfileId, { about: '   ' })

    const { profile } = (await (await get(ownProfileId)).json()) as Detail
    expect(profile.about).toBeNull()
  })

  it('leaves fields the caller did not mention alone', async () => {
    await patchDetails(ownProfileId, { about: 'about', skills: 'skills' })
    await patchDetails(ownProfileId, { skills: 'changed' })

    const { profile } = (await (await get(ownProfileId)).json()) as Detail
    expect(profile.about).toBe('about')
    expect(profile.skills).toBe('changed')
  })

  it('lets you edit an agent’s text', async () => {
    expect((await patchDetails('prf_bob', { about: 'Reads the backlog.' })).status).toBe(200)

    const { profile } = (await (await get('prf_bob')).json()) as Detail
    expect(profile.about).toBe('Reads the backlog.')
  })

  it('refuses to edit another human’s text', async () => {
    const response = await patchDetails('prf_abdul', { about: 'not mine' })
    expect(response.status).toBe(403)

    const { profile } = (await (await get('prf_abdul')).json()) as Detail
    expect(profile.about).toBeNull()
  })

  it('rejects an unknown field instead of ignoring it', async () => {
    expect((await patchDetails(ownProfileId, { nickname: 'K' })).status).toBe(400)
  })

  it('rejects text beyond the shared limit', async () => {
    expect((await patchDetails(ownProfileId, { about: 'a'.repeat(2001) })).status).toBe(400)
    expect((await patchDetails(ownProfileId, { skills: 'a'.repeat(1001) })).status).toBe(400)
  })

  it('refuses to empty the job title', async () => {
    expect((await patchDetails(ownProfileId, { roleTitle: '   ' })).status).toBe(400)
  })

  it('rejects control characters', async () => {
    expect((await patchDetails(ownProfileId, { about: 'a\u0007b' })).status).toBe(400)
  })

  it('requires a session', async () => {
    expect((await patchDetails(ownProfileId, { about: 'x' }, {})).status).toBe(401)
  })
})

describe('GET /api/v1/profiles', () => {
  it('marks the signed-in human and never marks an agent', async () => {
    const response = await app.request('/api/v1/profiles', { headers: { cookie } }, env(db))
    const body = (await response.json()) as {
      profiles: { id: string; kind: string; isSelf: boolean }[]
    }

    expect(body.profiles.find((profile) => profile.id === ownProfileId)?.isSelf).toBe(true)
    expect(body.profiles.find((profile) => profile.id === 'prf_abdul')?.isSelf).toBe(false)
    expect(body.profiles.find((profile) => profile.id === 'prf_bob')?.isSelf).toBe(false)
  })
})
