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

describe('activity filters', () => {
  const base = 1_800_000_000_000
  const bob: Actor = { id: 'tok_bob', name: 'Bob', type: 'agent' }

  /** Two events, 30 minutes apart, from two different actors. */
  async function seedTwoActors() {
    await createTask(db, {
      boardId: BOARD,
      body: { title: 'Owner work' },
      actor,
      now: base,
    })
    await createTask(db, {
      boardId: BOARD,
      body: { title: 'Agent work' },
      actor: bob,
      now: base + 30 * 60 * 1000,
    })
  }

  async function page(input: Parameters<typeof readActivity>[1]) {
    const result = await readActivity(db, input)
    if (result.kind !== 'ok') throw new Error(`expected ok, got ${result.kind}`)
    return result.page
  }

  it('lists the board people with their event counts', async () => {
    await seedTwoActors()

    const result = await page({ boardId: BOARD, limit: 50 })

    const counts = new Map(result.actors.map((actor) => [actor.name, actor.count]))

    // Bob is an agent profile, so his events are counted against it.
    expect(counts.get('Bob')).toBe(1)

    // Everyone assignable appears, even with nothing to their name yet: a
    // filter list that hides people until they act is not a filter list.
    expect(counts.get('Abdul')).toBe(0)
    expect(result.actors.length).toBeGreaterThan(15)

    // Whoever acted most recently sorts first; people with no events sort last.
    expect(result.actors[0]!.name).toBe('Bob')
  })

  it('filters to one actor', async () => {
    await seedTwoActors()

    const result = await page({ boardId: BOARD, limit: 50, actors: ['Bob'] })

    expect(result.events).toHaveLength(1)
    expect(result.events[0]!.actorName).toBe('Bob')
  })

  it('filters to several actors', async () => {
    await seedTwoActors()

    const result = await page({ boardId: BOARD, limit: 50, actors: ['Bob', 'Owner'] })

    expect(result.events.map((event) => event.actorName).sort()).toEqual(['Bob', 'Owner'])
  })

  it('ignores a filter that matches nobody instead of returning everything', async () => {
    await seedTwoActors()

    const result = await page({ boardId: BOARD, limit: 50, actors: ['Nobody'] })

    expect(result.events).toEqual([])
    expect(result.nextBefore).toBeNull()
  })

  it('keeps the whole roster when the filter narrows the events', async () => {
    await seedTwoActors()

    const result = await page({ boardId: BOARD, limit: 50, actors: ['Bob'] })
    const names = result.actors.map((actor) => actor.name)

    // The filter narrows events, not the list of people you can filter by.
    expect(names).toContain('Bob')
    expect(names).toContain('Abdul')
  })

  it('filters by a starting instant, inclusively', async () => {
    await seedTwoActors()

    const result = await page({ boardId: BOARD, limit: 50, since: base + 30 * 60 * 1000 })

    expect(result.events).toHaveLength(1)
    expect(result.events[0]!.actorName).toBe('Bob')
  })

  it('combines the period and the people filters', async () => {
    await seedTwoActors()

    const narrowed = await page({ boardId: BOARD, limit: 50, since: base, actors: ['Owner'] })
    expect(narrowed.events.map((event) => event.actorName)).toEqual(['Owner'])

    const excluded = await page({
      boardId: BOARD,
      limit: 50,
      since: base + 1,
      actors: ['Owner'],
    })
    expect(excluded.events).toEqual([])
  })

  it('still pages newest first when filtered', async () => {
    const early = 1_700_000_000_000

    for (let index = 0; index < 3; index += 1) {
      await createTask(db, {
        boardId: BOARD,
        body: { title: `Task ${index}` },
        actor: bob,
        now: early + index * 1_000,
      })
    }

    const result = await page({ boardId: BOARD, limit: 50, actors: ['Bob'] })

    expect(result.events.map((event) => event.payload.title)).toEqual([
      'Task 2',
      'Task 1',
      'Task 0',
    ])
  })

  it('accepts a comma-separated list over HTTP and returns the roster', async () => {
    await seedTwoActors()

    const response = await call(
      'GET',
      `/api/v1/boards/${BOARD}/activity?actors=Owner&since=${base}`,
    )
    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      events: { actorName: string }[]
      actors: { name: string; count: number }[]
    }

    expect(body.events.map((event) => event.actorName)).toEqual(['Owner'])
    expect(body.actors.length).toBeGreaterThan(15)
    expect(body.actors.some((actor) => actor.name === 'Bob')).toBe(true)
  })

  it('treats an empty actors parameter as no filter', async () => {
    await seedTwoActors()

    const response = await call('GET', `/api/v1/boards/${BOARD}/activity?actors=`)
    expect(response.status).toBe(200)

    const body = (await response.json()) as { events: unknown[] }
    expect(body.events).toHaveLength(2)
  })

  it('rejects a since that is not a millisecond timestamp', async () => {
    for (const value of ['yesterday', '-1', '1.5', '']) {
      const query = value === '' ? 'since=' : `since=${encodeURIComponent(value)}`
      const response = await call('GET', `/api/v1/boards/${BOARD}/activity?${query}`)

      // An empty value means "not set"; anything else must be a whole number.
      expect(response.status).toBe(value === '' ? 200 : 400)
    }
  })

  it('rejects an unreasonable actor list', async () => {
    const tooMany = Array.from({ length: 21 }, (_, index) => `Actor${index}`).join(',')
    expect((await call('GET', `/api/v1/boards/${BOARD}/activity?actors=${tooMany}`)).status).toBe(
      400,
    )

    const tooLong = 'a'.repeat(81)
    expect((await call('GET', `/api/v1/boards/${BOARD}/activity?actors=${tooLong}`)).status).toBe(
      400,
    )
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
