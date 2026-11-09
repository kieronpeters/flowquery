import { Hono } from 'hono'

import { avatarUrlFor } from '../../shared/avatars'
import { humanDefaultAvatarFor } from '../../shared/human-default-avatars'
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
import { createD1AuthStore, getGithubSubjectForUser } from '../repositories/auth-store'
import { findHumanProfileId } from '../repositories/boards'
import { getAvatarVersion } from '../repositories/profile-avatars'
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
    // This endpoint is reached by a browser navigation, so returning JSON here
    // would show the user a wall of text with no way back. Send them to the
    // sign-in page, which explains what is missing.
    return c.redirect('/login?error=configuration')
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

  // The callback is the expensive half: check the limit before contacting
  // GitHub, not after.
  const key = clientKey(c)
  if ((await store.countAttempts(key, now - RATE_WINDOW_MS)) >= RATE_LIMIT) {
    return loginFailed('rate_limited')
  }

  try {
    await store.recordAttempt(key, now)

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

  // The profile is what carries an uploaded picture; `users.avatar_url` only
  // ever holds the GitHub one. An upload therefore wins, and GitHub is the
  // fallback rather than the other way round.
  const profileId = await findHumanProfileId(c.env.DB, {
    userId: user.id,
    displayName: user.displayName,
  })
  const uploaded = profileId
    ? avatarUrlFor(profileId, await getAvatarVersion(c.env.DB, profileId))
    : null

  // The supplied human defaults are keyed by the immutable GitHub id. This is
  // what the header shows for Kieron and Abdul until they upload a picture.
  const githubId = await getGithubSubjectForUser(c.env.DB, user.id)
  const defaultAvatar = humanDefaultAvatarFor({ githubId, profileId })

  return c.json({
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      profileId,
      avatarUrl: uploaded ?? defaultAvatar ?? user.avatarUrl,
      // So the menu can offer "Remove picture" only when there is an uploaded
      // one to remove, rather than for the default or GitHub avatar it cannot touch.
      hasUploadedImage: uploaded !== null,
    },
  })
})

/** Destroys the server-side session, not just the cookie. */
authRoutes.post('/auth/logout', async (c) => {
  const store = createD1AuthStore(c.env.DB)
  await signOut({ store, token: readSessionCookie(c) })
  clearSessionCookie(c)
  return c.body(null, 204)
})
