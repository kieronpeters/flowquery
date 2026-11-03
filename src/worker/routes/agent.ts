import { Hono } from 'hono'

import { COLUMNS } from '../../shared/columns'
import type { AppEnv } from '../env'
import { readJsonObject } from '../lib/request'
import { requireAgentToken } from '../middleware/agent-auth'
import { listActiveProfiles } from '../repositories/boards'
import { readActivity } from '../services/activity'
import { loadBoardView } from '../services/board-view'
import { addComment, readComments } from '../services/comments'
import {
  createTask,
  editTask,
  listTasks,
  moveTask,
  readTask,
  removeTask,
  type Actor,
} from '../services/tasks'

/**
 * The agent door (M7).
 *
 * Every route derives its board from the token. No path segment, body field or
 * query parameter can name a board here — that is the whole isolation story,
 * and it is structural rather than a check someone has to remember.
 */
export const agentRoutes = new Hono<AppEnv>()

agentRoutes.use('*', requireAgentToken)

const boardOf = (c: { get: (key: 'agent') => { boardId: string } }): string =>
  c.get('agent').boardId

const actorOf = (c: { get: (key: 'agent') => { tokenId: string; label: string } }): Actor => {
  const agent = c.get('agent')
  return { id: agent.tokenId, name: agent.label, type: 'agent' }
}

const notFound = (c: { json: (body: unknown, status: 404) => Response }, what = 'Task') =>
  c.json({ error: { code: 'NOT_FOUND', message: `${what} not found.` } }, 404)

/** The board this token can reach, so a client can confirm its scope cheaply. */
agentRoutes.get('/board', async (c) => {
  const view = await loadBoardView(c.env.DB, boardOf(c))
  if (!view) return notFound(c, 'Board')
  return c.json(view)
})

agentRoutes.get('/columns', (c) => c.json({ columns: COLUMNS }))

agentRoutes.get('/profiles', async (c) => {
  const rows = await listActiveProfiles(c.env.DB)
  return c.json({
    profiles: rows.map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      roleTitle: profile.role_title,
      kind: profile.kind,
      avatarPath: profile.avatar_path,
    })),
  })
})

agentRoutes.get('/tasks', async (c) => {
  const result = await listTasks(c.env.DB, {
    boardId: boardOf(c),
    query: {
      status: c.req.query('status'),
      priority: c.req.query('priority'),
      assignee: c.req.query('assignee'),
      q: c.req.query('q'),
      limit: c.req.query('limit'),
    },
  })

  if (result.kind === 'invalid') {
    return c.json({ error: { code: 'VALIDATION_FAILED', message: result.message } }, 400)
  }

  return c.json({ tasks: result.tasks, truncated: result.truncated })
})

agentRoutes.get('/tasks/:taskId', async (c) => {
  const task = await readTask(c.env.DB, { boardId: boardOf(c), taskId: c.req.param('taskId') })
  if (!task) return notFound(c)
  return c.json({ task })
})

agentRoutes.post('/tasks', async (c) => {
  const body = await readJsonObject(c)
  if (!body) {
    return c.json({ error: { code: 'VALIDATION_FAILED', message: 'Expected a JSON object.' } }, 400)
  }

  const result = await createTask(c.env.DB, {
    boardId: boardOf(c),
    body,
    actor: actorOf(c),
  })

  if (result.kind === 'board_not_found') return notFound(c, 'Board')
  if (result.kind === 'invalid') {
    return c.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Check the fields.', fields: result.fields } },
      400,
    )
  }

  return c.json({ task: result.task }, 201)
})

agentRoutes.patch('/tasks/:taskId', async (c) => {
  const body = await readJsonObject(c)
  if (!body) {
    return c.json({ error: { code: 'VALIDATION_FAILED', message: 'Expected a JSON object.' } }, 400)
  }

  const result = await editTask(c.env.DB, {
    boardId: boardOf(c),
    taskId: c.req.param('taskId'),
    body,
    actor: actorOf(c),
  })

  if (result.kind === 'not_found') return notFound(c)
  if (result.kind === 'conflict') {
    return c.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'This task changed since you read it. Fetch it again and retry.',
        },
      },
      409,
    )
  }
  if (result.kind === 'invalid') {
    return c.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Check the fields.', fields: result.fields } },
      400,
    )
  }

  return c.json({ task: result.task })
})

agentRoutes.delete('/tasks/:taskId', async (c) => {
  const removed = await removeTask(c.env.DB, {
    boardId: boardOf(c),
    taskId: c.req.param('taskId'),
    actor: actorOf(c),
  })

  if (!removed) return notFound(c)
  return c.body(null, 204)
})

agentRoutes.post('/tasks/:taskId/move', async (c) => {
  const body = await readJsonObject(c)
  if (!body) {
    return c.json({ error: { code: 'VALIDATION_FAILED', message: 'Expected a JSON object.' } }, 400)
  }

  const result = await moveTask(c.env.DB, {
    boardId: boardOf(c),
    taskId: c.req.param('taskId'),
    body,
    actor: actorOf(c),
  })

  if (result.kind === 'not_found') return notFound(c)
  if (result.kind === 'conflict') {
    return c.json(
      { error: { code: 'CONFLICT', message: 'This task changed since you read it.' } },
      409,
    )
  }
  if (result.kind === 'invalid') {
    return c.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Check the fields.', fields: result.fields } },
      400,
    )
  }

  return c.json({ board: result.board, task: result.task })
})

agentRoutes.get('/tasks/:taskId/comments', async (c) => {
  const comments = await readComments(c.env.DB, {
    boardId: boardOf(c),
    taskId: c.req.param('taskId'),
  })
  if (!comments) return notFound(c)
  return c.json({ comments })
})

agentRoutes.post('/tasks/:taskId/comments', async (c) => {
  const body = await readJsonObject(c)
  if (!body) {
    return c.json({ error: { code: 'VALIDATION_FAILED', message: 'Expected a JSON object.' } }, 400)
  }

  const result = await addComment(c.env.DB, {
    boardId: boardOf(c),
    taskId: c.req.param('taskId'),
    body: body.body,
    actor: actorOf(c),
  })

  if (result.kind === 'not_found') return notFound(c)
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

agentRoutes.get('/activity', async (c) => {
  const result = await readActivity(c.env.DB, {
    boardId: boardOf(c),
    limit: c.req.query('limit'),
    before: c.req.query('before'),
  })

  if (result.kind === 'not_found') return notFound(c, 'Board')
  if (result.kind === 'invalid') {
    return c.json({ error: { code: 'VALIDATION_FAILED', message: result.message } }, 400)
  }

  return c.json(result.page)
})
