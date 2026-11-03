import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { app } from '../src/worker/app'
import { CSP } from '../src/worker/middleware/security'

/**
 * Hardening checks.
 *
 * The last group matters more than it looks: the SPA document is served by the
 * asset layer, not the Worker, so its headers live in `public/_headers`. That
 * file has its own syntax — a URL pattern line followed by indented headers —
 * and a file that is structurally wrong applies to nothing while still looking
 * correct. These tests check the structure, not just the strings.
 */

const headersFile = (): string =>
  readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')

const meaningfulLines = (): string[] =>
  headersFile()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.trim().startsWith('#'))

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
  it('starts every rule block with a URL pattern', () => {
    const first = meaningfulLines()[0]

    expect(first).toBe('/*')
  })

  it('indents every header line under its pattern', () => {
    const lines = meaningfulLines()
    const headerLines = lines.filter((line) => line.includes(':') && !line.startsWith('/'))

    expect(headerLines.length).toBeGreaterThanOrEqual(6)
    for (const line of headerLines) {
      expect(line.startsWith(' ') || line.startsWith('\t')).toBe(true)
    }
  })

  it('uses # for comments, since /* would be read as a URL pattern', () => {
    expect(headersFile()).not.toContain('*/')
  })

  it('carries the same policy as the Worker', () => {
    const line = meaningfulLines().find((entry) =>
      entry.trim().toLowerCase().startsWith('content-security-policy:'),
    )

    expect(line).toBeTruthy()
    expect(line!.trim().slice('content-security-policy:'.length).trim()).toBe(CSP)
  })

  it('includes the other hardening headers', () => {
    const file = headersFile()

    expect(file).toMatch(/X-Content-Type-Options: nosniff/)
    expect(file).toMatch(/Referrer-Policy: no-referrer/)
    expect(file).toMatch(/X-Frame-Options: DENY/)
  })
})
