import type { Hono } from 'hono'

import type { AppEnv } from '../env'
import { createTask, editTask, moveTask, readTask, removeTask, type Actor } from '../services/tasks'

/**
 * Task routes, registered onto the board router so they inherit its session
 * middleware. Board scope always comes from the path and is re-checked in SQL.
 */
export function registerTaskRoutes(router: Hono<AppEnv>): void {
  const actorOf = (c: { get: (key: 'user') => { id: string; displayName: string } }): Actor => {
    const user = c.get('user')
    return { id: user.id, name: user.displayName, type: 'human' }
  }

  /** TASK-006: a task can be created directly into any column. */
  router.post('/:boardId/tasks', async (c) => {
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

    const result = await createTask(c.env.DB, {
      boardId: c.req.param('boardId'),
      body,
      actor: actorOf(c),
    })

    if (result.kind === 'board_not_found') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)
    }

    if (result.kind === 'invalid') {
      return c.json(
        {
          error: { code: 'VALIDATION_FAILED', message: 'Check the fields.', fields: result.fields },
        },
        400,
      )
    }

    return c.json({ task: result.task }, 201)
  })

  /** Full task detail, including the complete description (never truncated). */
  router.get('/:boardId/tasks/:taskId', async (c) => {
    const task = await readTask(c.env.DB, {
      boardId: c.req.param('boardId'),
      taskId: c.req.param('taskId'),
    })

    if (!task) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } }, 404)
    }

    return c.json({ task })
  })

  router.patch('/:boardId/tasks/:taskId', async (c) => {
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

    const result = await editTask(c.env.DB, {
      boardId: c.req.param('boardId'),
      taskId: c.req.param('taskId'),
      body,
    })

    if (result.kind === 'not_found') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } }, 404)
    }

    if (result.kind === 'invalid') {
      return c.json(
        {
          error: { code: 'VALIDATION_FAILED', message: 'Check the fields.', fields: result.fields },
        },
        400,
      )
    }

    if (result.kind === 'conflict') {
      return c.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'This task changed since you loaded it. Refresh and try again.',
          },
        },
        409,
      )
    }

    return c.json({ task: result.task })
  })

  /**
   * TASK-007/009: move a task to a column and index.
   * Returns the whole board so the client replaces its state with one
   * authoritative ordering instead of merging two views.
   */
  router.post('/:boardId/tasks/:taskId/move', async (c) => {
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

    const result = await moveTask(c.env.DB, {
      boardId: c.req.param('boardId'),
      taskId: c.req.param('taskId'),
      body,
    })

    if (result.kind === 'not_found') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } }, 404)
    }

    if (result.kind === 'invalid') {
      return c.json(
        {
          error: { code: 'VALIDATION_FAILED', message: 'Check the fields.', fields: result.fields },
        },
        400,
      )
    }

    if (result.kind === 'conflict') {
      return c.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'This task changed since you loaded it. Refresh and try again.',
          },
        },
        409,
      )
    }

    return c.json({ board: result.board, task: result.task })
  })

  /** TASK-010: deletion is permanent. The UI asks for confirmation first. */
  router.delete('/:boardId/tasks/:taskId', async (c) => {
    const removed = await removeTask(c.env.DB, {
      boardId: c.req.param('boardId'),
      taskId: c.req.param('taskId'),
    })

    if (!removed) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } }, 404)
    }

    return c.body(null, 204)
  })
}
