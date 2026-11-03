import type { D1Database } from '@cloudflare/workers-types'

import type { TaskDto } from '../../shared/api-types'
import { COLUMN_KEYS, isColumnKey, type ColumnKey } from '../../shared/columns'
import type { TaskRow } from '../domain/types'
import { randomId } from '../lib/ids'
import { activityStatement, type ActivityEventInput } from '../repositories/activity'
import { getBoardById, listActiveProfiles } from '../repositories/boards'
import {
  deleteTask,
  getActiveProfile,
  getTaskById,
  guardedMove,
  insertTask,
  listColumnTaskIds,
  listTasksWithFilters,
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

/**
 * Best-effort history.
 *
 * If this fails the user's action still stands: failing the request would make
 * a successful edit look broken and invite a retry that duplicates it. The
 * failure is logged loudly instead. Recorded as a known trade-off in the
 * handoff — one history row is worth less than a trustworthy edit.
 */
async function recordActivity(db: D1Database, event: ActivityEventInput): Promise<void> {
  try {
    await activityStatement(db, event).run()
  } catch (error) {
    console.warn('Activity could not be recorded', error instanceof Error ? error.name : 'unknown')
  }
}

function eventFor(
  input: {
    boardId: string
    taskId: string | null
    actor: Actor
    now: number
  },
  eventType: string,
  payload: Record<string, unknown>,
): ActivityEventInput {
  return {
    id: randomId('act'),
    boardId: input.boardId,
    taskId: input.taskId,
    actorType: input.actor.type,
    actorId: input.actor.id,
    actorName: input.actor.name,
    eventType,
    payload,
    createdAt: input.now,
  }
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

  await recordActivity(
    db,
    eventFor({ boardId: input.boardId, taskId: id, actor: input.actor, now }, 'task.created', {
      title: title.value,
      status: status.value,
    }),
  )

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
    actor: Actor
    now?: number
  },
): Promise<UpdateResult> {
  const existing = await getTaskById(db, input.boardId, input.taskId)
  if (!existing) return { kind: 'not_found' }

  const now = input.now ?? Date.now()

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
    now,
  })

  if (outcome === 'not_found') return { kind: 'not_found' }
  if (outcome === 'conflict') return { kind: 'conflict' }

  await recordChanges(db, {
    boardId: input.boardId,
    taskId: input.taskId,
    actor: input.actor,
    now,
    existing,
    update,
  })

  const updated = await getTaskById(db, input.boardId, input.taskId)
  if (!updated) return { kind: 'not_found' }

  return { kind: 'ok', task: await toDto(db, updated) }
}

/** One event per field that actually changed, and nothing for the rest. */
async function recordChanges(
  db: D1Database,
  input: {
    boardId: string
    taskId: string
    actor: Actor
    now: number
    existing: TaskRow
    update: Parameters<typeof updateTask>[1]['fields']
  },
): Promise<void> {
  const base = { boardId: input.boardId, taskId: input.taskId, actor: input.actor, now: input.now }
  const { existing, update } = input
  const events: ActivityEventInput[] = []

  if (update.title !== undefined && update.title !== existing.title) {
    events.push(eventFor(base, 'task.title_changed', { from: existing.title, to: update.title }))
  }

  if (update.description !== undefined && update.description !== existing.description) {
    // The body is not stored in the payload: it can be 20,000 characters and
    // a feed is not a place for it.
    events.push(eventFor(base, 'task.description_changed', {}))
  }

  if (update.priority !== undefined && update.priority !== existing.priority) {
    events.push(
      eventFor(base, 'task.priority_changed', { from: existing.priority, to: update.priority }),
    )
  }

  if (update.dueDate !== undefined && update.dueDate !== existing.due_date) {
    events.push(
      eventFor(base, 'task.due_date_changed', { from: existing.due_date, to: update.dueDate }),
    )
  }

  if (
    update.assigneeProfileId !== undefined &&
    update.assigneeProfileId !== existing.assignee_profile_id
  ) {
    events.push(
      eventFor(base, 'task.assignee_changed', {
        from: existing.assignee_profile_id,
        to: update.assigneeProfileId,
      }),
    )
  }

  if (update.status !== undefined && update.status !== existing.status) {
    events.push(eventFor(base, 'task.moved', { from: existing.status, to: update.status }))
  }

  for (const event of events) await recordActivity(db, event)
}

export type ListResult =
  { kind: 'ok'; tasks: TaskDto[]; truncated: boolean } | { kind: 'invalid'; message: string }

export const TASK_LIST_DEFAULT_LIMIT = 50
export const TASK_LIST_MAX_LIMIT = 100
export const SEARCH_MAX_BYTES = 40

/**
 * Filtered task list for the agent API.
 *
 * Descriptions are truncated (DEC-025) and the response says so, so Bob knows
 * to fetch a single task when the full text matters.
 */
export async function listTasks(
  db: D1Database,
  input: {
    boardId: string
    query: {
      status?: string
      priority?: string
      assignee?: string
      q?: string
      limit?: string
    }
  },
): Promise<ListResult> {
  let limit = TASK_LIST_DEFAULT_LIMIT
  if (input.query.limit !== undefined && input.query.limit !== '') {
    const parsed = Number(input.query.limit)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > TASK_LIST_MAX_LIMIT) {
      return { kind: 'invalid', message: `limit must be 1-${TASK_LIST_MAX_LIMIT}.` }
    }
    limit = parsed
  }

  let status: ColumnKey | undefined
  if (input.query.status) {
    const parsed = validateStatus(input.query.status)
    if (!parsed.ok) return { kind: 'invalid', message: parsed.message }
    status = parsed.value
  }

  let priority: string | undefined
  if (input.query.priority) {
    const parsed = validatePriority(input.query.priority)
    if (!parsed.ok) return { kind: 'invalid', message: parsed.message }
    priority = parsed.value
  }

  let assigneeProfileId: string | null | undefined
  if (input.query.assignee === 'none' || input.query.assignee === 'unassigned') {
    assigneeProfileId = null
  } else if (input.query.assignee) {
    assigneeProfileId = input.query.assignee
  }

  let q: string | undefined
  if (input.query.q) {
    // D1 caps a LIKE pattern at 50 bytes; the wildcards need room too.
    if (new TextEncoder().encode(input.query.q).length > SEARCH_MAX_BYTES) {
      return { kind: 'invalid', message: `q must be ${SEARCH_MAX_BYTES} bytes or fewer.` }
    }
    q = input.query.q
  }

  const [rows, profiles] = await Promise.all([
    listTasksWithFilters(db, input.boardId, { status, priority, assigneeProfileId, q, limit }),
    listActiveProfiles(db),
  ])

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  return {
    kind: 'ok',
    tasks: rows.map((row) =>
      toTaskDto(row, profileMap.get(row.assignee_profile_id ?? ''), { truncate: true }),
    ),
    truncated: rows.length === limit,
  }
}

export async function removeTask(
  db: D1Database,
  input: { boardId: string; taskId: string; actor: Actor; now?: number },
): Promise<boolean> {
  const task = await getTaskById(db, input.boardId, input.taskId)
  if (!task) return false

  const deleted = await deleteTask(db, input.boardId, input.taskId)
  if (!deleted) return false

  await recordActivity(
    db,
    eventFor(
      {
        boardId: input.boardId,
        // Deliberately null: a deletion event that pointed at the task would be
        // removed by the same cascade that removes the task, leaving the board
        // with no record that it ever existed.
        taskId: null,
        actor: input.actor,
        now: input.now ?? Date.now(),
      },
      'task.deleted',
      { title: task.title },
    ),
  )

  return true
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
    actor: Actor
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

  // Reordering within a column is not history worth recording; changing column is.
  if (!sameColumn) {
    await recordActivity(
      db,
      eventFor(
        { boardId: input.boardId, taskId: input.taskId, actor: input.actor, now },
        'task.moved',
        { from: task.status, to: target },
      ),
    )
  }

  const [board, updated] = await Promise.all([
    loadBoardView(db, input.boardId),
    getTaskById(db, input.boardId, input.taskId),
  ])

  if (!board || !updated) return { kind: 'not_found' }

  return { kind: 'ok', board, task: await toDto(db, updated) }
}
