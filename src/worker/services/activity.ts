import type { D1Database } from '@cloudflare/workers-types'

import type { ActivityPageDto } from '../../shared/api-types'
import { listActivityActors, listBoardActivity } from '../repositories/activity'
import { getBoardById } from '../repositories/boards'

export const ACTIVITY_DEFAULT_LIMIT = 20
export const ACTIVITY_MAX_LIMIT = 50
export const ACTIVITY_MAX_ACTORS = 20
export const ACTIVITY_MAX_ACTOR_LENGTH = 80

export type ActivityResult =
  | { kind: 'ok'; page: ActivityPageDto }
  | { kind: 'invalid'; message: string }
  | { kind: 'not_found' }

/**
 * Reads one page of board activity.
 *
 * `since` is a millisecond timestamp rather than a named period ("today",
 * "week") on purpose: the boundary of a day is a local-time question, and the
 * Worker answers in UTC. The client knows the user's timezone; the server
 * does not, so the client sends the instant.
 */
export async function readActivity(
  db: D1Database,
  input: { boardId: string; limit?: unknown; before?: unknown; since?: unknown; actors?: unknown },
): Promise<ActivityResult> {
  let limit = ACTIVITY_DEFAULT_LIMIT
  if (input.limit !== undefined && input.limit !== '') {
    const parsed = Number(input.limit)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > ACTIVITY_MAX_LIMIT) {
      return { kind: 'invalid', message: `limit must be 1-${ACTIVITY_MAX_LIMIT}.` }
    }
    limit = parsed
  }

  let before: number | undefined
  if (input.before !== undefined && input.before !== '') {
    const parsed = Number(input.before)
    if (!Number.isInteger(parsed) || parsed < 0) {
      return { kind: 'invalid', message: 'before must be a timestamp in milliseconds.' }
    }
    before = parsed
  }

  let since: number | undefined
  if (input.since !== undefined && input.since !== '') {
    const parsed = Number(input.since)
    if (!Number.isInteger(parsed) || parsed < 0) {
      return { kind: 'invalid', message: 'since must be a timestamp in milliseconds.' }
    }
    since = parsed
  }

  const actors = parseActors(input.actors)
  if (actors.kind === 'invalid') return { kind: 'invalid', message: actors.message }

  const board = await getBoardById(db, input.boardId)
  if (!board) return { kind: 'not_found' }

  const [page, roster] = await Promise.all([
    listBoardActivity(db, {
      boardId: input.boardId,
      limit,
      before,
      since,
      ...(actors.names.length > 0 ? { actors: actors.names } : {}),
    }),
    listActivityActors(db, input.boardId),
  ])

  return { kind: 'ok', page: { ...page, actors: roster } }
}

/** `actors=Kieron,Bob` — comma separated, trimmed, de-duplicated. */
function parseActors(
  value: unknown,
): { kind: 'ok'; names: string[] } | { kind: 'invalid'; message: string } {
  if (value === undefined || value === null || value === '') return { kind: 'ok', names: [] }

  let parts: string[]

  if (typeof value === 'string') {
    parts = value.split(',')
  } else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    // Programmatic callers may hand over the list directly.
    parts = value as string[]
  } else {
    return { kind: 'invalid', message: 'actors must be a comma-separated list of names.' }
  }

  const names = [...new Set(parts.map((name) => name.trim()).filter((name) => name !== ''))]

  if (names.length > ACTIVITY_MAX_ACTORS) {
    return { kind: 'invalid', message: `actors must list at most ${ACTIVITY_MAX_ACTORS} names.` }
  }

  if (names.some((name) => name.length > ACTIVITY_MAX_ACTOR_LENGTH)) {
    return {
      kind: 'invalid',
      message: `Each actor name must be at most ${ACTIVITY_MAX_ACTOR_LENGTH} characters.`,
    }
  }

  return { kind: 'ok', names }
}
