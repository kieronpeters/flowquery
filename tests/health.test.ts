import { describe, expect, it } from 'vitest'

import { app } from '../src/worker/app'

type HealthBody = {
  status: string
  service: string
  version: string
  time: string
}

describe('worker routing', () => {
  it('serves the health endpoint as JSON', async () => {
    const response = await app.request('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = (await response.json()) as HealthBody
    expect(body.status).toBe('ok')
    expect(body.service).toBe('flowquery')
    expect(body.version).toBe('0.0.0-m1')
    expect(Number.isNaN(Date.parse(body.time))).toBe(false)
  })

  it('returns a JSON 404 for unknown API paths, never the SPA shell', async () => {
    const response = await app.request('/api/v1/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = (await response.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBeTruthy()
  })
})
