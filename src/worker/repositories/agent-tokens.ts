import type { D1Database } from '@cloudflare/workers-types'

/**
 * Board-scoped agent credentials.
 *
 * A token is 256 bits of randomness, so it needs only a fast hash: there is
 * nothing to brute-force, and a slow hash would not fit the CPU budget
 * (SECURITY_AND_AUTH §6). Only the hash is stored; the plaintext exists once,
 * at creation.
 *
 * Revocation sets `revoked_at` rather than deleting the row, so the board keeps
 * a record that the credential existed and when it stopped working.
 */

export type AgentTokenRecord = {
  id: string
  boardId: string
  label: string
  tokenPrefix: string
  createdAt: number
  lastUsedAt: number | null
  revokedAt: number | null
}

type TokenRow = {
  id: string
  board_id: string
  label: string
  token_prefix: string
  token_hash: string
  created_at: number
  last_used_at: number | null
  revoked_at: number | null
}

function toRecord(row: TokenRow): AgentTokenRecord {
  return {
    id: row.id,
    boardId: row.board_id,
    label: row.label,
    tokenPrefix: row.token_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  }
}

export async function insertAgentToken(
  db: D1Database,
  input: {
    id: string
    boardId: string
    label: string
    tokenPrefix: string
    tokenHash: string
    createdBy: string
    now: number
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO agent_tokens
         (id, board_id, label, token_prefix, token_hash, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.boardId,
      input.label,
      input.tokenPrefix,
      input.tokenHash,
      input.createdBy,
      input.now,
    )
    .run()
}

export async function listAgentTokens(
  db: D1Database,
  boardId: string,
): Promise<AgentTokenRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT id, board_id, label, token_prefix, token_hash, created_at, last_used_at, revoked_at
         FROM agent_tokens
        WHERE board_id = ?
        ORDER BY created_at DESC`,
    )
    .bind(boardId)
    .all<TokenRow>()

  return (results ?? []).map(toRecord)
}

/** Returns false when the token does not belong to this board. */
export async function revokeAgentToken(
  db: D1Database,
  input: { boardId: string; tokenId: string; now: number },
): Promise<boolean> {
  const result = await db
    .prepare(
      'UPDATE agent_tokens SET revoked_at = ? WHERE id = ? AND board_id = ? AND revoked_at IS NULL',
    )
    .bind(input.now, input.tokenId, input.boardId)
    .run()

  if ((result.meta?.changes ?? 0) > 0) return true

  // Already revoked still counts as "not found" for the caller's purposes:
  // nothing changed. Distinguishing them would leak whether an id exists.
  return false
}

/**
 * Resolves a bearer token. Revoked, unknown and malformed tokens are all null;
 * the caller must not distinguish between them in a response.
 */
export async function findActiveAgentToken(
  db: D1Database,
  tokenHash: string,
): Promise<AgentTokenRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, board_id, label, token_prefix, token_hash, created_at, last_used_at, revoked_at
         FROM agent_tokens
        WHERE token_hash = ? AND revoked_at IS NULL`,
    )
    .bind(tokenHash)
    .first<TokenRow>()

  return row ? toRecord(row) : null
}

export async function touchAgentToken(db: D1Database, tokenId: string, now: number): Promise<void> {
  await db.prepare('UPDATE agent_tokens SET last_used_at = ? WHERE id = ?').bind(now, tokenId).run()
}
