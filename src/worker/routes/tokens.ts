import type { Hono } from 'hono'

import type { AppEnv } from '../env'
import { readJsonObject } from '../lib/request'
import { getBoardById } from '../repositories/boards'
import {
  createAgentToken,
  listTokensForBoard,
  revokeTokenForBoard,
  validateTokenLabel,
} from '../services/agent-tokens'

/**
 * Human management of agent credentials. Registered onto the board router, so
 * it is session-gated like the rest of board administration.
 *
 * The plaintext token appears in exactly one response, at creation (AGT-002).
 * Nothing here can ever return it again.
 */
export function registerTokenRoutes(router: Hono<AppEnv>): void {
  const boardMissing = (c: { json: (body: unknown, status: 404) => Response }) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)

  router.get('/:boardId/tokens', async (c) => {
    const board = await getBoardById(c.env.DB, c.req.param('boardId'))
    if (!board) return boardMissing(c)

    const tokens = await listTokensForBoard(c.env.DB, board.id)

    return c.json({
      tokens: tokens.map((token) => ({
        id: token.id,
        label: token.label,
        tokenPrefix: token.tokenPrefix,
        createdAt: new Date(token.createdAt).toISOString(),
        lastUsedAt: token.lastUsedAt ? new Date(token.lastUsedAt).toISOString() : null,
        revokedAt: token.revokedAt ? new Date(token.revokedAt).toISOString() : null,
      })),
    })
  })

  router.post('/:boardId/tokens', async (c) => {
    const board = await getBoardById(c.env.DB, c.req.param('boardId'))
    if (!board) return boardMissing(c)

    const body = await readJsonObject(c)
    if (!body) {
      return c.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Expected a JSON object.' } },
        400,
      )
    }

    const label = validateTokenLabel(body.label)
    if (!label.ok) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: label.message,
            fields: { label: label.message },
          },
        },
        400,
      )
    }

    const created = await createAgentToken(c.env.DB, {
      boardId: board.id,
      label: label.value,
      createdBy: c.get('user').id,
    })

    return c.json(
      {
        // Shown once. It is not retrievable afterwards, by design.
        token: created.token,
        record: {
          id: created.record.id,
          label: created.record.label,
          tokenPrefix: created.record.tokenPrefix,
          createdAt: new Date(created.record.createdAt).toISOString(),
          lastUsedAt: null,
          revokedAt: null,
        },
      },
      201,
    )
  })

  router.delete('/:boardId/tokens/:tokenId', async (c) => {
    const revoked = await revokeTokenForBoard(c.env.DB, {
      boardId: c.req.param('boardId'),
      tokenId: c.req.param('tokenId'),
    })

    if (!revoked) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Token not found.' } }, 404)
    }

    return c.body(null, 204)
  })
}
