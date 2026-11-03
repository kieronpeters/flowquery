import type { D1Database } from '@cloudflare/workers-types'

import type { CommentDto } from '../../shared/api-types'
import { randomId } from '../lib/ids'
import { insertComment, listCommentsByTask } from '../repositories/comments'
import { getTaskById } from '../repositories/tasks'
import type { ActivityEventInput } from '../repositories/activity'
import type { Actor } from './tasks'

export const COMMENT_MAX = 10_000

export type CommentResult =
  { kind: 'ok'; comment: CommentDto } | { kind: 'invalid'; message: string } | { kind: 'not_found' }

/**
 * Comments are stored as text and rendered as text. The body is never
 * interpreted as HTML, and it is bounded so one comment cannot bloat a payload.
 */
export async function addComment(
  db: D1Database,
  input: {
    boardId: string
    taskId: string
    body: unknown
    actor: Actor
    now?: number
  },
): Promise<CommentResult> {
  if (typeof input.body !== 'string') {
    return { kind: 'invalid', message: 'Comment must be a string.' }
  }

  const body = input.body.trim()
  if (body.length === 0) return { kind: 'invalid', message: 'Comment cannot be empty.' }
  if (body.length > COMMENT_MAX) {
    return { kind: 'invalid', message: `Comment must be ${COMMENT_MAX} characters or fewer.` }
  }

  const task = await getTaskById(db, input.boardId, input.taskId)
  if (!task) return { kind: 'not_found' }

  const now = input.now ?? Date.now()
  const id = randomId('cmt')

  const activity: ActivityEventInput = {
    id: randomId('act'),
    boardId: input.boardId,
    taskId: input.taskId,
    actorType: input.actor.type,
    actorId: input.actor.id,
    actorName: input.actor.name,
    eventType: 'comment.added',
    payload: { preview: body.slice(0, 80) },
    createdAt: now,
  }

  await insertComment(db, {
    id,
    taskId: input.taskId,
    authorType: input.actor.type,
    authorId: input.actor.id,
    authorName: input.actor.name,
    body,
    createdAt: now,
    activity,
  })

  return {
    kind: 'ok',
    comment: {
      id,
      taskId: input.taskId,
      authorType: input.actor.type,
      authorName: input.actor.name,
      body,
      createdAt: new Date(now).toISOString(),
    },
  }
}

/** Returns null when the task is not on this board. */
export async function readComments(
  db: D1Database,
  input: { boardId: string; taskId: string },
): Promise<CommentDto[] | null> {
  const task = await getTaskById(db, input.boardId, input.taskId)
  if (!task) return null

  return await listCommentsByTask(db, input)
}
