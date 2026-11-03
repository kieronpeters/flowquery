import type { D1Database } from '@cloudflare/workers-types'

import type { ColumnKey } from '../../shared/columns'
import type { ProfileRow, TaskRow } from '../domain/types'

/**
 * Task SQL. Every function takes `boardId` first so no query can reach a task
 * without a board scope (SEC-001).
 */

const TASK_COLUMNS = `id, board_id, title, description, status, position, priority,
                      assignee_profile_id, due_date, version, created_at, updated_at`

export async function getTaskById(
  db: D1Database,
  boardId: string,
  taskId: string,
): Promise<TaskRow | null> {
  return await db
    .prepare(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? AND board_id = ?`)
    .bind(taskId, boardId)
    .first<TaskRow>()
}

/** Next position at the end of a column, so new work appears last. */
export async function nextPosition(
  db: D1Database,
  boardId: string,
  status: ColumnKey,
): Promise<number> {
  const row = await db
    .prepare(
      'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM tasks WHERE board_id = ? AND status = ?',
    )
    .bind(boardId, status)
    .first<{ next: number }>()

  return row?.next ?? 0
}

export async function insertTask(
  db: D1Database,
  input: {
    id: string
    boardId: string
    title: string
    description: string
    status: ColumnKey
    position: number
    priority: string
    assigneeProfileId: string | null
    dueDate: string | null
    createdAt: number
    createdByType: 'human' | 'agent'
    createdById: string
    createdByName: string
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO tasks (id, board_id, title, description, status, position, priority,
                          assignee_profile_id, due_date, version, created_at, updated_at,
                          created_by_type, created_by_id, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.boardId,
      input.title,
      input.description,
      input.status,
      input.position,
      input.priority,
      input.assigneeProfileId,
      input.dueDate,
      input.createdAt,
      input.createdAt,
      input.createdByType,
      input.createdById,
      input.createdByName,
    )
    .run()
}

/** Updatable fields, mapped to their column names. A whitelist, not interpolation. */
const UPDATABLE = {
  title: 'title',
  description: 'description',
  status: 'status',
  position: 'position',
  priority: 'priority',
  assigneeProfileId: 'assignee_profile_id',
  dueDate: 'due_date',
} as const

export type TaskUpdate = {
  boardId: string
  taskId: string
  fields: Partial<{
    title: string
    description: string
    status: ColumnKey
    position: number
    priority: string
    assigneeProfileId: string | null
    dueDate: string | null
  }>
  expectedVersion?: number
  now: number
}

export type UpdateOutcome = 'ok' | 'not_found' | 'conflict'

/**
 * Optimistic concurrency: when `expectedVersion` is supplied the update only
 * applies if the row still has that version. A zero-row result is then
 * disambiguated with a scoped read.
 */
export async function updateTask(db: D1Database, input: TaskUpdate): Promise<UpdateOutcome> {
  const assignments: string[] = []
  const values: unknown[] = []

  for (const [key, column] of Object.entries(UPDATABLE)) {
    const field = key as keyof typeof UPDATABLE
    if (field in input.fields) {
      assignments.push(`${column} = ?`)
      values.push(input.fields[field] ?? null)
    }
  }

  if (assignments.length === 0) return 'ok'

  assignments.push('version = version + 1', 'updated_at = ?')
  values.push(input.now)

  const where = ['id = ?', 'board_id = ?']
  const whereValues: unknown[] = [input.taskId, input.boardId]

  if (input.expectedVersion !== undefined) {
    where.push('version = ?')
    whereValues.push(input.expectedVersion)
  }

  const result = await db
    .prepare(`UPDATE tasks SET ${assignments.join(', ')} WHERE ${where.join(' AND ')}`)
    .bind(...values, ...whereValues)
    .run()

  if ((result.meta?.changes ?? 0) > 0) return 'ok'

  const existing = await getTaskById(db, input.boardId, input.taskId)
  return existing ? 'conflict' : 'not_found'
}

export async function deleteTask(
  db: D1Database,
  boardId: string,
  taskId: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM tasks WHERE id = ? AND board_id = ?')
    .bind(taskId, boardId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}

export async function getActiveProfile(
  db: D1Database,
  profileId: string,
): Promise<ProfileRow | null> {
  return await db
    .prepare(
      'SELECT id, display_name, role_title, kind, avatar_path, active FROM team_profiles WHERE id = ? AND active = 1',
    )
    .bind(profileId)
    .first<ProfileRow>()
}
