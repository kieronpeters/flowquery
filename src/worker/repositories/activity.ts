import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'

import type { ActivityDto } from '../../shared/api-types'

/**
 * Activity is append-only history: what happened, who did it, and a small
 * structured payload. Deliberately not a field-by-field diff — pages of
 * "description changed" make a feed unreadable, and detail is easier to add
 * later than noise is to remove.
 */

export type ActivityEventInput = {
  id: string
  boardId: string
  taskId: string | null
  actorType: 'human' | 'agent' | 'system'
  actorId: string | null
  actorName: string
  eventType: string
  payload: Record<string, unknown>
  createdAt: number
}

/** The statement, so callers can batch it with the write it describes. */
export function activityStatement(db: D1Database, event: ActivityEventInput): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO activity_events
         (id, board_id, task_id, actor_type, actor_id, actor_name, event_type, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.boardId,
      event.taskId,
      event.actorType,
      event.actorId,
      event.actorName,
      event.eventType,
      JSON.stringify(event.payload),
      event.createdAt,
    )
}

type ActivityRow = {
  id: string
  board_id: string
  task_id: string | null
  actor_type: 'human' | 'agent' | 'system'
  actor_id: string | null
  actor_name: string
  event_type: string
  payload: string
  created_at: number
}

export type ActivityPage = {
  events: ActivityDto[]
  nextBefore: number | null
}

export type ActivityQuery = {
  boardId: string
  limit: number
  before?: number
  /** Inclusive lower bound on `created_at`, in milliseconds. */
  since?: number
  /** Only these actors. Empty or absent means everyone. */
  actors?: string[]
}

/**
 * Board activity, newest first, keyset paginated by `created_at`.
 * Offset pagination would drift as new events arrive.
 *
 * Every filter is applied here rather than in the UI: the feed is paginated,
 * so filtering after the fact would hide matches that sit on a later page.
 */
export async function listBoardActivity(
  db: D1Database,
  input: ActivityQuery,
): Promise<ActivityPage> {
  const conditions = ['a.board_id = ?']
  const bindings: (string | number)[] = [input.boardId]

  if (input.before !== undefined) {
    conditions.push('a.created_at < ?')
    bindings.push(input.before)
  }

  if (input.since !== undefined) {
    conditions.push('a.created_at >= ?')
    bindings.push(input.since)
  }

  if (input.actors && input.actors.length > 0) {
    // Placeholders come from the array length, never from the values.
    conditions.push(`a.actor_name IN (${input.actors.map(() => '?').join(', ')})`)
    bindings.push(...input.actors)
  }

  bindings.push(input.limit)

  const { results } = await db
    .prepare(
      `SELECT a.id, a.board_id, a.task_id, a.actor_type, a.actor_id, a.actor_name,
              a.event_type, a.payload, a.created_at
         FROM activity_events a
        WHERE ${conditions.join(' AND ')}
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT ?`,
    )
    .bind(...bindings)
    .all<ActivityRow>()

  const rows = results ?? []
  const hasMore = rows.length === input.limit

  return {
    events: rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      actorType: row.actor_type,
      actorName: row.actor_name,
      eventType: row.event_type,
      payload: safeParse(row.payload),
      createdAt: new Date(row.created_at).toISOString(),
    })),
    nextBefore: hasMore && rows.length > 0 ? rows[rows.length - 1]!.created_at : null,
  }
}

/**
 * Everyone who has acted on the board, with how much they did.
 *
 * Grouped by name because that is what the feed shows and what the filter
 * matches; a name shared by two accounts still means "their activity".
 */
export async function listActivityActors(
  db: D1Database,
  boardId: string,
): Promise<{ name: string; count: number }[]> {
  const { results } = await db
    .prepare(
      `SELECT actor_name, COUNT(*) AS event_count
         FROM activity_events
        WHERE board_id = ?
        GROUP BY actor_name
        ORDER BY event_count DESC, actor_name ASC`,
    )
    .bind(boardId)
    .all<{ actor_name: string; event_count: number }>()

  return (results ?? []).map((row) => ({ name: row.actor_name, count: row.event_count }))
}

function safeParse(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}
