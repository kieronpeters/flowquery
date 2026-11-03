import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { isContiguous, positionsFor } from '../src/shared/ordering'
import { createSqliteD1 } from './helpers/sqlite-d1'

/** Moving tasks, against the real schema. */

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

function move(taskId: string, body: unknown, boardId = 'brd_demo') {
  return app.request(
    `/api/v1/boards/${boardId}/tasks/${taskId}/move`,
    {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    env(db),
  )
}

async function columnOrder(boardId: string, status: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT id, position FROM tasks WHERE board_id = ? AND status = ? ORDER BY position')
    .bind(boardId, status)
    .all<{ id: string; position: number }>()

  return (results ?? []).map((row) => row.id)
}

async function assertContiguous(boardId: string): Promise<void> {
  const { results } = await db
    .prepare('SELECT id, position FROM tasks WHERE board_id = ? AND status = ? ORDER BY position')
    .bind(boardId, 'backlog')
    .all<{ id: string; position: number }>()

  expect(isContiguous(positionsFor((results ?? []).map((row) => row.id)))).toBe(true)
}

describe('POST /api/v1/boards/:boardId/tasks/:taskId/move', () => {
  it('reorders within a column', async () => {
    // Seeded backlog: 01 (0), 02 (1), 03 (2).
    const response = await move('tsk_demo_01', { status: 'backlog', position: 2 })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      board: { columns: { key: string; tasks: { id: string }[] }[] }
    }

    expect(await columnOrder('brd_demo', 'backlog')).toEqual([
      'tsk_demo_02',
      'tsk_demo_03',
      'tsk_demo_01',
    ])

    const backlog = body.board.columns.find((column) => column.key === 'backlog')
    expect(backlog?.tasks.map((task) => task.id)).toEqual([
      'tsk_demo_02',
      'tsk_demo_03',
      'tsk_demo_01',
    ])
  })

  it('moves a task to another column at a given index', async () => {
    const response = await move('tsk_demo_01', { status: 'review', position: 0 })

    expect(response.status).toBe(200)
    expect(await columnOrder('brd_demo', 'review')).toEqual(['tsk_demo_01', 'tsk_demo_07'])
    expect(await columnOrder('brd_demo', 'backlog')).toEqual(['tsk_demo_02', 'tsk_demo_03'])
  })

  it('appends when the index is beyond the end of the target column', async () => {
    const response = await move('tsk_demo_01', { status: 'done', position: 99 })

    expect(response.status).toBe(200)
    const done = await columnOrder('brd_demo', 'done')
    expect(done[done.length - 1]).toBe('tsk_demo_01')
  })

  it('keeps positions contiguous and unique after a sequence of moves', async () => {
    const sequence: [string, string, number][] = [
      ['tsk_demo_01', 'backlog', 2],
      ['tsk_demo_02', 'review', 1],
      ['tsk_demo_03', 'done', 0],
      ['tsk_demo_01', 'done', 1],
      ['tsk_demo_02', 'backlog', 0],
      ['tsk_demo_01', 'backlog', 0],
    ]

    for (const [taskId, status, position] of sequence) {
      const response = await move(taskId, { status, position })
      expect(response.status).toBe(200)
      await assertContiguous('brd_demo')
    }

    // Every column still holds the same number of tasks in total.
    const { results } = await db
      .prepare('SELECT COUNT(*) AS total FROM tasks WHERE board_id = ?')
      .bind('brd_demo')
      .all<{ total: number }>()
    expect(results?.[0]?.total).toBe(9)
  })

  it('rejects a stale expectedVersion without moving anything', async () => {
    const before = await columnOrder('brd_demo', 'backlog')

    const response = await move('tsk_demo_01', {
      status: 'review',
      position: 0,
      expectedVersion: 99,
    })

    expect(response.status).toBe(409)
    expect(await columnOrder('brd_demo', 'backlog')).toEqual(before)
    expect(await columnOrder('brd_demo', 'review')).toEqual(['tsk_demo_07'])
  })

  it('accepts a matching expectedVersion', async () => {
    const response = await move('tsk_demo_01', {
      status: 'review',
      position: 0,
      expectedVersion: 1,
    })
    expect(response.status).toBe(200)
  })

  it('validates status and position', async () => {
    for (const body of [
      { status: 'archived', position: 0 },
      { status: 'backlog', position: -1 },
      { status: 'backlog', position: 1.5 },
      { status: 'backlog' },
    ]) {
      const response = await move('tsk_demo_01', body)
      expect(response.status).toBe(400)
    }
  })

  it('returns 404 for an unknown task', async () => {
    const response = await move('tsk_missing', { status: 'done', position: 0 })
    expect(response.status).toBe(404)
  })

  it('does not move a task through the wrong board', async () => {
    const response = await move('tsk_demo_01', { status: 'done', position: 0 }, 'brd_other')
    expect(response.status).toBe(404)
    expect(await columnOrder('brd_demo', 'backlog')).toEqual([
      'tsk_demo_01',
      'tsk_demo_02',
      'tsk_demo_03',
    ])
  })

  it('requires a session', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo/tasks/tsk_demo_01/move',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'done', position: 0 }),
      },
      env(db),
    )
    expect(response.status).toBe(401)
  })
})
