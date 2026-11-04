import type { Hono } from 'hono'

import type { AppEnv } from '../env'
import { readJsonObject } from '../lib/request'
import { getBoardById } from '../repositories/boards'
import {
  createAgentTokenForProfile,
  listTokensForBoard,
  revokeTokenForBoard,
  rotateAgentToken,
} from '../services/agent-tokens'

/**
 * Human management of agent credentials. Registered onto the board router, so
 * it is session-gated like the rest of board administration.
 *
 * One agent holds one live token per board. Rotating replaces it in place
 * rather than making the human revoke and then create.
 *
 * The plaintext token appears in exactly one response, at creation (AGT-002).
 * Nothing here can ever return it again.
 */
export function registerTokenRoutes(router: Hono<AppEnv>): void {
  const boardMissing = (c: { json: (body: unknown, status: 404) => Response }) =>
    c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)

  const tokenJson = (token: {
    id: string
    profileId: string | null
    label: string
    tokenPrefix: string
    createdAt: number
    lastUsedAt: number | null
    revokedAt: number | null
  }) => ({
    id: token.id,
    profileId: token.profileId,
    label: token.label,
    tokenPrefix: token.tokenPrefix,
    createdAt: new Date(token.createdAt).toISOString(),
    lastUsedAt: token.lastUsedAt ? new Date(token.lastUsedAt).toISOString() : null,
    revokedAt: token.revokedAt ? new Date(token.revokedAt).toISOString() : null,
  })

  router.get('/:boardId/tokens', async (c) => {
    const board = await getBoardById(c.env.DB, c.req.param('boardId'))
    if (!board) return boardMissing(c)

    const tokens = await listTokensForBoard(c.env.DB, board.id)

    return c.json({ tokens: tokens.map(tokenJson) })
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

    if (typeof body.profileId !== 'string' || body.profileId.trim() === '') {
      return c.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Choose an agent for this token.',
            fields: { profileId: 'Choose an agent for this token.' },
          },
        },
        400,
      )
    }

    const result = await createAgentTokenForProfile(c.env.DB, {
      boardId: board.id,
      profileId: body.profileId,
      createdBy: c.get('user').id,
    })

    if (result.kind === 'not_found') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Agent not found.' } }, 404)
    }

    if (result.kind === 'invalid') {
      return c.json({ error: { code: 'VALIDATION_FAILED', message: result.message } }, 400)
    }

    if (result.kind === 'conflict') {
      return c.json(
        {
          error: {
            code: 'CONFLICT',
            message: `${result.label} already has a token on this board. Rotate it instead.`,
          },
        },
        409,
      )
    }

    return c.json(
      {
        // Shown once. It is not retrievable afterwards, by design.
        token: result.created.token,
        record: tokenJson(result.created.record),
      },
      201,
    )
  })

  /** Revokes the current token and issues a fresh one, in one step. */
  router.post('/:boardId/tokens/:tokenId/rotate', async (c) => {
    const board = await getBoardById(c.env.DB, c.req.param('boardId'))
    if (!board) return boardMissing(c)

    const result = await rotateAgentToken(c.env.DB, {
      boardId: board.id,
      tokenId: c.req.param('tokenId'),
      createdBy: c.get('user').id,
    })

    if (result.kind === 'not_found') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Token not found.' } }, 404)
    }

    if (result.kind === 'invalid') {
      return c.json({ error: { code: 'VALIDATION_FAILED', message: result.message } }, 400)
    }

    return c.json({ token: result.created.token, record: tokenJson(result.created.record) }, 201)
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
