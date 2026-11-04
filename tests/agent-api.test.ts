import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { sha256Hex } from '../src/worker/lib/ids'
import { completeSignIn } from '../src/worker/services/auth'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * The agent door (AGT-006…012).
 *
 * Every test here exists to answer one question: can a token reach anything
 * outside its own board? The negative cases are the point.
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
let tokenA: string
let tokenB: string
let boardB: string

function human(method: string, path: string, body?: unknown) {
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

function agent(token: string, method: string, path: string, body?: unknown) {
  return app.request(
    `/api/v1/agent${path}`,
    {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env(db),
  )
}

beforeEach(async () => {
  db = createSqliteD1({ seed: true })
  cookie = await signIn(db)

  const created = await human('POST', '/api/v1/boards', { name: 'Second board' })
  boardB = ((await created.json()) as { board: { id: string } }).board.id

  const a = await human('POST', '/api/v1/boards/brd_demo/tokens', { profileId: 'prf_bob' })
  tokenA = ((await a.json()) as { token: string }).token

  const b = await human('POST', `/api/v1/boards/${boardB}/tokens`, { profileId: 'prf_bob' })
  tokenB = ((await b.json()) as { token: string }).token
})

describe('each token sees exactly one board', () => {
  it('returns its own board', async () => {
    const a = await agent(tokenA, 'GET', '/board')
    const b = await agent(tokenB, 'GET', '/board')

    expect(a.status).toBe(200)
    expect(b.status).toBe(200)

    const boardA = (await a.json()) as { board: { id: string; name: string; taskCount: number } }
    const boardBBody = (await b.json()) as {
      board: { id: string; name: string; taskCount: number }
    }

    expect(boardA.board.id).toBe('brd_demo')
    expect(boardA.board.taskCount).toBe(9)
    expect(boardBBody.board.id).toBe(boardB)
    expect(boardBBody.board.taskCount).toBe(0)
  })

  it('lists only its own tasks', async () => {
    const a = await agent(tokenA, 'GET', '/tasks')
    const b = await agent(tokenB, 'GET', '/tasks')

    const tasksA = (await a.json()) as { tasks: unknown[] }
    const tasksB = (await b.json()) as { tasks: unknown[] }

    expect(tasksA.tasks).toHaveLength(9)
    expect(tasksB.tasks).toHaveLength(0)
  })

  it('cannot read a task on another board, even with a valid id', async () => {
    const response = await agent(tokenB, 'GET', '/tasks/tsk_demo_01')
    expect(response.status).toBe(404)
  })

  it('cannot update a task on another board', async () => {
    const response = await agent(tokenB, 'PATCH', '/tasks/tsk_demo_01', { title: 'Hijacked' })
    expect(response.status).toBe(404)

    const check = await agent(tokenA, 'GET', '/tasks/tsk_demo_01')
    const task = (await check.json()) as { task: { title: string } }
    expect(task.task.title).toBe('Add GitHub OAuth sign-in')
  })

  it('cannot move a task on another board', async () => {
    const response = await agent(tokenB, 'POST', '/tasks/tsk_demo_01/move', {
      status: 'done',
      position: 0,
    })
    expect(response.status).toBe(404)
  })

  it('cannot delete a task on another board', async () => {
    const response = await agent(tokenB, 'DELETE', '/tasks/tsk_demo_01')
    expect(response.status).toBe(404)

    const check = await agent(tokenA, 'GET', '/tasks/tsk_demo_01')
    expect(check.status).toBe(200)
  })

  it('cannot read or write comments on another board', async () => {
    const read = await agent(tokenB, 'GET', '/tasks/tsk_demo_01/comments')
    expect(read.status).toBe(404)

    const write = await agent(tokenB, 'POST', '/tasks/tsk_demo_01/comments', { body: 'nope' })
    expect(write.status).toBe(404)
  })

  it('sees only its own activity', async () => {
    await agent(tokenA, 'POST', '/tasks', { title: 'Created by A' })

    const a = (await (await agent(tokenA, 'GET', '/activity')).json()) as {
      events: { eventType: string }[]
    }
    const b = (await (await agent(tokenB, 'GET', '/activity')).json()) as { events: unknown[] }

    expect(a.events.some((event) => event.eventType === 'task.created')).toBe(true)
    expect(b.events).toHaveLength(0)
  })
})

describe('bob can do the job', () => {
  it('creates a task on its board and attributes it to the agent behind the token', async () => {
    const response = await agent(tokenA, 'POST', '/tasks', {
      title: 'Refine the backlog',
      priority: 'high',
      status: 'todo',
    })

    expect(response.status).toBe(201)
    const { task } = (await response.json()) as { task: { id: string; status: string } }
    expect(task.status).toBe('todo')

    const board = (await (await agent(tokenA, 'GET', '/board')).json()) as {
      columns: { key: string; tasks: { title: string }[] }[]
    }
    const todo = board.columns.find((column) => column.key === 'todo')
    expect(todo?.tasks.map((item) => item.title)).toContain('Refine the backlog')

    const activity = (await (await agent(tokenA, 'GET', '/activity')).json()) as {
      events: { eventType: string; actorType: string; actorName: string }[]
    }
    const created = activity.events.find((event) => event.eventType === 'task.created')

    expect(created).toMatchObject({ actorType: 'agent', actorName: 'Bob' })
  })

  it('edits, moves and deletes its own tasks', async () => {
    const patched = await agent(tokenA, 'PATCH', '/tasks/tsk_demo_01', { priority: 'urgent' })
    expect(patched.status).toBe(200)

    const moved = await agent(tokenA, 'POST', '/tasks/tsk_demo_01/move', {
      status: 'review',
      position: 0,
    })
    expect(moved.status).toBe(200)

    const commented = await agent(tokenA, 'POST', '/tasks/tsk_demo_01/comments', {
      body: 'Moved this to review.',
    })
    expect(commented.status).toBe(201)

    const removed = await agent(tokenA, 'DELETE', '/tasks/tsk_demo_01')
    expect(removed.status).toBe(204)
  })

  it('filters tasks by status, priority and title', async () => {
    const byStatus = await agent(tokenA, 'GET', '/tasks?status=backlog')
    const byPriority = await agent(tokenA, 'GET', '/tasks?priority=high')
    const byTitle = await agent(tokenA, 'GET', '/tasks?q=isolation')

    const statusBody = (await byStatus.json()) as { tasks: { status: string }[] }
    const priorityBody = (await byPriority.json()) as { tasks: { priority: string }[] }
    const titleBody = (await byTitle.json()) as { tasks: { title: string }[] }

    expect(statusBody.tasks).toHaveLength(3)
    expect(statusBody.tasks.every((task) => task.status === 'backlog')).toBe(true)
    expect(priorityBody.tasks.every((task) => task.priority === 'high')).toBe(true)
    expect(titleBody.tasks.map((task) => task.title)).toEqual([
      'Write the board isolation test suite',
    ])
  })

  it('reports truncation so the agent knows to fetch detail', async () => {
    const list = (await (await agent(tokenA, 'GET', '/tasks')).json()) as {
      tasks: { description: string }[]
    }

    expect(list.tasks.every((task) => task.description.length <= 500)).toBe(true)
  })

  it('serves the fixed columns and assignable profiles', async () => {
    const columns = (await (await agent(tokenA, 'GET', '/columns')).json()) as {
      columns: { key: string }[]
    }
    const profiles = (await (await agent(tokenA, 'GET', '/profiles')).json()) as {
      profiles: unknown[]
    }

    expect(columns.columns.map((column) => column.key)).toEqual([
      'backlog',
      'todo',
      'in_progress',
      'review',
      'done',
    ])
    // 17 seeded profiles (Abdul plus 16 agents) and the human created when the test signed in.
    expect(profiles.profiles).toHaveLength(18)
  })
})

describe('the two doors do not overlap', () => {
  it('rejects a missing, malformed or unknown token', async () => {
    const missing = await app.request('/api/v1/agent/board', undefined, env(db))
    const malformed = await app.request(
      '/api/v1/agent/board',
      { headers: { authorization: 'Bearer not-a-token' } },
      env(db),
    )
    const unknown = await app.request(
      '/api/v1/agent/board',
      {
        headers: {
          authorization: 'Bearer fq_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        },
      },
      env(db),
    )

    expect(missing.status).toBe(401)
    expect(malformed.status).toBe(401)
    expect(unknown.status).toBe(401)
  })

  it('rejects a session cookie on the agent door', async () => {
    const response = await app.request('/api/v1/agent/board', { headers: { cookie } }, env(db))
    expect(response.status).toBe(401)
  })

  it('rejects a token on the human door', async () => {
    const response = await app.request(
      '/api/v1/boards',
      { headers: { authorization: `Bearer ${tokenA}` } },
      env(db),
    )
    expect(response.status).toBe(401)
  })

  it('cannot reach board administration', async () => {
    const rename = await app.request(
      '/api/v1/agent/boards/brd_demo',
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'x' }),
      },
      env(db),
    )

    expect(rename.status).toBe(404)
  })

  it('records when a token was last used', async () => {
    await agent(tokenA, 'GET', '/board')

    const rows = await db
      .prepare('SELECT last_used_at FROM agent_tokens WHERE token_hash = ?')
      .bind(await sha256Hex(tokenA))
      .all<{ last_used_at: number | null }>()

    expect(rows.results?.[0]?.last_used_at).toBeGreaterThan(0)
  })

  it('stops working after revocation', async () => {
    const list = (await (await human('GET', '/api/v1/boards/brd_demo/tokens')).json()) as {
      tokens: { id: string }[]
    }

    await human('DELETE', `/api/v1/boards/brd_demo/tokens/${list.tokens[0]?.id}`)

    const response = await agent(tokenA, 'GET', '/board')
    expect(response.status).toBe(401)
  })
})
