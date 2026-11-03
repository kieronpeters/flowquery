import type { MiddlewareHandler } from 'hono'

/**
 * Security headers.
 *
 * Two places are needed, and it is easy to miss the second:
 *  1. this middleware covers API responses (which do invoke the Worker);
 *  2. `public/_headers` covers the static SPA document and assets, which the
 *     asset layer serves without ever invoking the Worker.
 *
 * The policy is deliberately strict: no inline script, no framing, no
 * third-party origins, no form posts anywhere but here.
 */

export const CSP = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self'",
].join('; ')

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next()

  const headers = c.res.headers
  headers.set('Content-Security-Policy', CSP)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Ignored over plain HTTP; browsers honour it once the app is behind TLS.
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}
