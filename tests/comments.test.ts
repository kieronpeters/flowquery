import type { D1Database } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'

import { parseAllowlist } from '../src/worker/auth/allowlist'
import { app } from '../src/worker/app'
import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { completeSignIn } from '../src/worker/services/auth'
import { createSqliteD1 } from './helpers/sqlite-d1'

/** Comments (COM-001…003) against the real schema. */

const ALLOWLIST = parseAllowlist('12345:Kieron')

function env(db: D1Database): never {
  return { DB: db } as never
}

async function signIn(db: D1Database): Promise<{ cookie: string; name: string }> {
  const result = await completeSignIn({
    store: createD1AuthStore(db),
    allowlist: ALLOWLIST,
    profile: { id: '12345', login: 'kieron', email: 'kieron@example.com', displayName: 'Kieron' },
    now: Date.now(),
  })
  return { cookie: `__Host-fq_session=${result.token}`, name: 'Kieron' }
}

let db: D1Database
let cookie: string

beforeEach(async () => {
  db = createSqliteD1({ seed: true })
  cookie = (await signIn(db)).cookie
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

type CommentBody = { comment: { id: string; authorName: string; body: string; createdAt: string } }

describe('POST /api/v1/boards/:boardId/tasks/:taskId/comments', () => {
  it('adds a comment attributed to the signed-in human', async () => {
    const response = await call('POST', '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments', {
      body: 'Started on this today.',
    })

    expect(response.status).toBe(201)
    const { comment } = (await response.json()) as CommentBody

    expect(comment.authorName).toBe('Kieron')
    expect(comment.body).toBe('Started on this today.')
    expect(Number.isNaN(Date.parse(comment.createdAt))).toBe(false)
  })

  it('stores markup as literal text, never as HTML', async () => {
    const payload = '<script>alert("x")</script>'
    const response = await call('POST', '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments', {
      body: payload,
    })

    expect(response.status).toBe(201)
    const { comment } = (await response.json()) as CommentBody
    expect(comment.body).toBe(payload)
  })

  it('rejects empty, whitespace and oversized comments', async () => {
    for (const body of ['', '    ', 'x'.repeat(10_001), 42, null]) {
      const response = await call('POST', '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments', {
        body,
      })
      expect(response.status).toBe(400)
    }
  })

  it('returns 404 for an unknown task', async () => {
    const response = await call('POST', '/api/v1/boards/brd_demo/tasks/tsk_missing/comments', {
      body: 'hello',
    })
    expect(response.status).toBe(404)
  })

  it('does not accept a comment through the wrong board', async () => {
    const response = await call('POST', '/api/v1/boards/brd_other/tasks/tsk_demo_01/comments', {
      body: 'hello',
    })
    expect(response.status).toBe(404)
  })

  it('requires a session', async () => {
    const response = await app.request(
      '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: 'anonymous' }),
      },
      env(db),
    )
    expect(response.status).toBe(401)
  })
})

describe('GET /api/v1/boards/:boardId/tasks/:taskId/comments', () => {
  it('lists comments oldest first', async () => {
    await call('POST', '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments', { body: 'first' })
    await call('POST', '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments', { body: 'second' })

    const response = await call('GET', '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments')
    expect(response.status).toBe(200)

    const body = (await response.json()) as { comments: { body: string }[] }
    expect(body.comments.map((comment) => comment.body)).toEqual(['first', 'second'])
  })

  it('returns 404 for an unknown task', async () => {
    const response = await call('GET', '/api/v1/boards/brd_demo/tasks/tsk_missing/comments')
    expect(response.status).toBe(404)
  })

  it('keeps comments scoped to their task', async () => {
    await call('POST', '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments', { body: 'on one' })
    await call('POST', '/api/v1/boards/brd_demo/tasks/tsk_demo_02/comments', { body: 'on two' })

    const first = (await (
      await call('GET', '/api/v1/boards/brd_demo/tasks/tsk_demo_01/comments')
    ).json()) as { comments: { body: string }[] }

    expect(first.comments.map((comment) => comment.body)).toEqual(['on one'])
  })
})
