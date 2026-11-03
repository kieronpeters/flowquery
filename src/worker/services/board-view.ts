import type { D1Database } from '@cloudflare/workers-types'

import type { BoardView } from '../../shared/api-types'
import { COLUMNS } from '../../shared/columns'
import type { BoardRow, ProfileRow, TaskRow } from '../domain/types'
import { getBoardById, listActiveProfiles, listTasksByBoard } from '../repositories/boards'
import { DESCRIPTION_PREVIEW_LENGTH, toIso, toTaskDto } from './task-dto'

export { DESCRIPTION_PREVIEW_LENGTH }

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
      .map((task) =>
        toTaskDto(task, profileMap.get(task.assignee_profile_id ?? ''), {
          truncate: true,
        }),
      )

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
