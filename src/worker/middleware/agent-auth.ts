import type { MiddlewareHandler } from 'hono'

import type { AppEnv } from '../env'
import { sha256Hex } from '../lib/ids'
import { findActiveAgentToken, touchAgentToken } from '../repositories/agent-tokens'
import { TOKEN_PREFIX } from '../services/agent-tokens'

/**
 * Agent authentication.
 *
 * The token IS the scope: `boardId` comes from the credential and nowhere else.
 * There is no route parameter, body field or header through which a caller can
 * name a board, so a valid token can only ever reach its own board.
 *
 * Unknown, malformed and revoked tokens all produce the same response. The
 * caller learns nothing about which of those it was.
 */
export const requireAgentToken: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('authorization') ?? ''
  const [scheme, credential] = header.split(' ')

  if (!credential || scheme?.toLowerCase() !== 'bearer') {
    return c.json(
      { error: { code: 'UNAUTHENTICATED', message: 'A bearer token is required.' } },
      401,
    )
  }

  if (!credential.startsWith(TOKEN_PREFIX) || credential.length < 20) {
    return c.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token.' } }, 401)
  }

  const record = await findActiveAgentToken(c.env.DB, await sha256Hex(credential))
  if (!record) {
    return c.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token.' } }, 401)
  }

  c.set('agent', { tokenId: record.id, boardId: record.boardId, label: record.label })

  // Best-effort: a failed touch must not reject an otherwise valid request.
  try {
    await touchAgentToken(c.env.DB, record.id, Date.now())
  } catch {
    // ignore
  }

  await next()
}
