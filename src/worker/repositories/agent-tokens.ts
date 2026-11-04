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
 *
 * A token belongs to an agent (`profile_id`). The label is still stored, because
 * that is what the activity history records, but it is copied from the profile
 * rather than typed — so an agent's actions can never lose their name to a typo.
 */

export type AgentTokenRecord = {
  id: string
  boardId: string
  /** Null only for a token created before tokens belonged to an agent. */
  profileId: string | null
  label: string
  tokenPrefix: string
  createdAt: number
  lastUsedAt: number | null
  revokedAt: number | null
}

type TokenRow = {
  id: string
  board_id: string
  profile_id: string | null
  label: string
  token_prefix: string
  token_hash: string
  created_at: number
  last_used_at: number | null
  revoked_at: number | null
}

const COLUMNS =
  'id, board_id, profile_id, label, token_prefix, token_hash, created_at, last_used_at, revoked_at'

function toRecord(row: TokenRow): AgentTokenRecord {
  return {
    id: row.id,
    boardId: row.board_id,
    profileId: row.profile_id,
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
    profileId: string
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
         (id, board_id, profile_id, label, token_prefix, token_hash, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.boardId,
      input.profileId,
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
      `SELECT ${COLUMNS}
         FROM agent_tokens
        WHERE board_id = ?
        ORDER BY created_at DESC`,
    )
    .bind(boardId)
    .all<TokenRow>()

  return (results ?? []).map(toRecord)
}

/** One token by id, scoped to its board. Null when it is not on this board. */
export async function findTokenById(
  db: D1Database,
  input: { boardId: string; tokenId: string },
): Promise<AgentTokenRecord | null> {
  const row = await db
    .prepare(`SELECT ${COLUMNS} FROM agent_tokens WHERE id = ? AND board_id = ?`)
    .bind(input.tokenId, input.boardId)
    .first<TokenRow>()

  return row ? toRecord(row) : null
}

/** The live token for one agent on one board, if any. */
export async function findLiveTokenForProfile(
  db: D1Database,
  input: { boardId: string; profileId: string },
): Promise<AgentTokenRecord | null> {
  const row = await db
    .prepare(
      `SELECT ${COLUMNS}
         FROM agent_tokens
        WHERE board_id = ? AND profile_id = ? AND revoked_at IS NULL`,
    )
    .bind(input.boardId, input.profileId)
    .first<TokenRow>()

  return row ? toRecord(row) : null
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
 * Revokes one token and inserts its replacement in a single batch.
 *
 * D1 runs a batch as one transaction, so a failure leaves the old token working
 * rather than leaving the agent with nothing. Order matters: the unique index
 * allows one live token per agent, so the revoke must land before the insert.
 */
export async function replaceAgentToken(
  db: D1Database,
  input: {
    oldTokenId: string
    boardId: string
    now: number
    replacement: {
      id: string
      profileId: string
      label: string
      tokenPrefix: string
      tokenHash: string
      createdBy: string
    }
  },
): Promise<void> {
  const revoke = db
    .prepare(
      'UPDATE agent_tokens SET revoked_at = ? WHERE id = ? AND board_id = ? AND revoked_at IS NULL',
    )
    .bind(input.now, input.oldTokenId, input.boardId)

  const insert = db
    .prepare(
      `INSERT INTO agent_tokens
         (id, board_id, profile_id, label, token_prefix, token_hash, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.replacement.id,
      input.boardId,
      input.replacement.profileId,
      input.replacement.label,
      input.replacement.tokenPrefix,
      input.replacement.tokenHash,
      input.replacement.createdBy,
      input.now,
    )

  await db.batch([revoke, insert])
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
    .prepare(`SELECT ${COLUMNS} FROM agent_tokens WHERE token_hash = ? AND revoked_at IS NULL`)
    .bind(tokenHash)
    .first<TokenRow>()

  return row ? toRecord(row) : null
}

export async function touchAgentToken(db: D1Database, tokenId: string, now: number): Promise<void> {
  await db.prepare('UPDATE agent_tokens SET last_used_at = ? WHERE id = ?').bind(now, tokenId).run()
}
