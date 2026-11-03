import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { countRows, createSqliteD1 } from './helpers/sqlite-d1'

/** Task CRUD against the real schema, through the real session gate. */

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

type TaskBody = {
  task: {
    id: string
    title: string
    description: string
    status: string
    position: number
    priority: string
    assignee: { id: string } | null
    dueDate: string | null
    version: number
    descriptionTruncated: boolean
  }
}

describe('POST /api/v1/boards/:boardId/tasks', () => {
  it('creates a task with sensible defaults', async () => {
    const response = await call('POST', '/api/v1/boards/brd_demo/tasks', { title: 'A new task' })

    expect(response.status).toBe(201)
    const { task } = (await response.json()) as TaskBody

    expect(task.id).toMatch(/^tsk_/)
    expect(task.status).toBe('backlog')
    expect(task.priority).toBe('none')
    expect(task.assignee).toBeNull()
    expect(task.dueDate).toBeNull()
    expect(task.version).toBe(1)
    // The seeded board already has 3 backlog tasks, so this lands at position 3.
    expect(task.position).toBe(3)
  })

  it('creates directly into a chosen column', async () => {
    const response = await call('POST', '/api/v1/boards/brd_demo/tasks', {
      title: 'In review',
      status: 'review',
    })

    expect(response.status).toBe(201)
    const { task } = (await response.json()) as TaskBody
    expect(task.status).toBe('review')
    expect(task.position).toBe(1)
  })

  it('accepts every field', async () => {
    const response = await call('POST', '/api/v1/boards/brd_demo/tasks', {
      title: '  Fully specified  ',
      description: 'Details',
      priority: 'urgent',
      assigneeProfileId: 'prf_alex',
      dueDate: '2026-12-01',
      status: 'todo',
    })

    expect(response.status).toBe(201)
    const { task } = (await response.json()) as TaskBody

    expect(task.title).toBe('Fully specified')
    expect(task.priority).toBe('urgent')
    expect(task.assignee?.id).toBe('prf_alex')
    expect(task.dueDate).toBe('2026-12-01')
    expect(task.status).toBe('todo')
  })

  it('rejects invalid input with field-level errors', async () => {
    const cases: { body: Record<string, unknown>; field: string }[] = [
      { body: { title: '' }, field: 'title' },
      { body: { title: '   ' }, field: 'title' },
      { body: { title: 'x'.repeat(201) }, field: 'title' },
      { body: { title: 'ok', priority: 'critical' }, field: 'priority' },
      { body: { title: 'ok', status: 'archived' }, field: 'status' },
      { body: { title: 'ok', dueDate: '2026-02-30' }, field: 'dueDate' },
      { body: { title: 'ok', dueDate: '01/12/2026' }, field: 'dueDate' },
      { body: { title: 'ok', assigneeProfileId: 'prf_nobody' }, field: 'assigneeProfileId' },
      { body: { title: 'ok', description: 'x'.repeat(20_001) }, field: 'description' },
    ]

    for (const { body, field } of cases) {
      const response = await call('POST', '/api/v1/boards/brd_demo/tasks', body)
      expect(response.status).toBe(400)
      const payload = (await response.json()) as { error: { fields: Record<string, string> } }
      expect(payload.error.fields[field]).toBeTruthy()
    }
  })

  it('returns 404 for an unknown board', async () => {
    const response = await call('POST', '/api/v1/boards/brd_missing/tasks', { title: 'Nope' })
    expect(response.status).toBe(404)
  })

  it('requires a session', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo/tasks',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Anonymous' }),
      },
      env(db),
    )
    expect(response.status).toBe(401)
  })
})

describe('GET /api/v1/boards/:boardId/tasks/:taskId', () => {
  it('returns the full description, unlike the board view', async () => {
    const long = 'd'.repeat(900)
    const created = await call('POST', '/api/v1/boards/brd_demo/tasks', {
      title: 'Long description',
      description: long,
    })
    const { task } = (await created.json()) as TaskBody

    const single = await call('GET', `/api/v1/boards/brd_demo/tasks/${task.id}`)
    const full = (await single.json()) as TaskBody
    expect(full.task.description).toHaveLength(900)
    expect(full.task.descriptionTruncated).toBe(false)

    const board = await call('GET', '/api/v1/boards/brd_demo')
    const view = (await board.json()) as { columns: { tasks: TaskBody['task'][] }[] }
    const inView = view.columns
      .flatMap((column) => column.tasks)
      .find((item) => item.id === task.id)
    expect(inView?.description).toHaveLength(500)
    expect(inView?.descriptionTruncated).toBe(true)
  })

  it('does not leak a task from another board', async () => {
    const response = await call('GET', '/api/v1/boards/brd_demo/tasks/tsk_missing')
    expect(response.status).toBe(404)
  })
})

describe('PATCH /api/v1/boards/:boardId/tasks/:taskId', () => {
  it('updates fields and increments the version', async () => {
    const response = await call('PATCH', '/api/v1/boards/brd_demo/tasks/tsk_demo_01', {
      title: 'Updated title',
      priority: 'urgent',
      assigneeProfileId: 'prf_sarah',
      dueDate: '2026-12-24',
      description: 'Updated description',
    })

    expect(response.status).toBe(200)
    const { task } = (await response.json()) as TaskBody

    expect(task.title).toBe('Updated title')
    expect(task.priority).toBe('urgent')
    expect(task.assignee?.id).toBe('prf_sarah')
    expect(task.dueDate).toBe('2026-12-24')
    expect(task.version).toBe(2)
  })

  it('can clear the assignee and due date', async () => {
    const response = await call('PATCH', '/api/v1/boards/brd_demo/tasks/tsk_demo_01', {
      assigneeProfileId: null,
      dueDate: null,
    })

    expect(response.status).toBe(200)
    const { task } = (await response.json()) as TaskBody
    expect(task.assignee).toBeNull()
    expect(task.dueDate).toBeNull()
  })

  it('moves the task to the end of the target column when status changes', async () => {
    const response = await call('PATCH', '/api/v1/boards/brd_demo/tasks/tsk_demo_01', {
      status: 'done',
    })

    expect(response.status).toBe(200)
    const { task } = (await response.json()) as TaskBody
    expect(task.status).toBe('done')
    // The seeded 'done' column has two tasks, so the moved one lands at 2.
    expect(task.position).toBe(2)
  })

  it('rejects a stale expectedVersion with 409 and changes nothing', async () => {
    const response = await call('PATCH', '/api/v1/boards/brd_demo/tasks/tsk_demo_01', {
      title: 'Should not apply',
      expectedVersion: 99,
    })

    expect(response.status).toBe(409)

    const current = await call('GET', '/api/v1/boards/brd_demo/tasks/tsk_demo_01')
    const { task } = (await current.json()) as TaskBody
    expect(task.title).not.toBe('Should not apply')
    expect(task.version).toBe(1)
  })

  it('accepts a matching expectedVersion', async () => {
    const response = await call('PATCH', '/api/v1/boards/brd_demo/tasks/tsk_demo_01', {
      title: 'Applied',
      expectedVersion: 1,
    })
    expect(response.status).toBe(200)
  })

  it('returns 404 for an unknown task', async () => {
    const response = await call('PATCH', '/api/v1/boards/brd_demo/tasks/tsk_missing', {
      title: 'Nope',
    })
    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/v1/boards/:boardId/tasks/:taskId', () => {
  it('deletes the task and its comments', async () => {
    await db
      .prepare(
        'INSERT INTO comments (id, task_id, author_type, author_id, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind('cmt_x', 'tsk_demo_01', 'human', 'usr_dev_owner', 'Owner', 'note', Date.now())
      .run()

    expect(await countRows(db, 'comments')).toBe(1)

    const response = await call('DELETE', '/api/v1/boards/brd_demo/tasks/tsk_demo_01')
    expect(response.status).toBe(204)

    expect(await countRows(db, 'comments')).toBe(0)

    const current = await call('GET', '/api/v1/boards/brd_demo/tasks/tsk_demo_01')
    expect(current.status).toBe(404)
  })

  it('returns 404 for an unknown task', async () => {
    const response = await call('DELETE', '/api/v1/boards/brd_demo/tasks/tsk_missing')
    expect(response.status).toBe(404)
  })
})

describe('GET /api/v1/profiles', () => {
  it('lists assignable profiles for a signed-in human', async () => {
    const response = await call('GET', '/api/v1/profiles')

    expect(response.status).toBe(200)
    const body = (await response.json()) as { profiles: { id: string; kind: string }[] }
    // 17 seeded profiles (Abdul plus 16 agents) and the human created when the test signed in.
    expect(body.profiles).toHaveLength(18)
    expect(body.profiles.some((profile) => profile.kind === 'contractor')).toBe(true)

    // The signed-in human is assignable, and humans sort ahead of the AI
    // profiles so a person is never buried under a dozen specialists.
    expect(body.profiles[0]!.kind).toBe('human')
    expect(body.profiles.filter((profile) => profile.kind === 'human').length).toBeGreaterThan(0)
  })

  it('requires a session', async () => {
    const response = await app.request('/api/v1/profiles', undefined, env(db))
    expect(response.status).toBe(401)
  })
})
