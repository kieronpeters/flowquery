import type { D1Database } from '@cloudflare/workers-types'

import type { BoardTheme, BoardView } from '../../shared/api-types'
import { COLUMNS } from '../../shared/columns'
import type { BoardRow, ProfileRow, TaskRow } from '../domain/types'
import { getBoardById, listActiveProfiles, listTasksByBoard } from '../repositories/boards'
import { DESCRIPTION_PREVIEW_LENGTH, toIso, toTaskDto } from './task-dto'

export { DESCRIPTION_PREVIEW_LENGTH }

/** Never let a malformed stored document break a board read. */
export function parseTheme(raw: string | undefined): BoardTheme {
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const theme: BoardTheme = {}
    const record = parsed as Record<string, unknown>

    if (typeof record.background === 'string') theme.background = record.background

    if (record.columns && typeof record.columns === 'object' && !Array.isArray(record.columns)) {
      const columns: BoardTheme['columns'] = {}
      for (const column of COLUMNS) {
        const value = (record.columns as Record<string, unknown>)[column.key]
        if (typeof value === 'string') columns[column.key] = value
      }
      theme.columns = columns
    }

    if (typeof record.tickets === 'string') theme.tickets = record.tickets

    if (typeof record.activity === 'string') theme.activity = record.activity

    return theme
  } catch {
    return {}
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
    theme: parseTheme(board.theme),
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
