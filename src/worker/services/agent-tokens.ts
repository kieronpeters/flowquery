import type { D1Database } from '@cloudflare/workers-types'

import type { AgentTokenRecord } from '../repositories/agent-tokens'
import { insertAgentToken, listAgentTokens, revokeAgentToken } from '../repositories/agent-tokens'
import { randomId, randomToken, sha256Hex } from '../lib/ids'

export const TOKEN_LABEL_MAX = 80
export const TOKEN_PREFIX = 'fq_'

export type CreatedToken = {
  /** The only time this value exists in plaintext. Never stored, never logged. */
  token: string
  record: AgentTokenRecord
}

export type TokenCreateResult =
  { kind: 'ok'; created: CreatedToken } | { kind: 'invalid'; message: string }

export function validateTokenLabel(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== 'string') return { ok: false, message: 'Label must be a string.' }
  const value = raw.trim()
  if (value.length === 0) return { ok: false, message: 'Label is required.' }
  if (value.length > TOKEN_LABEL_MAX) {
    return { ok: false, message: `Label must be ${TOKEN_LABEL_MAX} characters or fewer.` }
  }
  return { ok: true, value }
}

export async function createAgentToken(
  db: D1Database,
  input: { boardId: string; label: string; createdBy: string; now?: number },
): Promise<CreatedToken> {
  const now = input.now ?? Date.now()
  const id = randomId('tok')

  // `fq_` plus 32 random bytes. The prefix stored for display is the first
  // eight characters, enough to tell tokens apart in a list.
  const token = `${TOKEN_PREFIX}${randomToken(32)}`
  const tokenPrefix = token.slice(0, 8)
  const tokenHash = await sha256Hex(token)

  await insertAgentToken(db, {
    id,
    boardId: input.boardId,
    label: input.label,
    tokenPrefix,
    tokenHash,
    createdBy: input.createdBy,
    now,
  })

  return {
    token,
    record: {
      id,
      boardId: input.boardId,
      label: input.label,
      tokenPrefix,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
    },
  }
}

export async function listTokensForBoard(
  db: D1Database,
  boardId: string,
): Promise<AgentTokenRecord[]> {
  return await listAgentTokens(db, boardId)
}

export async function revokeTokenForBoard(
  db: D1Database,
  input: { boardId: string; tokenId: string; now?: number },
): Promise<boolean> {
  return await revokeAgentToken(db, {
    boardId: input.boardId,
    tokenId: input.tokenId,
    now: input.now ?? Date.now(),
  })
}
