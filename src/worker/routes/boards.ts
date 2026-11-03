import { Hono } from 'hono'
import type { Context } from 'hono'

import type { AppEnv } from '../env'
import { requireSession } from '../middleware/session'
import { registerActivityRoutes } from './activity'
import { registerCommentRoutes } from './comments'
import { registerTaskRoutes } from './tasks'
import { registerTokenRoutes } from './tokens'
import {
  createBoard,
  deleteBoard,
  listBoards,
  setBoardTheme,
  validateBoardName,
  renameBoard,
} from '../services/boards'
import { loadBoardView } from '../services/board-view'

function validationError(c: Context, message: string, field?: string) {
  return c.json(
    {
      error: {
        code: 'VALIDATION_FAILED',
        message,
        ...(field ? { fields: { [field]: message } } : {}),
      },
    },
    400,
  )
}

async function readJson(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const body = (await c.req.json()) as unknown
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export const boardRoutes = new Hono<AppEnv>()

/** Every board and task route requires a human session. Applied once, not per handler. */
boardRoutes.use('*', requireSession)

/** BOARD-001: every board, newest first, for any signed-in human. */
boardRoutes.get('/', async (c) => {
  const boards = await listBoards(c.env.DB)
  return c.json({ boards })
})

/** BOARD-002: create. The id is generated server-side and is independent of the name. */
boardRoutes.post('/', async (c) => {
  const body = await readJson(c)
  if (!body) return validationError(c, 'Expected a JSON object body.')

  const name = validateBoardName(body.name)
  if (!name.ok) return validationError(c, name.message, 'name')

  const board = await createBoard(c.env.DB, {
    name: name.value,
    createdBy: c.get('user').id,
  })

  return c.json({ board }, 201)
})

/** Board view: metadata, the five fixed columns and their tasks. */
boardRoutes.get('/:boardId', async (c) => {
  try {
    const view = await loadBoardView(c.env.DB, c.req.param('boardId'))
    if (!view) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)
    }
    return c.json(view)
  } catch (error) {
    console.error('Board read failed', error instanceof Error ? error.name : 'unknown')
    return c.json(
      { error: { code: 'UNAVAILABLE', message: 'The board could not be loaded.' } },
      503,
    )
  }
})

/** BOARD-003: rename. The id never changes. */
boardRoutes.patch('/:boardId', async (c) => {
  const body = await readJson(c)
  if (!body) return validationError(c, 'Expected a JSON object body.')

  const name = validateBoardName(body.name)
  if (!name.ok) return validationError(c, name.message, 'name')

  const result = await renameBoard(c.env.DB, {
    boardId: c.req.param('boardId'),
    name: name.value,
  })

  if (result.kind === 'not_found') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)
  }

  return c.json({ board: { id: c.req.param('boardId'), name: name.value } })
})

/**
 * Board appearance. Human administration only: the agent namespace has no
 * equivalent route, so Bob cannot restyle a board.
 */
boardRoutes.put('/:boardId/theme', async (c) => {
  const body = await readJson(c)
  if (!body) return validationError(c, 'Expected a JSON object body.')

  const result = await setBoardTheme(c.env.DB, {
    boardId: c.req.param('boardId'),
    body,
  })

  if (result.kind === 'not_found') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)
  }

  if (result.kind === 'invalid') {
    return validationError(c, result.message)
  }

  return c.json({ theme: result.theme })
})

/**
 * BOARD-004/005: permanent delete. The client must echo the exact board name;
 * that is the confirmation gate, enforced in the service.
 */ boardRoutes.delete('/:boardId', async (c) => {
  const body = await readJson(c)
  if (!body) return validationError(c, 'Expected a JSON object body.')

  const result = await deleteBoard(c.env.DB, {
    boardId: c.req.param('boardId'),
    confirmName: body.confirmName,
  })

  if (result.kind === 'not_found') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)
  }

  if (result.kind === 'name_mismatch') {
    return c.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'The board name does not match. Nothing was deleted.',
          fields: { confirmName: 'Type the board name exactly.' },
        },
      },
      409,
    )
  }

  return c.body(null, 204)
})

// Task, comment, activity and token routes share this router's session middleware.
registerTaskRoutes(boardRoutes)
registerCommentRoutes(boardRoutes)
registerActivityRoutes(boardRoutes)
registerTokenRoutes(boardRoutes)
