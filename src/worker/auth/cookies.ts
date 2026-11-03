/**
 * Cookie handling.
 *
 * `__Host-` prefix requires: Secure, Path=/, and no Domain attribute. Browsers
 * treat `http://localhost` as a trustworthy origin, so this works in local
 * development as well as in production (AUTH-003).
 */
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

export const SESSION_COOKIE = '__Host-fq_session'
export const OAUTH_COOKIE = '__Host-fq_oauth'

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60
const OAUTH_TTL_SECONDS = 10 * 60

const base = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'Lax',
} as const

export function readSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE)
}

export function writeSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, { ...base, maxAge: SESSION_TTL_SECONDS })
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true })
}

export type OAuthState = {
  state: string
  verifier: string
  redirectTo: string
}

export function readOAuthCookie(c: Context): OAuthState | null {
  const raw = getCookie(c, OAUTH_COOKIE)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<OAuthState>
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.verifier !== 'string' ||
      typeof parsed.redirectTo !== 'string'
    ) {
      return null
    }
    return { state: parsed.state, verifier: parsed.verifier, redirectTo: parsed.redirectTo }
  } catch {
    return null
  }
}

export function writeOAuthCookie(c: Context, value: OAuthState): void {
  setCookie(c, OAUTH_COOKIE, JSON.stringify(value), { ...base, maxAge: OAUTH_TTL_SECONDS })
}

export function clearOAuthCookie(c: Context): void {
  deleteCookie(c, OAUTH_COOKIE, { path: '/', secure: true })
}

/**
 * Only allow relative, single-slash paths as post-login destinations, so the
 * parameter cannot be used as an open redirect.
 */
export function safeRedirectTarget(value: string | undefined): string {
  if (!value) return '/boards'
  if (!value.startsWith('/')) return '/boards'
  if (value.startsWith('//')) return '/boards'
  if (value.includes('\\')) return '/boards'
  return value
}
