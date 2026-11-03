import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { app } from '../src/worker/app'
import { CSP } from '../src/worker/middleware/security'

/**
 * Hardening checks.
 *
 * The last test is the interesting one: the SPA document is served by the asset
 * layer, not the Worker, so its headers live in `public/_headers`. Two copies of
 * a security policy drift; this asserts they do not.
 */

describe('response headers', () => {
  it('sets the security headers on API responses', async () => {
    const response = await app.request('/api/v1/health')

    expect(response.headers.get('content-security-policy')).toBe(CSP)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin')
    expect(response.headers.get('permissions-policy')).toContain('geolocation=()')
  })

  it('forbids inline script and framing', () => {
    expect(CSP).toContain("script-src 'self'")
    expect(CSP).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(CSP).toContain("frame-ancestors 'none'")
    expect(CSP).toContain("object-src 'none'")
    expect(CSP).toContain("base-uri 'none'")
  })

  it('gives every response a request id', async () => {
    const first = await app.request('/api/v1/health')
    const second = await app.request('/api/v1/health')

    const a = first.headers.get('x-request-id')
    const b = second.headers.get('x-request-id')

    expect(a).toMatch(/^[0-9a-f-]{36}$/)
    expect(b).toMatch(/^[0-9a-f-]{36}$/)
    expect(a).not.toBe(b)
  })

  it('includes the request id in a not-found body', async () => {
    const response = await app.request('/api/v1/does-not-exist')
    const body = (await response.json()) as { error: { code: string; requestId?: string } }

    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('does not leak internals in error messages', async () => {
    const response = await app.request('/api/v1/does-not-exist')
    const serialised = JSON.stringify(await response.json())

    expect(serialised).not.toMatch(/sqlite|SQLITE|D1_|stack|at .*\.ts:/i)
  })
})

describe('static asset headers', () => {
  it('match the Worker policy exactly', () => {
    const file = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')

    const line = file
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.toLowerCase().startsWith('content-security-policy:'))

    expect(line).toBeTruthy()
    const value = line!.slice(line!.indexOf(':') + 1).trim()

    expect(value).toBe(CSP)
  })

  it('includes the other hardening headers for assets', () => {
    const file = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')

    expect(file).toMatch(/X-Content-Type-Options: nosniff/)
    expect(file).toMatch(/Referrer-Policy: no-referrer/)
    expect(file).toMatch(/X-Frame-Options: DENY/)
  })
})
