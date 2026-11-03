import type { D1Database } from '@cloudflare/workers-types'

import type { ActivityPageDto } from '../../shared/api-types'
import { listBoardActivity } from '../repositories/activity'
import { getBoardById } from '../repositories/boards'

export const ACTIVITY_DEFAULT_LIMIT = 20
export const ACTIVITY_MAX_LIMIT = 50

export type ActivityResult =
  | { kind: 'ok'; page: ActivityPageDto }
  | { kind: 'invalid'; message: string }
  | { kind: 'not_found' }

export async function readActivity(
  db: D1Database,
  input: { boardId: string; limit?: unknown; before?: unknown },
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

  const board = await getBoardById(db, input.boardId)
  if (!board) return { kind: 'not_found' }

  const page = await listBoardActivity(db, { boardId: input.boardId, limit, before })
  return { kind: 'ok', page }
}
