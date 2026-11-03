import { Hono } from 'hono'

import { parseAllowlist } from '../auth/allowlist'
import {
  clearOAuthCookie,
  clearSessionCookie,
  readOAuthCookie,
  readSessionCookie,
  safeRedirectTarget,
  writeOAuthCookie,
  writeSessionCookie,
} from '../auth/cookies'
import { buildAuthorizeUrl, completeGithubSignIn, createPkce, GithubError } from '../auth/github'
import type { Bindings } from '../env'
import { randomToken } from '../lib/ids'
import { createD1AuthStore } from '../repositories/auth-store'
import { completeSignIn, NotAllowedError, resolveSession, signOut } from '../services/auth'

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

const CALLBACK_PATH = '/api/v1/auth/callback'

function clientKey(c: { req: { header: (name: string) => string | undefined } }): string {
  return `auth:${c.req.header('cf-connecting-ip') ?? 'local'}`
}

export const authRoutes = new Hono<{ Bindings: Bindings }>()

/** Begins sign-in. Sets a short-lived state cookie and redirects to GitHub. */
authRoutes.get('/auth/start', async (c) => {
  const now = Date.now()
  const store = createD1AuthStore(c.env.DB)
  const key = clientKey(c)

  if ((await store.countAttempts(key, now - RATE_WINDOW_MS)) >= RATE_LIMIT) {
    return c.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a minute.' } },
      429,
    )
  }
  await store.recordAttempt(key, now)

  const clientId = c.env.GITHUB_CLIENT_ID
  const clientSecret = c.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return c.json(
      {
        error: {
          code: 'AUTH_NOT_CONFIGURED',
          message: 'GitHub OAuth is not configured on this deployment.',
        },
      },
      503,
    )
  }

  const pkce = await createPkce()
  const state = randomToken(24)
  const redirectTo = safeRedirectTarget(c.req.query('next'))

  writeOAuthCookie(c, { state, verifier: pkce.verifier, redirectTo })

  return c.redirect(
    buildAuthorizeUrl({
      clientId,
      redirectUri: new URL(CALLBACK_PATH, c.req.url).toString(),
      state,
      codeChallenge: pkce.challenge,
    }),
  )
})

/** Provider callback. Verifies state, exchanges the code, checks the allowlist. */
authRoutes.get('/auth/callback', async (c) => {
  const now = Date.now()
  const store = createD1AuthStore(c.env.DB)

  const cookie = readOAuthCookie(c)
  clearOAuthCookie(c)

  const loginFailed = (reason: string) => c.redirect(`/login?error=${reason}`)

  if (c.req.query('error')) return loginFailed('denied')

  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code || !state) return loginFailed('state')
  if (!cookie || cookie.state !== state) return loginFailed('state')

  const clientId = c.env.GITHUB_CLIENT_ID
  const clientSecret = c.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) return loginFailed('configuration')

  try {
    await store.recordAttempt(clientKey(c), now)

    const profile = await completeGithubSignIn({
      clientId,
      clientSecret,
      code,
      redirectUri: new URL(CALLBACK_PATH, c.req.url).toString(),
      verifier: cookie.verifier,
    })

    const result = await completeSignIn({
      store,
      allowlist: parseAllowlist(c.env.AUTH_ALLOWLIST),
      profile,
      now,
    })

    writeSessionCookie(c, result.token)
    return c.redirect(cookie.redirectTo)
  } catch (error) {
    if (error instanceof NotAllowedError) return loginFailed('not_allowed')
    if (error instanceof GithubError) return loginFailed('provider')

    console.error('Sign-in failed', error instanceof Error ? error.name : 'unknown')
    return loginFailed('unknown')
  }
})

/** Current identity, or 401. */
authRoutes.get('/auth/me', async (c) => {
  const store = createD1AuthStore(c.env.DB)
  const user = await resolveSession({ store, token: readSessionCookie(c) })

  if (!user) {
    return c.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } }, 401)
  }

  return c.json({
    user: { id: user.id, displayName: user.displayName, email: user.email },
  })
})

/** Destroys the server-side session, not just the cookie. */
authRoutes.post('/auth/logout', async (c) => {
  const store = createD1AuthStore(c.env.DB)
  await signOut({ store, token: readSessionCookie(c) })
  clearSessionCookie(c)
  return c.body(null, 204)
})
