import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { addComment } from '../src/worker/services/comments'
import { completeSignIn } from '../src/worker/services/auth'
import { readActivity } from '../src/worker/services/activity'
import { createTask, editTask, removeTask, type Actor } from '../src/worker/services/tasks'
import { createSqliteD1 } from './helpers/sqlite-d1'

/** Activity history (ACT-001…004). */

const ALLOWLIST = parseAllowlist('12345:Kieron')
const actor: Actor = { id: 'usr_dev_owner', name: 'Owner', type: 'human' }
const BOARD = 'brd_demo'

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

function call(method: string, path: string, body?: unknown) {
  return app.request(
    path,
    {
      method,
      headers: { cookie, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env(db),
  )
}

type Events = {
  events: { eventType: string; payload: Record<string, unknown>; actorName: string }[]
}

async function feed(query = ''): Promise<Events> {
  const response = await call('GET', `/api/v1/boards/${BOARD}/activity${query}`)
  expect(response.status).toBe(200)
  return (await response.json()) as Events
}

describe('activity is recorded for each kind of change', () => {
  it('records creation', async () => {
    await call('POST', `/api/v1/boards/${BOARD}/tasks`, { title: 'New work', status: 'todo' })

    const events = await feed()
    const created = events.events.find((event) => event.eventType === 'task.created')

    expect(created).toBeTruthy()
    expect(created?.payload).toMatchObject({ title: 'New work', status: 'todo' })
    expect(created?.actorName).toBe('Kieron')
  })

  it('records a priority change with before and after', async () => {
    await call('PATCH', `/api/v1/boards/${BOARD}/tasks/tsk_demo_01`, { priority: 'urgent' })

    const events = await feed()
    const changed = events.events.find((event) => event.eventType === 'task.priority_changed')

    expect(changed?.payload).toEqual({ from: 'high', to: 'urgent' })
  })

  it('records a description edit without storing the text', async () => {
    await call('PATCH', `/api/v1/boards/${BOARD}/tasks/tsk_demo_01`, {
      description: 'A much longer description than before',
    })

    const events = await feed()
    const changed = events.events.find((event) => event.eventType === 'task.description_changed')

    expect(changed).toBeTruthy()
    expect(JSON.stringify(changed?.payload)).not.toContain('much longer')
  })

  it('records a column move exactly once', async () => {
    await call('POST', `/api/v1/boards/${BOARD}/tasks/tsk_demo_01/move`, {
      status: 'review',
      position: 0,
    })

    const events = await feed()
    const moves = events.events.filter((event) => event.eventType === 'task.moved')

    expect(moves).toHaveLength(1)
    expect(moves[0]?.payload).toEqual({ from: 'backlog', to: 'review' })
  })

  it('does not record a reorder within the same column', async () => {
    const before = (await feed()).events.length

    await call('POST', `/api/v1/boards/${BOARD}/tasks/tsk_demo_01/move`, {
      status: 'backlog',
      position: 2,
    })

    expect((await feed()).events.length).toBe(before)
  })

  it('records a comment, and a deletion that survives the task', async () => {
    await call('POST', `/api/v1/boards/${BOARD}/tasks/tsk_demo_01/comments`, { body: 'note' })

    const withComment = await feed()
    expect(withComment.events.map((event) => event.eventType)).toContain('comment.added')

    await call('DELETE', `/api/v1/boards/${BOARD}/tasks/tsk_demo_01`)

    const events = await feed()
    const deleted = events.events.find((event) => event.eventType === 'task.deleted')

    // The task's own events cascade with it, but the deletion itself is kept so
    // the board remembers the task existed.
    expect(deleted?.payload).toMatchObject({ title: 'Add GitHub OAuth sign-in' })
    expect(events.events.map((event) => event.eventType)).not.toContain('comment.added')
  })
})

describe('activity feed', () => {
  it('is newest first and paginates by cursor', async () => {
    const base = 1_800_000_000_000

    await createTask(db, {
      boardId: BOARD,
      body: { title: 'First' },
      actor,
      now: base,
    })
    await editTask(db, {
      boardId: BOARD,
      taskId: 'tsk_demo_01',
      body: { priority: 'low' },
      actor,
      now: base + 1_000,
    })
    await addComment(db, {
      boardId: BOARD,
      taskId: 'tsk_demo_01',
      body: 'third',
      actor,
      now: base + 2_000,
    })

    const page = await readActivity(db, { boardId: BOARD, limit: 50 })
    expect(page.kind).toBe('ok')
    if (page.kind !== 'ok') return

    expect(page.page.events.map((event) => event.eventType)).toEqual([
      'comment.added',
      'task.priority_changed',
      'task.created',
    ])

    const firstPage = await readActivity(db, { boardId: BOARD, limit: 2 })
    if (firstPage.kind !== 'ok') return

    expect(firstPage.page.events).toHaveLength(2)
    expect(firstPage.page.nextBefore).toBe(base + 1_000)

    const secondPage = await readActivity(db, {
      boardId: BOARD,
      limit: 2,
      before: firstPage.page.nextBefore ?? undefined,
    })
    if (secondPage.kind !== 'ok') return

    expect(secondPage.page.events.map((event) => event.eventType)).toEqual(['task.created'])
    expect(secondPage.page.nextBefore).toBeNull()
  })

  it('does not leak another board activity', async () => {
    await createTask(db, {
      boardId: 'brd_other',
      body: { title: 'elsewhere' },
      actor,
      now: 1_800_000_000_000,
    }).catch(() => null)

    const events = await feed()
    expect(events.events.every((event) => event.eventType !== 'task.created')).toBe(true)
  })

  it('returns 404 for an unknown board', async () => {
    const response = await call('GET', '/api/v1/boards/brd_missing/activity')
    expect(response.status).toBe(404)
  })

  it('rejects an invalid limit', async () => {
    const response = await call('GET', `/api/v1/boards/${BOARD}/activity?limit=500`)
    expect(response.status).toBe(400)
  })

  it('requires a session', async () => {
    const response = await app.request(`/api/v1/boards/${BOARD}/activity`, undefined, env(db))
    expect(response.status).toBe(401)
  })
})

describe('deleting a task keeps its history', () => {
  it('removes task-scoped events but keeps the deletion event', async () => {
    await addComment(db, {
      boardId: BOARD,
      taskId: 'tsk_demo_01',
      body: 'a comment',
      actor,
      now: 1_800_000_000_000,
    })

    await removeTask(db, {
      boardId: BOARD,
      taskId: 'tsk_demo_01',
      actor,
      now: 1_800_000_001_000,
    })

    const scoped = await db
      .prepare('SELECT COUNT(*) AS total FROM activity_events WHERE board_id = ? AND task_id = ?')
      .bind(BOARD, 'tsk_demo_01')
      .all<{ total: number }>()

    const deletion = await db
      .prepare(
        "SELECT COUNT(*) AS total FROM activity_events WHERE board_id = ? AND event_type = 'task.deleted' AND task_id IS NULL",
      )
      .bind(BOARD)
      .all<{ total: number }>()

    expect(scoped.results?.[0]?.total).toBe(0)
    expect(deletion.results?.[0]?.total).toBe(1)
  })
})
