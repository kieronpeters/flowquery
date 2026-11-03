import type { D1Database } from '@cloudflare/workers-types'

import type { BoardRow, ProfileRow, TaskRow } from '../domain/types'

/**
 * All SQL lives here (docs/ARCHITECTURE.md §3).
 *
 * Every function that returns board data takes `boardId` as its first
 * parameter. That is deliberate: there is no signature that can return tenant
 * data without a scope (SEC-001). When the agent API arrives in M7 it reuses
 * these functions with the board taken from the token, not from the request.
 */

export async function getBoardById(db: D1Database, boardId: string): Promise<BoardRow | null> {
  return await db
    .prepare('SELECT id, name, created_by, created_at, updated_at, theme FROM boards WHERE id = ?')
    .bind(boardId)
    .first<BoardRow>()
}

/** Stores the appearance document. Returns false when the board does not exist. */
export async function updateBoardTheme(
  db: D1Database,
  input: { boardId: string; theme: unknown; now: number },
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE boards SET theme = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(input.theme), input.now, input.boardId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}

export type BoardWithCountRow = BoardRow & { task_count: number }

/** Every board, newest first, with its task count. Humans can see all boards. */
export async function listBoardsWithTaskCounts(db: D1Database): Promise<BoardWithCountRow[]> {
  const { results } = await db
    .prepare(
      `SELECT b.id, b.name, b.created_by, b.created_at, b.updated_at,
              COUNT(t.id) AS task_count
         FROM boards b
         LEFT JOIN tasks t ON t.board_id = b.id
        GROUP BY b.id
        ORDER BY b.created_at DESC`,
    )
    .all<BoardWithCountRow>()

  return results ?? []
}

export async function insertBoard(
  db: D1Database,
  input: { id: string; name: string; createdBy: string; now: number },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO boards (id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(input.id, input.name, input.createdBy, input.now, input.now)
    .run()
}

/** Returns false when the board does not exist. */
export async function updateBoardName(
  db: D1Database,
  input: { boardId: string; name: string; now: number },
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE boards SET name = ?, updated_at = ? WHERE id = ?')
    .bind(input.name, input.now, input.boardId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}

/** Returns false when the board does not exist. Cascades to tasks, comments, activity and tokens. */
export async function deleteBoardById(db: D1Database, boardId: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM boards WHERE id = ?').bind(boardId).run()
  return (result.meta?.changes ?? 0) > 0
}

export async function listTasksByBoard(db: D1Database, boardId: string): Promise<TaskRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, board_id, title, description, status, position, priority,
              assignee_profile_id, due_date, version, created_at, updated_at
         FROM tasks
        WHERE board_id = ?
        ORDER BY status, position, created_at`,
    )
    .bind(boardId)
    .all<TaskRow>()

  return results ?? []
}

export async function listActiveProfiles(db: D1Database): Promise<ProfileRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, display_name, role_title, kind, avatar_path, active
         FROM team_profiles
        WHERE active = 1
        ORDER BY kind, display_name`,
    )
    .all<ProfileRow>()

  return results ?? []
}
