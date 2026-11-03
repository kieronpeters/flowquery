import type { D1Database } from '@cloudflare/workers-types'

import type { BoardView, TaskDto } from '../../shared/api-types'
import { COLUMNS } from '../../shared/columns'
import type { BoardRow, ProfileRow, TaskRow } from '../domain/types'
import { getBoardById, listActiveProfiles, listTasksByBoard } from '../repositories/boards'

/**
 * Board/list responses truncate descriptions to protect the 10 ms CPU budget
 * (DEC-025). The full text is available from a single-task request.
 */
export const DESCRIPTION_PREVIEW_LENGTH = 500

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

function toTaskDto(task: TaskRow, profiles: Map<string, ProfileRow>): TaskDto {
  const profile = task.assignee_profile_id ? profiles.get(task.assignee_profile_id) : undefined

  const truncated = task.description.length > DESCRIPTION_PREVIEW_LENGTH

  return {
    id: task.id,
    title: task.title,
    description: truncated
      ? task.description.slice(0, DESCRIPTION_PREVIEW_LENGTH)
      : task.description,
    descriptionTruncated: truncated,
    status: task.status,
    position: task.position,
    priority: task.priority,
    assignee: profile
      ? {
          id: profile.id,
          displayName: profile.display_name,
          roleTitle: profile.role_title,
        }
      : null,
    dueDate: task.due_date,
    version: task.version,
    createdAt: toIso(task.created_at),
    updatedAt: toIso(task.updated_at),
  }
}

/**
 * Pure assembly step, separated from I/O so it can be tested without a
 * database. Column order comes from the constant, never from the data.
 */
export function assembleBoardView(
  board: BoardRow,
  tasks: TaskRow[],
  profiles: ProfileRow[],
): BoardView {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const columns = COLUMNS.map((column) => {
    const columnTasks = tasks
      .filter((task) => task.status === column.key)
      .sort((a, b) => a.position - b.position || a.created_at - b.created_at)
      .map((task) => toTaskDto(task, profileMap))

    return {
      key: column.key,
      name: column.name,
      position: column.position,
      taskCount: columnTasks.length,
      tasks: columnTasks,
    }
  })

  return {
    board: {
      id: board.id,
      name: board.name,
      createdAt: toIso(board.created_at),
      updatedAt: toIso(board.updated_at),
      taskCount: tasks.length,
    },
    columns,
  }
}

/** Returns null when the board does not exist, so the route can answer 404. */
export async function loadBoardView(db: D1Database, boardId: string): Promise<BoardView | null> {
  const board = await getBoardById(db, boardId)
  if (!board) return null

  const [tasks, profiles] = await Promise.all([
    listTasksByBoard(db, boardId),
    listActiveProfiles(db),
  ])

  return assembleBoardView(board, tasks, profiles)
}
