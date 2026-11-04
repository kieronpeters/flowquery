import type { D1Database } from '@cloudflare/workers-types'

import { randomId, randomToken, sha256Hex } from '../lib/ids'
import type { AgentTokenRecord } from '../repositories/agent-tokens'
import {
  findLiveTokenForProfile,
  findTokenById,
  insertAgentToken,
  listAgentTokens,
  replaceAgentToken,
  revokeAgentToken,
} from '../repositories/agent-tokens'
import { getProfileById } from '../repositories/boards'

export const TOKEN_PREFIX = 'fq_'

export type CreatedToken = {
  /** The only time this value exists in plaintext. Never stored, never logged. */
  token: string
  record: AgentTokenRecord
}

export type TokenCreateResult =
  | { kind: 'ok'; created: CreatedToken }
  | { kind: 'invalid'; message: string }
  | { kind: 'not_found' }
  /** This agent already holds a live token on this board. */
  | { kind: 'conflict'; label: string }

export type TokenRotateResult =
  | { kind: 'ok'; created: CreatedToken }
  | { kind: 'invalid'; message: string }
  | { kind: 'not_found' }

/** `fq_` plus 32 random bytes. The stored prefix is the first eight characters. */
async function mintSecret(): Promise<{ token: string; tokenPrefix: string; tokenHash: string }> {
  const token = `${TOKEN_PREFIX}${randomToken(32)}`
  return {
    token,
    tokenPrefix: token.slice(0, 8),
    tokenHash: await sha256Hex(token),
  }
}

/**
 * Issues the one token an agent may hold on a board.
 *
 * The label is copied from the profile, never supplied by the caller: that is
 * what keeps an agent's activity attributed to the right name and avatar.
 */
export async function createAgentTokenForProfile(
  db: D1Database,
  input: { boardId: string; profileId: string; createdBy: string; now?: number },
): Promise<TokenCreateResult> {
  const profile = await getProfileById(db, input.profileId)
  if (!profile || !profile.active) return { kind: 'not_found' }

  if (profile.kind === 'human') {
    return { kind: 'invalid', message: 'Humans sign in with GitHub; only agents hold tokens.' }
  }

  const existing = await findLiveTokenForProfile(db, {
    boardId: input.boardId,
    profileId: input.profileId,
  })
  if (existing) return { kind: 'conflict', label: profile.display_name }

  const now = input.now ?? Date.now()
  const id = randomId('tok')
  const secret = await mintSecret()

  await insertAgentToken(db, {
    id,
    boardId: input.boardId,
    profileId: profile.id,
    label: profile.display_name,
    tokenPrefix: secret.tokenPrefix,
    tokenHash: secret.tokenHash,
    createdBy: input.createdBy,
    now,
  })

  return {
    kind: 'ok',
    created: {
      token: secret.token,
      record: {
        id,
        boardId: input.boardId,
        profileId: profile.id,
        label: profile.display_name,
        tokenPrefix: secret.tokenPrefix,
        createdAt: now,
        lastUsedAt: null,
        revokedAt: null,
      },
    },
  }
}

/**
 * Replaces an agent's token with a fresh one, in a single step.
 *
 * The old value stops working the moment this succeeds — that is the point of
 * rotating, so the two halves happen in one transaction rather than asking a
 * human to revoke and then create.
 */
export async function rotateAgentToken(
  db: D1Database,
  input: { boardId: string; tokenId: string; createdBy: string; now?: number },
): Promise<TokenRotateResult> {
  const existing = await findTokenById(db, { boardId: input.boardId, tokenId: input.tokenId })

  if (!existing || existing.revokedAt !== null) return { kind: 'not_found' }

  if (!existing.profileId) {
    return {
      kind: 'invalid',
      message: 'That token is not linked to an agent. Revoke it and create a new one.',
    }
  }

  const profile = await getProfileById(db, existing.profileId)
  if (!profile) return { kind: 'not_found' }

  const now = input.now ?? Date.now()
  const id = randomId('tok')
  const secret = await mintSecret()

  await replaceAgentToken(db, {
    oldTokenId: existing.id,
    boardId: input.boardId,
    now,
    replacement: {
      id,
      profileId: profile.id,
      label: profile.display_name,
      tokenPrefix: secret.tokenPrefix,
      tokenHash: secret.tokenHash,
      createdBy: input.createdBy,
    },
  })

  return {
    kind: 'ok',
    created: {
      token: secret.token,
      record: {
        id,
        boardId: input.boardId,
        profileId: profile.id,
        label: profile.display_name,
        tokenPrefix: secret.tokenPrefix,
        createdAt: now,
        lastUsedAt: null,
        revokedAt: null,
      },
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
