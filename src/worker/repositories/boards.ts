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
    .prepare('SELECT id, name, created_by, created_at, updated_at FROM boards WHERE id = ?')
    .bind(boardId)
    .first<BoardRow>()
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
