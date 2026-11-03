import type { D1Database } from '@cloudflare/workers-types'

import type { BoardSummary, BoardTheme } from '../../shared/api-types'
import { isColumnKey } from '../../shared/columns'
import type { BoardWithCountRow } from '../repositories/boards'
import {
  deleteBoardById,
  getBoardById,
  insertBoard,
  listBoardsWithTaskCounts,
  updateBoardName,
  updateBoardTheme,
} from '../repositories/boards'
import { randomId } from '../lib/ids'

export const BOARD_NAME_MAX = 120

export type NameValidation = { ok: true; value: string } | { ok: false; message: string }

/**
 * One rule, one place. The UI may pre-check, but this is the check that counts.
 */
export function validateBoardName(raw: unknown): NameValidation {
  if (typeof raw !== 'string') return { ok: false, message: 'Name must be a string.' }

  const value = raw.trim()
  if (value.length === 0) return { ok: false, message: 'Name cannot be empty.' }
  if (value.length > BOARD_NAME_MAX) {
    return { ok: false, message: `Name must be ${BOARD_NAME_MAX} characters or fewer.` }
  }
  // Control characters would break the UI and the confirmation prompt.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return { ok: false, message: 'Name cannot contain control characters.' }
  }

  return { ok: true, value }
}

function toSummary(row: BoardWithCountRow): BoardSummary {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    taskCount: row.task_count,
  }
}

export async function listBoards(db: D1Database): Promise<BoardSummary[]> {
  const rows = await listBoardsWithTaskCounts(db)
  return rows.map(toSummary)
}

export async function createBoard(
  db: D1Database,
  input: { name: string; createdBy: string; now?: number },
): Promise<BoardSummary> {
  const now = input.now ?? Date.now()
  const board = {
    id: randomId('brd'),
    name: input.name,
    createdBy: input.createdBy,
    now,
  }

  await insertBoard(db, board)

  return {
    id: board.id,
    name: board.name,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    taskCount: 0,
  }
}

export type RenameResult = { kind: 'ok' } | { kind: 'not_found' }

export async function renameBoard(
  db: D1Database,
  input: { boardId: string; name: string; now?: number },
): Promise<RenameResult> {
  const updated = await updateBoardName(db, {
    boardId: input.boardId,
    name: input.name,
    now: input.now ?? Date.now(),
  })

  return updated ? { kind: 'ok' } : { kind: 'not_found' }
}

export type DeleteResult =
  | { kind: 'ok'; boardName: string }
  | { kind: 'not_found' }
  | { kind: 'name_mismatch'; boardName: string }

const HEX = /^#[0-9a-f]{6}$/i

export type ThemeResult =
  { kind: 'ok'; theme: BoardTheme } | { kind: 'invalid'; message: string } | { kind: 'not_found' }

/**
 * Validates and stores a board's appearance.
 *
 * Colours are restricted to six-digit hex. Accepting arbitrary CSS would allow
 * `url(...)` values, which turn a colour field into a request to a third party
 * — and a screenshot of someone's board is not the place to discover that.
 */
export async function setBoardTheme(
  db: D1Database,
  input: { boardId: string; body: unknown; now?: number },
): Promise<ThemeResult> {
  const body = input.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { kind: 'invalid', message: 'Expected a theme object.' }
  }

  const record = body as Record<string, unknown>
  const allowed = new Set(['background', 'columns', 'tickets', 'activity'])

  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) return { kind: 'invalid', message: `Unknown theme key: ${key}.` }
  }

  const theme: BoardTheme = {}

  if (record.background !== undefined && record.background !== null) {
    if (typeof record.background !== 'string' || !HEX.test(record.background)) {
      return { kind: 'invalid', message: 'background must be a #rrggbb colour.' }
    }
    theme.background = record.background.toLowerCase()
  }

  if (record.columns !== undefined && record.columns !== null) {
    if (typeof record.columns !== 'object' || Array.isArray(record.columns)) {
      return { kind: 'invalid', message: 'columns must be an object.' }
    }

    const columns: NonNullable<BoardTheme['columns']> = {}

    for (const [key, value] of Object.entries(record.columns as Record<string, unknown>)) {
      if (!isColumnKey(key)) {
        return { kind: 'invalid', message: `Unknown column: ${key}.` }
      }
      if (value === null) continue
      if (typeof value !== 'string' || !HEX.test(value)) {
        return { kind: 'invalid', message: `Column ${key} must be a #rrggbb colour.` }
      }
      columns[key] = value.toLowerCase()
    }

    theme.columns = columns
  }

  if (record.tickets !== undefined && record.tickets !== null) {
    if (typeof record.tickets !== 'string' || !HEX.test(record.tickets)) {
      return { kind: 'invalid', message: 'tickets must be a #rrggbb colour.' }
    }
    theme.tickets = record.tickets.toLowerCase()
  }

  if (record.activity !== undefined && record.activity !== null) {
    if (typeof record.activity !== 'string' || !HEX.test(record.activity)) {
      return { kind: 'invalid', message: 'activity must be a #rrggbb colour.' }
    }
    theme.activity = record.activity.toLowerCase()
  }

  const updated = await updateBoardTheme(db, {
    boardId: input.boardId,
    theme,
    now: input.now ?? Date.now(),
  })

  return updated ? { kind: 'ok', theme } : { kind: 'not_found' }
}

/**
 * Permanent deletion (DEC-007). The caller must echo the exact current name;
 * that is the confirmation step, enforced here so the UI cannot skip it.
 */
export async function deleteBoard(
  db: D1Database,
  input: { boardId: string; confirmName: unknown },
): Promise<DeleteResult> {
  const board = await getBoardById(db, input.boardId)
  if (!board) return { kind: 'not_found' }

  if (typeof input.confirmName !== 'string' || input.confirmName !== board.name) {
    return { kind: 'name_mismatch', boardName: board.name }
  }

  const deleted = await deleteBoardById(db, input.boardId)
  return deleted ? { kind: 'ok', boardName: board.name } : { kind: 'not_found' }
}
