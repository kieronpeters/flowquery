import { afterEach, describe, expect, it, vi } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import type { Bindings } from '../src/worker/env'
import { sha256Hex } from '../src/worker/lib/ids'
import {
  completeSignIn,
  resolveSession,
  signOut,
  SESSION_TTL_MS,
} from '../src/worker/services/auth'
import { createFakeAuthD1, createMemoryAuthStore } from './helpers/auth-fakes'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWLIST = '12345:Kieron,67890:Friend'

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function stubGithub(overrides: { id?: number; name?: string | null; email?: string } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/login/oauth/access_token')) return json({ access_token: 'gho_test_token' })
      if (url.endsWith('/user/emails')) {
        return json([
          {
            email: overrides.email ?? 'kieron@example.com',
            primary: true,
            verified: true,
          },
        ])
      }
      if (url.endsWith('/user')) {
        return json({
          id: overrides.id ?? 12345,
          login: 'kieron',
          name: overrides.name === undefined ? 'Kieron P' : overrides.name,
        })
      }

      throw new Error(`Unexpected fetch in test: ${url}`)
    }),
  )
}

function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()
  const single = response.headers.get('set-cookie')
  return single ? [single] : []
}

function cookiePair(cookies: string[], name: string): string | null {
  const match = cookies.find((header) => header.startsWith(`${name}=`))
  return match ? match.split(';')[0]! : null
}

function routeEnv(db: unknown, overrides: Partial<Bindings> = {}): never {
  return {
    DB: db,
    GITHUB_CLIENT_ID: 'test-client',
    GITHUB_CLIENT_SECRET: 'test-secret',
    AUTH_ALLOWLIST: ALLOWLIST,
    ...overrides,
  } as never
}

async function beginSignIn(db: unknown, envOverrides: Partial<Bindings> = {}) {
  const response = await app.request(
    '/api/v1/auth/start?next=/boards',
    undefined,
    routeEnv(db, envOverrides),
  )
  const cookies = setCookies(response)
  const location = response.headers.get('location')
  const state = location ? new URL(location).searchParams.get('state') : null
  return { response, cookies, state, oauthCookie: cookiePair(cookies, '__Host-fq_oauth') }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// AUTH-001 — allowlist parsing
// ---------------------------------------------------------------------------

describe('allowlist', () => {
  it('parses numeric ids with optional display names', () => {
    const list = parseAllowlist('583231:Kieron, 1234567 : Friend ,99')
    expect(list.get('583231')).toBe('Kieron')
    expect(list.get('1234567')).toBe('Friend')
    expect(list.get('99')).toBeNull()
    expect(list.size).toBe(3)
  })

  it('ignores malformed entries rather than guessing', () => {
    const list = parseAllowlist('not-an-id,12345,abc:Name,--1:Name,:NoId')
    expect(list.size).toBe(1)
    expect(list.has('12345')).toBe(true)
  })

  it('fails closed when empty or undefined', () => {
    expect(parseAllowlist('').size).toBe(0)
    expect(parseAllowlist(undefined).size).toBe(0)
    expect(parseAllowlist('   ').size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// AUTH-001/004/005/006 — sign-in service behaviour
// ---------------------------------------------------------------------------

describe('sign-in service', () => {
  const profile = {
    id: '12345',
    login: 'kieron',
    email: 'kieron@example.com',
    displayName: 'Kieron P',
  }

  it('creates a user, an identity and a session for an allowlisted account', async () => {
    const store = createMemoryAuthStore()
    const result = await completeSignIn({
      store,
      allowlist: parseAllowlist(ALLOWLIST),
      profile,
      now: 1_000,
    })

    expect(store.users.size).toBe(1)
    expect(store.identities.size).toBe(1)
    expect(store.sessions.size).toBe(1)

    const user = [...store.users.values()][0]!
    expect(user.displayName).toBe('Kieron')
    expect(user.email).toBe('kieron@example.com')
    expect(result.user.id).toBe(user.id)
  })

  it('stores only a hash of the session token', async () => {
    const store = createMemoryAuthStore()
    const result = await completeSignIn({
      store,
      allowlist: parseAllowlist(ALLOWLIST),
      profile,
      now: 1_000,
    })

    const session = [...store.sessions.values()][0]!
    expect(session.tokenHash).not.toBe(result.token)
    expect(session.tokenHash).toBe(await sha256Hex(result.token))
    expect(session.tokenHash).toHaveLength(64)
  })

  it('rejects an account that is not on the allowlist without creating anything', async () => {
    const store = createMemoryAuthStore()
    await expect(
      completeSignIn({
        store,
        allowlist: parseAllowlist('999999:SomebodyElse'),
        profile,
        now: 1_000,
      }),
    ).rejects.toThrow(/private/i)

    expect(store.users.size).toBe(0)
    expect(store.identities.size).toBe(0)
    expect(store.sessions.size).toBe(0)
  })

  it('reuses the same user on a second sign-in', async () => {
    const store = createMemoryAuthStore()
    const allowlist = parseAllowlist(ALLOWLIST)

    await completeSignIn({ store, allowlist, profile, now: 1_000 })
    await completeSignIn({ store, allowlist, profile, now: 2_000 })

    expect(store.users.size).toBe(1)
    expect(store.sessions.size).toBe(2)
  })

  it('resolves a session and slides the expiry forward', async () => {
    const store = createMemoryAuthStore()
    const { token } = await completeSignIn({
      store,
      allowlist: parseAllowlist(ALLOWLIST),
      profile,
      now: 1_000,
    })

    const user = await resolveSession({ store, token, now: 5_000 })
    expect(user?.displayName).toBe('Kieron')

    const session = [...store.sessions.values()][0]!
    expect(session.expiresAt).toBe(5_000 + SESSION_TTL_MS)
  })

  it('rejects and deletes an expired session', async () => {
    const store = createMemoryAuthStore()
    const { token } = await completeSignIn({
      store,
      allowlist: parseAllowlist(ALLOWLIST),
      profile,
      now: 1_000,
    })

    const user = await resolveSession({ store, token, now: 1_000 + SESSION_TTL_MS + 1 })
    expect(user).toBeNull()
    expect(store.sessions.size).toBe(0)
  })

  it('rejects an unknown token', async () => {
    const store = createMemoryAuthStore()
    expect(await resolveSession({ store, token: 'nope', now: 1_000 })).toBeNull()
    expect(await resolveSession({ store, token: undefined, now: 1_000 })).toBeNull()
  })

  it('deletes the session on sign-out', async () => {
    const store = createMemoryAuthStore()
    const { token } = await completeSignIn({
      store,
      allowlist: parseAllowlist(ALLOWLIST),
      profile,
      now: 1_000,
    })

    await signOut({ store, token })
    expect(store.sessions.size).toBe(0)
    expect(await resolveSession({ store, token, now: 2_000 })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AUTH-003/007 — HTTP routes
// ---------------------------------------------------------------------------

describe('GET /api/v1/auth/start', () => {
  it('redirects to GitHub with PKCE and a hardened state cookie', async () => {
    const { db } = createFakeAuthD1()
    const { response, cookies, state, oauthCookie } = await beginSignIn(db)

    expect(response.status).toBe(302)

    const location = new URL(response.headers.get('location')!)
    expect(`${location.origin}${location.pathname}`).toBe(
      'https://github.com/login/oauth/authorize',
    )
    expect(location.searchParams.get('client_id')).toBe('test-client')
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.get('code_challenge')).toBeTruthy()
    expect(state).toBeTruthy()
    expect(location.searchParams.get('state')).toBe(state)

    expect(oauthCookie).toBeTruthy()

    const raw = cookies.find((header) => header.startsWith('__Host-fq_oauth='))!
    expect(raw).toMatch(/HttpOnly/i)
    expect(raw).toMatch(/Secure/i)
    expect(raw).toMatch(/SameSite=Lax/i)
    expect(raw).toMatch(/Path=\//)
  })

  it('sends the browser to the sign-in page when OAuth is not configured', async () => {
    const { db } = createFakeAuthD1()
    const response = await app.request(
      '/api/v1/auth/start',
      undefined,
      routeEnv(db, { GITHUB_CLIENT_ID: undefined, GITHUB_CLIENT_SECRET: undefined }),
    )

    // A redirect, not JSON: this endpoint is reached by clicking a link.
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/login?error=configuration')
  })
})

describe('GET /api/v1/auth/callback', () => {
  it('signs in an allowlisted account and sets a session cookie', async () => {
    stubGithub()
    const { db, users, sessions } = createFakeAuthD1()
    const { state, oauthCookie } = await beginSignIn(db)

    const response = await app.request(
      `/api/v1/auth/callback?code=abc&state=${state}`,
      { headers: { cookie: oauthCookie! } },
      routeEnv(db),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/boards')

    const sessionCookie = cookiePair(setCookies(response), '__Host-fq_session')
    expect(sessionCookie).toBeTruthy()

    // AUTH-003: the session cookie itself must be hardened, not just the state cookie.
    const rawSession = setCookies(response).find((header) =>
      header.startsWith('__Host-fq_session='),
    )!
    expect(rawSession).toMatch(/HttpOnly/i)
    expect(rawSession).toMatch(/Secure/i)
    expect(rawSession).toMatch(/SameSite=Lax/i)
    expect(rawSession).toMatch(/Path=\//)

    // The session row stores a hash, not the token itself.
    const token = sessionCookie!.split('=')[1]!
    const row = [...sessions.values()][0]!
    expect(row.token_hash).toBe(await sha256Hex(token))
    expect(row.token_hash).not.toBe(token)

    expect(users.size).toBe(1)
    const user = [...users.values()][0]!
    expect(user.email).toBe('kieron@example.com')
    expect(user.display_name).toBe('Kieron')
  })

  it('refuses an account that is not on the allowlist', async () => {
    stubGithub({ id: 55555 })
    const { db, users, sessions } = createFakeAuthD1()
    const { state, oauthCookie } = await beginSignIn(db)

    const response = await app.request(
      `/api/v1/auth/callback?code=abc&state=${state}`,
      { headers: { cookie: oauthCookie! } },
      routeEnv(db),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/login?error=not_allowed')
    expect(cookiePair(setCookies(response), '__Host-fq_session')).toBeNull()
    expect(users.size).toBe(0)
    expect(sessions.size).toBe(0)
  })

  it('rejects a mismatched state without contacting GitHub', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { db } = createFakeAuthD1()
    const { oauthCookie } = await beginSignIn(db)

    const response = await app.request(
      '/api/v1/auth/callback?code=abc&state=tampered',
      { headers: { cookie: oauthCookie! } },
      routeEnv(db),
    )

    expect(response.headers.get('location')).toBe('/login?error=state')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects a callback with no state cookie', async () => {
    const { db } = createFakeAuthD1()
    const response = await app.request(
      '/api/v1/auth/callback?code=abc&state=anything',
      undefined,
      routeEnv(db),
    )

    expect(response.headers.get('location')).toBe('/login?error=state')
  })
})

describe('session endpoints', () => {
  async function signIn(): Promise<{ db: ReturnType<typeof createFakeAuthD1>; cookie: string }> {
    stubGithub()
    const fake = createFakeAuthD1()
    const { state, oauthCookie } = await beginSignIn(fake.db)

    const response = await app.request(
      `/api/v1/auth/callback?code=abc&state=${state}`,
      { headers: { cookie: oauthCookie! } },
      routeEnv(fake.db),
    )

    return { db: fake, cookie: cookiePair(setCookies(response), '__Host-fq_session')! }
  }

  it('returns the current identity for a valid session', async () => {
    const { db, cookie } = await signIn()

    const response = await app.request('/api/v1/auth/me', { headers: { cookie } }, routeEnv(db.db))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { user: { displayName: string } }
    expect(body.user.displayName).toBe('Kieron')
  })

  it('returns 401 without a session', async () => {
    const { db } = createFakeAuthD1()
    const response = await app.request('/api/v1/auth/me', undefined, routeEnv(db))
    expect(response.status).toBe(401)
  })

  it('signs out and invalidates the session server-side', async () => {
    const { db, cookie } = await signIn()

    const logout = await app.request(
      '/api/v1/auth/logout',
      { method: 'POST', headers: { cookie } },
      routeEnv(db.db),
    )

    expect(logout.status).toBe(204)
    expect(db.sessions.size).toBe(0)

    const me = await app.request('/api/v1/auth/me', { headers: { cookie } }, routeEnv(db.db))
    expect(me.status).toBe(401)
  })

  it('rejects a cross-origin POST (AUTH-007)', async () => {
    const { db, cookie } = await signIn()

    const response = await app.request(
      '/api/v1/auth/logout',
      { method: 'POST', headers: { cookie, origin: 'https://evil.example' } },
      routeEnv(db.db),
    )

    expect(response.status).toBe(403)
    expect(db.sessions.size).toBe(1)
  })
})
