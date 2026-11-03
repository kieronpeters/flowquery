import type { D1Database } from '@cloudflare/workers-types'
import { describe, expect, it } from 'vitest'

import { app } from '../src/worker/app'
import type { BoardRow, ProfileRow, TaskRow } from '../src/worker/domain/types'

/**
 * Minimal D1 stand-in for routing tests.
 *
 * Routes now resolve a session before returning board data, so the fixture
 * includes a session and its user. It routes on the table name in the
 * statement; real SQL behaviour is verified against local D1 separately.
 */
type Fixture = {
  board: BoardRow | null
  tasks: TaskRow[]
  profiles: ProfileRow[]
  session?: Record<string, unknown> | null
  user?: Record<string, unknown> | null
}

type FakeStatement = {
  bind: (...args: unknown[]) => FakeStatement
  first: () => Promise<unknown>
  all: () => Promise<{ results: unknown[] }>
  run: () => Promise<{ success: boolean }>
}

function fakeDb(fixture: Fixture): D1Database {
  const db = {
    prepare(sql: string) {
      const source = sql.toLowerCase()
      const rows: unknown[] = source.includes('from boards')
        ? fixture.board
          ? [fixture.board]
          : []
        : source.includes('from sessions')
          ? fixture.session === undefined
            ? [session]
            : fixture.session
              ? [fixture.session]
              : []
          : source.includes('from users')
            ? fixture.user === undefined
              ? [user]
              : fixture.user
                ? [fixture.user]
                : []
            : source.includes('from tasks')
              ? fixture.tasks
              : source.includes('from team_profiles')
                ? fixture.profiles
                : []

      const statement: FakeStatement = {
        bind: () => statement,
        first: async () => rows[0] ?? null,
        all: async () => ({ results: rows }),
        run: async () => ({ success: true }),
      }

      return statement
    },
  }

  return db as unknown as D1Database
}

const now = 1793664000000

const board: BoardRow = {
  id: 'brd_test',
  name: 'Test Board',
  created_by: 'usr_test',
  created_at: now,
  updated_at: now,
}

const session = {
  id: 'ses_test',
  user_id: 'usr_test',
  token_hash: 'hash',
  created_at: now,
  expires_at: Date.now() + 86_400_000,
  last_seen_at: now,
}

const user = {
  id: 'usr_test',
  email: 'tester@example.com',
  display_name: 'Tester',
  created_at: now,
  last_login_at: now,
}

const profiles: ProfileRow[] = [
  {
    id: 'prf_alex',
    display_name: 'Alex',
    role_title: 'Senior Software Engineer',
    kind: 'ai',
    avatar_path: null,
    active: 1,
  },
]

const tasks: TaskRow[] = [
  {
    id: 'tsk_2',
    board_id: 'brd_test',
    title: 'Second',
    description: 'Later in the column',
    status: 'backlog',
    position: 1,
    priority: 'low',
    assignee_profile_id: null,
    due_date: null,
    version: 1,
    created_at: now + 2000,
    updated_at: now + 2000,
  },
  {
    id: 'tsk_1',
    board_id: 'brd_test',
    title: 'First',
    description: 'Earlier in the column',
    status: 'backlog',
    position: 0,
    priority: 'high',
    assignee_profile_id: 'prf_alex',
    due_date: '2026-11-20',
    version: 1,
    created_at: now + 1000,
    updated_at: now + 1000,
  },
]

const env = (fixture: Fixture) => ({ DB: fakeDb(fixture) }) as never
const withSession = { headers: { cookie: '__Host-fq_session=test-token' } }

describe('GET /api/v1/health', () => {
  it('reports ok as JSON without requiring a session', async () => {
    const response = await app.request('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')

    const body = (await response.json()) as { status: string; version: string }
    expect(body.status).toBe('ok')
    expect(body.version).toBe('0.0.0-m7')
  })
})

describe('GET /api/v1/columns', () => {
  it('returns the five fixed columns in order', async () => {
    const response = await app.request('/api/v1/columns')
    const body = (await response.json()) as { columns: { key: string; position: number }[] }

    expect(response.status).toBe(200)
    expect(body.columns.map((column) => column.key)).toEqual([
      'backlog',
      'todo',
      'in_progress',
      'review',
      'done',
    ])
    expect(body.columns.map((column) => column.position)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('GET /api/v1/boards/:boardId', () => {
  it('requires a session', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_test',
      undefined,
      env({ board, tasks, profiles, session: null, user: null }),
    )

    expect(response.status).toBe(401)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHENTICATED')
  })

  it('returns the board view with tasks ordered by position', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_test',
      withSession,
      env({ board, tasks, profiles }),
    )

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      board: { id: string; name: string; taskCount: number }
      columns: { key: string; taskCount: number; tasks: { id: string; assignee: unknown }[] }[]
    }

    expect(body.board.id).toBe('brd_test')
    expect(body.board.taskCount).toBe(2)

    const backlog = body.columns.find((column) => column.key === 'backlog')
    expect(backlog?.taskCount).toBe(2)
    expect(backlog?.tasks.map((task) => task.id)).toEqual(['tsk_1', 'tsk_2'])
    expect(backlog?.tasks[0]?.assignee).toEqual({
      id: 'prf_alex',
      displayName: 'Alex',
      roleTitle: 'Senior Software Engineer',
    })
  })

  it('returns 404 for an unknown board', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_missing',
      withSession,
      env({ board: null, tasks: [], profiles: [] }),
    )

    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('unknown API paths', () => {
  it('returns a JSON 404 rather than the SPA shell', async () => {
    const response = await app.request('/api/v1/does-not-exist')

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
