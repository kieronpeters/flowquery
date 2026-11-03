import type { Hono } from 'hono'

import type { AppEnv } from '../env'
import { addComment, readComments } from '../services/comments'
import type { Actor } from '../services/tasks'

/** Comments, registered onto the board router so they inherit the session gate. */
export function registerCommentRoutes(router: Hono<AppEnv>): void {
  const actorOf = (c: { get: (key: 'user') => { id: string; displayName: string } }): Actor => {
    const user = c.get('user')
    return { id: user.id, name: user.displayName, type: 'human' }
  }

  router.get('/:boardId/tasks/:taskId/comments', async (c) => {
    const comments = await readComments(c.env.DB, {
      boardId: c.req.param('boardId'),
      taskId: c.req.param('taskId'),
    })

    if (!comments) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } }, 404)
    }

    return c.json({ comments })
  })

  router.post('/:boardId/tasks/:taskId/comments', async (c) => {
    let body: Record<string, unknown>
    try {
      const parsed = (await c.req.json()) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return c.json(
          { error: { code: 'VALIDATION_FAILED', message: 'Expected a JSON object.' } },
          400,
        )
      }
      body = parsed as Record<string, unknown>
    } catch {
      return c.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Expected a JSON object.' } },
        400,
      )
    }

    const result = await addComment(c.env.DB, {
      boardId: c.req.param('boardId'),
      taskId: c.req.param('taskId'),
      body: body.body,
      actor: actorOf(c),
    })

    if (result.kind === 'not_found') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } }, 404)
    }

    if (result.kind === 'invalid') {
      return c.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: result.message,
            fields: { body: result.message },
          },
        },
        400,
      )
    }

    return c.json({ comment: result.comment }, 201)
  })
}
