import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { PRESETS, cardBackground, contrastRatio, inkFor, luminance, mix } from '../src/app/theme'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * Per-board appearance.
 *
 * The interesting cases are the rejections: a colour field that accepts
 * arbitrary strings becomes a way to make the browser request a third-party
 * URL, and an unknown key that is silently stored becomes a mystery later.
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

let db: D1Database
let cookie: string

beforeEach(async () => {
  db = createSqliteD1({ seed: true })
  cookie = await signIn(db)
})

function put(body: unknown, boardId = 'brd_demo') {
  return app.request(
    `/api/v1/boards/${boardId}/theme`,
    {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    env(db),
  )
}

describe('PUT /api/v1/boards/:boardId/theme', () => {
  it('stores colours and returns them with the board', async () => {
    const response = await put({
      background: '#101820',
      columns: { backlog: '#1F2A44', done: '#123524' },
      tickets: '#1E2433',
      activity: '#1A1F2B',
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as { theme: Record<string, unknown> }
    expect(body.theme).toEqual({
      background: '#101820',
      columns: { backlog: '#1f2a44', done: '#123524' },
      tickets: '#1e2433',
      activity: '#1a1f2b',
    })

    const board = await app.request('/api/v1/boards/brd_demo', { headers: { cookie } }, env(db))
    const view = (await board.json()) as {
      theme: { background?: string; tickets?: string; activity?: string }
    }
    expect(view.theme.background).toBe('#101820')
    expect(view.theme.tickets).toBe('#1e2433')
    expect(view.theme.activity).toBe('#1a1f2b')
  })

  it('accepts a ticket colour on its own', async () => {
    const response = await put({ tickets: '#F4EFE6' })

    expect(response.status).toBe(200)
    const body = (await response.json()) as { theme: Record<string, unknown> }
    expect(body.theme).toEqual({ tickets: '#f4efe6' })
  })

  it('normalises upper case to lower case', async () => {
    const response = await put({ background: '#AABBCC' })
    const body = (await response.json()) as { theme: { background: string } }
    expect(body.theme.background).toBe('#aabbcc')
  })

  it('clears everything with an empty object', async () => {
    await put({ background: '#101820', columns: { backlog: '#1f2a44' } })

    const response = await put({})
    expect(response.status).toBe(200)

    const body = (await response.json()) as { theme: Record<string, unknown> }
    expect(body.theme).toEqual({})

    const board = await app.request('/api/v1/boards/brd_demo', { headers: { cookie } }, env(db))
    const view = (await board.json()) as { theme: Record<string, unknown> }
    expect(view.theme).toEqual({})
  })

  it('rejects anything that is not a six-digit hex colour', async () => {
    const bad = [
      { background: 'red' },
      { background: '#fff' },
      { background: '#12345' },
      { background: 'url(https://example.com/x.png)' },
      { background: '#12345g' },
      { columns: { backlog: 'rgb(1,2,3)' } },
      { tickets: 'red' },
      { tickets: '#1234' },
      { tickets: '#12345z' },
      { activity: 'dark' },
      { activity: '#fff' },
    ]

    for (const body of bad) {
      const response = await put(body)
      expect(response.status).toBe(400)
    }
  })

  it('rejects unknown keys and unknown columns', async () => {
    expect((await put({ sidebar: '#101820' })).status).toBe(400)
    expect((await put({ columns: { archived: '#101820' } })).status).toBe(400)
  })

  it('returns 404 for an unknown board', async () => {
    const response = await put({ background: '#101820' }, 'brd_missing')
    expect(response.status).toBe(404)
  })

  it('requires a session', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo/theme',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ background: '#101820' }),
      },
      env(db),
    )
    expect(response.status).toBe(401)
  })

  it('lets a human set colours but not an agent token', async () => {
    const created = await app.request(
      '/api/v1/boards/brd_demo/tokens',
      {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ label: 'Bob' }),
      },
      env(db),
    )
    const token = ((await created.json()) as { token: string }).token

    const response = await app.request(
      '/api/v1/agent/boards/brd_demo/theme',
      {
        method: 'PUT',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ background: '#101820' }),
      },
      env(db),
    )

    // Board appearance is administration; the agent namespace has no such route.
    expect(response.status).toBe(404)
  })
})

describe('theme survives a malformed stored document', () => {
  it('falls back to defaults instead of failing the board read', async () => {
    await db.prepare("UPDATE boards SET theme = 'not json' WHERE id = ?").bind('brd_demo').run()

    const board = await app.request('/api/v1/boards/brd_demo', { headers: { cookie } }, env(db))
    expect(board.status).toBe(200)

    const view = (await board.json()) as { theme: Record<string, unknown> }
    expect(view.theme).toEqual({})
  })
})

describe('colour presets', () => {
  it('every preset is a six-digit hex colour with a unique name', () => {
    const names = new Set<string>()

    for (const preset of PRESETS) {
      expect(preset.value).toMatch(/^#[0-9a-f]{6}$/)
      expect(names.has(preset.name)).toBe(false)
      names.add(preset.name)
    }
  })

  it('covers the whole spectrum rather than a cluster of one hue', () => {
    const names = PRESETS.map((preset) => preset.name)

    for (const hue of ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet']) {
      expect(names).toContain(hue)
    }
  })

  it('keeps a single pale neutral so the hues are not crowded out', () => {
    const pale = PRESETS.filter((preset) => luminance(preset.value) > 0.7)

    expect(pale).toHaveLength(1)
    expect(pale[0]!.name).toBe('Paper')
  })

  it('every preset keeps ticket text at AA contrast or better', () => {
    for (const preset of PRESETS) {
      expect(contrastRatio(preset.value, inkFor(preset.value))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('every preset keeps card text readable when used as a column or page colour', () => {
    for (const preset of PRESETS) {
      const card = cardBackground(preset.value)
      expect(contrastRatio(card, inkFor(card))).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('readable ink', () => {
  it('picks light text on dark colours and dark text on light ones', () => {
    expect(inkFor('#0b1020')).toBe('#e6e9f2')
    expect(inkFor('#ffffff')).toBe('#0b1020')
    expect(inkFor('#f2c46d')).toBe('#0b1020')
    expect(inkFor('#123524')).toBe('#e6e9f2')
  })

  it('reports luminance in the expected order', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 2)
    expect(luminance('#ffffff')).toBeCloseTo(1, 2)
    expect(luminance('#808080')).toBeGreaterThan(0.2)
    expect(luminance('#808080')).toBeLessThan(0.3)
  })
})

describe('card tint', () => {
  it('blends two colours without leaving the hex format', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('lifts a dark column only slightly', () => {
    const card = cardBackground('#141a2e')
    expect(card).not.toBe('#141a2e')
    expect(luminance(card)).toBeGreaterThan(luminance('#141a2e'))
    expect(luminance(card)).toBeLessThan(0.35)
  })

  it('lifts a light column close to white so cards still separate', () => {
    const card = cardBackground('#dff2e4')
    expect(luminance(card)).toBeGreaterThan(0.85)
  })

  it('always produces readable card text', () => {
    for (const column of ['#0b1020', '#f4efe6', '#123c3a', '#dce9f7', '#4a1f2a']) {
      const card = cardBackground(column)
      const ink = inkFor(card)
      expect(ink).toBe(luminance(card) > 0.45 ? '#0b1020' : '#e6e9f2')
    }
  })
})
