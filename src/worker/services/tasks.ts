import type { D1Database } from '@cloudflare/workers-types'

import type { TaskDto } from '../../shared/api-types'
import { COLUMN_KEYS, isColumnKey, type ColumnKey } from '../../shared/columns'
import type { TaskRow } from '../domain/types'
import { randomId } from '../lib/ids'
import { getBoardById } from '../repositories/boards'
import {
  deleteTask,
  getActiveProfile,
  getTaskById,
  guardedMove,
  insertTask,
  listColumnTaskIds,
  nextPosition,
  renumberColumn,
  updateTask,
} from '../repositories/tasks'
import { loadBoardView } from './board-view'
import { moveWithin } from '../../shared/ordering'
import { toTaskDto } from './task-dto'

export const TITLE_MAX = 200
export const DESCRIPTION_MAX = 20_000

export const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

export type FieldErrors = Record<string, string>

export type Actor = {
  id: string
  name: string
  type: 'human' | 'agent'
}

function isControlFree(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !/[\u0000-\u001f\u007f]/.test(value)
}

export function validateTitle(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== 'string') return { ok: false, message: 'Title must be a string.' }
  const value = raw.trim()
  if (value.length === 0) return { ok: false, message: 'Title is required.' }
  if (value.length > TITLE_MAX) {
    return { ok: false, message: `Title must be ${TITLE_MAX} characters or fewer.` }
  }
  if (!isControlFree(value)) return { ok: false, message: 'Title contains control characters.' }
  return { ok: true, value }
}

export function validateDescription(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: '' }
  if (typeof raw !== 'string') return { ok: false, message: 'Description must be a string.' }
  if (raw.length > DESCRIPTION_MAX) {
    return { ok: false, message: `Description must be ${DESCRIPTION_MAX} characters or fewer.` }
  }
  return { ok: true, value: raw }
}

export function validatePriority(
  raw: unknown,
): { ok: true; value: Priority } | { ok: false; message: string } {
  if (raw === undefined) return { ok: true, value: 'none' }
  if (typeof raw !== 'string' || !PRIORITIES.includes(raw as Priority)) {
    return { ok: false, message: `Priority must be one of: ${PRIORITIES.join(', ')}.` }
  }
  return { ok: true, value: raw as Priority }
}

export function validateStatus(
  raw: unknown,
): { ok: true; value: ColumnKey } | { ok: false; message: string } {
  if (typeof raw !== 'string' || !isColumnKey(raw)) {
    return { ok: false, message: `Status must be one of: ${COLUMN_KEYS.join(', ')}.` }
  }
  return { ok: true, value: raw }
}

/** Calendar date only (TASK-005): no time, no timezone. */
export function validateDueDate(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { ok: false, message: 'Due date must be a calendar date in YYYY-MM-DD form.' }
  }

  const parsed = new Date(`${raw}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    return { ok: false, message: 'That is not a real calendar date.' }
  }

  return { ok: true, value: raw }
}

async function resolveAssignee(
  db: D1Database,
  raw: unknown,
): Promise<{ ok: true; value: string | null } | { ok: false; message: string }> {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, message: 'Assignee must be a profile id.' }

  const profile = await getActiveProfile(db, raw)
  if (!profile) return { ok: false, message: 'Unknown assignee profile.' }

  return { ok: true, value: profile.id }
}

async function toDto(db: D1Database, task: TaskRow): Promise<TaskDto> {
  const profile = task.assignee_profile_id
    ? await getActiveProfile(db, task.assignee_profile_id)
    : null

  return toTaskDto(task, profile ?? undefined, { truncate: false })
}

export type CreateResult =
  | { kind: 'ok'; task: TaskDto }
  | { kind: 'invalid'; fields: FieldErrors }
  | { kind: 'board_not_found' }

export async function createTask(
  db: D1Database,
  input: { boardId: string; body: Record<string, unknown>; actor: Actor; now?: number },
): Promise<CreateResult> {
  const board = await getBoardById(db, input.boardId)
  if (!board) return { kind: 'board_not_found' }

  const fields: FieldErrors = {}
  const title = validateTitle(input.body.title)
  if (!title.ok) fields.title = title.message

  const description = validateDescription(input.body.description)
  if (!description.ok) fields.description = description.message

  const priority = validatePriority(input.body.priority)
  if (!priority.ok) fields.priority = priority.message

  const status = validateStatus(input.body.status ?? 'backlog')
  if (!status.ok) fields.status = status.message

  const dueDate = validateDueDate(input.body.dueDate)
  if (!dueDate.ok) fields.dueDate = dueDate.message

  const assignee = await resolveAssignee(db, input.body.assigneeProfileId)
  if (!assignee.ok) fields.assigneeProfileId = assignee.message

  if (!title.ok || !description.ok || !priority.ok || !status.ok || !dueDate.ok || !assignee.ok) {
    return { kind: 'invalid', fields }
  }

  const now = input.now ?? Date.now()
  const id = randomId('tsk')
  const position = await nextPosition(db, input.boardId, status.value)

  await insertTask(db, {
    id,
    boardId: input.boardId,
    title: title.value,
    description: description.value,
    status: status.value,
    position,
    priority: priority.value,
    assigneeProfileId: assignee.value,
    dueDate: dueDate.value,
    createdAt: now,
    createdByType: input.actor.type,
    createdById: input.actor.id,
    createdByName: input.actor.name,
  })

  const created = await getTaskById(db, input.boardId, id)
  if (!created) throw new Error('Task creation did not persist')

  return { kind: 'ok', task: await toDto(db, created) }
}

export async function readTask(
  db: D1Database,
  input: { boardId: string; taskId: string },
): Promise<TaskDto | null> {
  const task = await getTaskById(db, input.boardId, input.taskId)
  return task ? toDto(db, task) : null
}

export type UpdateResult =
  | { kind: 'ok'; task: TaskDto }
  | { kind: 'invalid'; fields: FieldErrors }
  | { kind: 'not_found' }
  | { kind: 'conflict' }

/**
 * Partial update. When `status` changes, the task is appended to the end of the
 * target column: a move is a status change plus a position, and the position
 * must never be left dangling in a column it no longer belongs to.
 */
export async function editTask(
  db: D1Database,
  input: {
    boardId: string
    taskId: string
    body: Record<string, unknown>
    now?: number
  },
): Promise<UpdateResult> {
  const existing = await getTaskById(db, input.boardId, input.taskId)
  if (!existing) return { kind: 'not_found' }

  const fields: FieldErrors = {}
  const update: Parameters<typeof updateTask>[1]['fields'] = {}

  if ('title' in input.body) {
    const title = validateTitle(input.body.title)
    if (title.ok) update.title = title.value
    else fields.title = title.message
  }

  if ('description' in input.body) {
    const description = validateDescription(input.body.description)
    if (description.ok) update.description = description.value
    else fields.description = description.message
  }

  if ('priority' in input.body) {
    const priority = validatePriority(input.body.priority)
    if (priority.ok) update.priority = priority.value
    else fields.priority = priority.message
  }

  if ('dueDate' in input.body) {
    const dueDate = validateDueDate(input.body.dueDate)
    if (dueDate.ok) update.dueDate = dueDate.value
    else fields.dueDate = dueDate.message
  }

  if ('assigneeProfileId' in input.body) {
    const assignee = await resolveAssignee(db, input.body.assigneeProfileId)
    if (assignee.ok) update.assigneeProfileId = assignee.value
    else fields.assigneeProfileId = assignee.message
  }

  if ('status' in input.body) {
    const status = validateStatus(input.body.status)
    if (!status.ok) {
      fields.status = status.message
    } else {
      update.status = status.value
      if (status.value !== existing.status) {
        update.position = await nextPosition(db, input.boardId, status.value)
      }
    }
  }

  if (Object.keys(fields).length > 0) return { kind: 'invalid', fields }

  let expectedVersion: number | undefined
  if ('expectedVersion' in input.body) {
    const raw = input.body.expectedVersion
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
      return { kind: 'invalid', fields: { expectedVersion: 'Must be a positive integer.' } }
    }
    expectedVersion = raw
  }

  const outcome = await updateTask(db, {
    boardId: input.boardId,
    taskId: input.taskId,
    fields: update,
    expectedVersion,
    now: input.now ?? Date.now(),
  })

  if (outcome === 'not_found') return { kind: 'not_found' }
  if (outcome === 'conflict') return { kind: 'conflict' }

  const updated = await getTaskById(db, input.boardId, input.taskId)
  if (!updated) return { kind: 'not_found' }

  return { kind: 'ok', task: await toDto(db, updated) }
}

export async function removeTask(
  db: D1Database,
  input: { boardId: string; taskId: string },
): Promise<boolean> {
  return await deleteTask(db, input.boardId, input.taskId)
}

export type MoveResult =
  | { kind: 'ok'; board: Awaited<ReturnType<typeof loadBoardView>>; task: TaskDto }
  | { kind: 'invalid'; fields: FieldErrors }
  | { kind: 'not_found' }
  | { kind: 'conflict' }

/**
 * Moves a task to a column and index (TASK-007, TASK-009).
 *
 * Order matters:
 *  1. the version-guarded update runs first, so a stale client changes nothing;
 *  2. only then are the affected columns renumbered, and idempotently.
 */
export async function moveTask(
  db: D1Database,
  input: {
    boardId: string
    taskId: string
    body: Record<string, unknown>
    now?: number
  },
): Promise<MoveResult> {
  const fields: FieldErrors = {}

  const status = validateStatus(input.body.status)
  if (!status.ok) fields.status = status.message

  const rawPosition = input.body.position
  if (typeof rawPosition !== 'number' || !Number.isInteger(rawPosition) || rawPosition < 0) {
    fields.position = 'Position must be a non-negative integer.'
  }

  let expectedVersion: number | undefined
  if ('expectedVersion' in input.body) {
    const raw = input.body.expectedVersion
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
      fields.expectedVersion = 'Must be a positive integer.'
    } else {
      expectedVersion = raw
    }
  }

  if (!status.ok || Object.keys(fields).length > 0) return { kind: 'invalid', fields }

  const task = await getTaskById(db, input.boardId, input.taskId)
  if (!task) return { kind: 'not_found' }

  const target = status.value
  const sameColumn = target === task.status
  const now = input.now ?? Date.now()

  // Works for both cases: within a column the id is removed then reinserted;
  // across columns it is simply inserted at the requested index.
  const finalTarget = moveWithin(
    await listColumnTaskIds(db, input.boardId, target),
    input.taskId,
    rawPosition as number,
  )

  const movedPosition = finalTarget.indexOf(input.taskId)
  if (movedPosition === -1) return { kind: 'not_found' }

  const outcome = await guardedMove(db, {
    boardId: input.boardId,
    taskId: input.taskId,
    status: target,
    position: movedPosition,
    expectedVersion,
    now,
  })

  if (outcome === 'not_found') return { kind: 'not_found' }
  if (outcome === 'conflict') return { kind: 'conflict' }

  if (!sameColumn) {
    const sourceIds = await listColumnTaskIds(db, input.boardId, task.status)
    await renumberColumn(
      db,
      input.boardId,
      task.status,
      sourceIds.filter((id) => id !== input.taskId),
    )
  }

  await renumberColumn(db, input.boardId, target, finalTarget)

  const [board, updated] = await Promise.all([
    loadBoardView(db, input.boardId),
    getTaskById(db, input.boardId, input.taskId),
  ])

  if (!board || !updated) return { kind: 'not_found' }

  return { kind: 'ok', board, task: await toDto(db, updated) }
}
