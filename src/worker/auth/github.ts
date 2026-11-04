/**
 * GitHub OAuth client (AUTH-01).
 *
 * Deliberately small: three HTTP calls, no SDK. The numeric `id` returned by
 * `/user` is the identity key (DEC-031); `login` and `email` are display data.
 */
import { base64Url } from '../lib/ids'

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'
const USER_URL = 'https://api.github.com/user'
const EMAILS_URL = 'https://api.github.com/user/emails'

export type GithubProfile = {
  /** Immutable numeric id, as a string. Never the login or the email. */
  id: string
  login: string
  email: string
  displayName: string
  /** GitHub-hosted picture. Allowed by the CSP's img-src, nothing else is. */
  avatarUrl?: string | null
}

export class GithubError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GithubError'
    this.code = code
  }
}

export type Pkce = { verifier: string; challenge: string }

export async function createPkce(): Promise<Pkce> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const verifier = base64Url(bytes)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: base64Url(new Uint8Array(digest)) }
}

export function buildAuthorizeUrl(input: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
}): string {
  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('client_id', input.clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('scope', 'read:user user:email')
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', input.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

async function exchangeCode(input: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
  verifier: string
}): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.verifier,
    }),
  })

  if (!response.ok) {
    throw new GithubError(
      'TOKEN_EXCHANGE_FAILED',
      `GitHub token exchange returned ${response.status}`,
    )
  }

  const body = (await response.json()) as { access_token?: string; error?: string }
  if (!body.access_token) {
    throw new GithubError('TOKEN_EXCHANGE_FAILED', body.error ?? 'No access token returned')
  }

  return body.access_token
}

async function githubGet<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'flowquery',
    },
  })

  if (!response.ok) {
    throw new GithubError('PROFILE_FETCH_FAILED', `GitHub returned ${response.status}`)
  }

  return (await response.json()) as T
}

/**
 * Exchanges the callback code for a profile.
 *
 * Fails closed: a token without a verified email, or a numeric id that is not a
 * plain integer, is rejected rather than guessed at.
 */
export async function completeGithubSignIn(input: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
  verifier: string
}): Promise<GithubProfile> {
  const accessToken = await exchangeCode(input)

  const user = await githubGet<{
    id: number
    login: string
    name: string | null
    avatar_url?: string
  }>(USER_URL, accessToken)
  const emails = await githubGet<{ email: string; primary: boolean; verified: boolean }[]>(
    EMAILS_URL,
    accessToken,
  )

  if (!Number.isInteger(user.id) || user.id <= 0) {
    throw new GithubError('INVALID_IDENTITY', 'GitHub returned a non-numeric user id')
  }

  const primary = emails.find((entry) => entry.primary && entry.verified)
  const anyVerified = emails.find((entry) => entry.verified)
  const chosen = primary ?? anyVerified

  if (!chosen) {
    throw new GithubError('EMAIL_NOT_VERIFIED', 'No verified email address on the GitHub account')
  }

  return {
    id: String(user.id),
    login: user.login,
    email: chosen.email,
    displayName: user.name?.trim() || user.login,
    avatarUrl:
      typeof user.avatar_url === 'string' && user.avatar_url !== '' ? user.avatar_url : null,
  }
}
