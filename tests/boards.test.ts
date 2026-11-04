import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { countRows, createSqliteD1 } from './helpers/sqlite-d1'

/**
 * Board administration, tested against the real schema.
 *
 * These run the actual migration SQL on SQLite with foreign keys enabled, so
 * the delete cascade is exercised rather than assumed. A route-level fake could
 * not prove BOARD-005, which is the requirement that matters most here.
 */

const ALLOWLIST = parseAllowlist('12345:Kieron')

function env(db: D1Database): never {
  return { DB: db } as never
}

/** Creates a real user/identity/session row through the real code path. */
async function signIn(db: D1Database): Promise<string> {
  const result = await completeSignIn({
    store: createD1AuthStore(db),
    allowlist: ALLOWLIST,
    profile: {
      id: '12345',
      login: 'kieron',
      email: 'kieron@example.com',
      displayName: 'Kieron',
      avatarUrl: null,
    },
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

const json = (body: unknown) => ({
  method: 'POST',
  headers: { cookie, 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

describe('GET /api/v1/boards', () => {
  it('lists every board with its task count', async () => {
    const response = await app.request('/api/v1/boards', { headers: { cookie } }, env(db))

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      boards: { id: string; name: string; taskCount: number }[]
    }

    expect(body.boards).toHaveLength(1)
    expect(body.boards[0]?.id).toBe('brd_demo')
    expect(body.boards[0]?.name).toBe('FlowQuery Development')
    expect(body.boards[0]?.taskCount).toBe(9)
  })

  it('requires a session', async () => {
    const response = await app.request('/api/v1/boards', undefined, env(db))
    expect(response.status).toBe(401)
  })
})

describe('POST /api/v1/boards', () => {
  it('creates a board with a server-generated id', async () => {
    const response = await app.request(
      '/api/v1/boards',
      { ...json({ name: '  Website relaunch  ' }) },
      env(db),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      board: { id: string; name: string; taskCount: number }
    }

    expect(body.board.id).toMatch(/^brd_[0-9A-HJKMNP-TV-Z]+$/)
    expect(body.board.name).toBe('Website relaunch')
    expect(body.board.taskCount).toBe(0)

    const list = await app.request('/api/v1/boards', { headers: { cookie } }, env(db))
    const listed = (await list.json()) as { boards: { id: string }[] }
    expect(listed.boards.map((board) => board.id)).toContain(body.board.id)
  })

  it('rejects an empty or whitespace-only name', async () => {
    for (const name of ['', '   ', 42, null]) {
      const response = await app.request('/api/v1/boards', { ...json({ name }) }, env(db))
      expect(response.status).toBe(400)
      const body = (await response.json()) as { error: { code: string } }
      expect(body.error.code).toBe('VALIDATION_FAILED')
    }
  })

  it('rejects a name longer than 120 characters', async () => {
    const response = await app.request(
      '/api/v1/boards',
      { ...json({ name: 'x'.repeat(121) }) },
      env(db),
    )
    expect(response.status).toBe(400)
  })

  it('rejects a malformed body', async () => {
    const response = await app.request(
      '/api/v1/boards',
      {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: 'not json',
      },
      env(db),
    )
    expect(response.status).toBe(400)
  })
})

describe('PATCH /api/v1/boards/:boardId', () => {
  it('renames without changing the id or the tasks', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo',
      {
        method: 'PATCH',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed Board' }),
      },
      env(db),
    )

    expect(response.status).toBe(200)

    const view = await app.request('/api/v1/boards/brd_demo', { headers: { cookie } }, env(db))
    const body = (await view.json()) as { board: { id: string; name: string; taskCount: number } }

    expect(body.board.id).toBe('brd_demo')
    expect(body.board.name).toBe('Renamed Board')
    expect(body.board.taskCount).toBe(9)
  })

  it('returns 404 for an unknown board', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_missing',
      {
        method: 'PATCH',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Nope' }),
      },
      env(db),
    )
    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/v1/boards/:boardId', () => {
  it('refuses to delete when the typed name does not match', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo',
      {
        method: 'DELETE',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ confirmName: 'wrong name' }),
      },
      env(db),
    )

    expect(response.status).toBe(409)
    expect(await countRows(db, 'boards')).toBe(1)
    expect(await countRows(db, 'tasks')).toBe(9)
  })

  it('refuses to delete with no confirmation at all', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo',
      {
        method: 'DELETE',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({}),
      },
      env(db),
    )

    expect(response.status).toBe(409)
    expect(await countRows(db, 'boards')).toBe(1)
  })

  it('deletes the board and cascades to tasks, comments, activity and tokens', async () => {
    const now = Date.now()

    // Attach dependent rows so the cascade has something real to remove.
    await db
      .prepare(
        'INSERT INTO comments (id, task_id, author_type, author_id, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind('cmt_1', 'tsk_demo_01', 'human', 'usr_dev_owner', 'Owner', 'A comment', now)
      .run()

    await db
      .prepare(
        'INSERT INTO activity_events (id, board_id, task_id, actor_type, actor_id, actor_name, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        'act_1',
        'brd_demo',
        'tsk_demo_01',
        'human',
        'usr_dev_owner',
        'Owner',
        'commented',
        '{}',
        now,
      )
      .run()

    await db
      .prepare(
        'INSERT INTO agent_tokens (id, board_id, label, token_prefix, token_hash, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind('tok_1', 'brd_demo', 'Bob', 'fq_test', 'hash-1', 'usr_dev_owner', now)
      .run()

    expect(await countRows(db, 'comments')).toBe(1)
    expect(await countRows(db, 'activity_events')).toBe(1)
    expect(await countRows(db, 'agent_tokens')).toBe(1)

    const response = await app.request(
      '/api/v1/boards/brd_demo',
      {
        method: 'DELETE',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ confirmName: 'FlowQuery Development' }),
      },
      env(db),
    )

    expect(response.status).toBe(204)

    expect(await countRows(db, 'boards')).toBe(0)
    expect(await countRows(db, 'tasks')).toBe(0)
    expect(await countRows(db, 'comments')).toBe(0)
    expect(await countRows(db, 'activity_events')).toBe(0)
    expect(await countRows(db, 'agent_tokens')).toBe(0)

    // Unrelated data survives: 17 seeded profiles plus the human created when
    // signing in, and both users (the seeded development owner and that human).
    expect(await countRows(db, 'team_profiles')).toBe(18)
    expect(await countRows(db, 'users')).toBe(2)
  })

  it('returns 404 for an unknown board', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_missing',
      {
        method: 'DELETE',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ confirmName: 'anything' }),
      },
      env(db),
    )
    expect(response.status).toBe(404)
  })

  it('rejects a cross-origin delete', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo',
      {
        method: 'DELETE',
        headers: {
          cookie,
          'content-type': 'application/json',
          origin: 'https://evil.example',
        },
        body: JSON.stringify({ confirmName: 'FlowQuery Development' }),
      },
      env(db),
    )

    expect(response.status).toBe(403)
    expect(await countRows(db, 'boards')).toBe(1)
  })
})
