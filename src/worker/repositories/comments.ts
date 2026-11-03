import type { D1Database } from '@cloudflare/workers-types'

import type { CommentDto } from '../../shared/api-types'
import { activityStatement, type ActivityEventInput } from './activity'

/**
 * Comments are append-only. There is no edit and no delete: a comment that can
 * change is not a record. The task's board scopes every read, so a comment
 * cannot be fetched through the wrong board.
 */

type CommentRow = {
  id: string
  task_id: string
  author_type: 'human' | 'agent'
  author_id: string
  author_name: string
  body: string
  created_at: number
}

export async function insertComment(
  db: D1Database,
  input: {
    id: string
    taskId: string
    authorType: 'human' | 'agent'
    authorId: string
    authorName: string
    body: string
    createdAt: number
    activity?: ActivityEventInput
  },
): Promise<void> {
  const insert = db
    .prepare(
      `INSERT INTO comments (id, task_id, author_type, author_id, author_name, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.taskId,
      input.authorType,
      input.authorId,
      input.authorName,
      input.body,
      input.createdAt,
    )

  // A comment and its activity row describe the same event; write them together.
  const statements = input.activity ? [insert, activityStatement(db, input.activity)] : [insert]

  await db.batch(statements)
}

export async function listCommentsByTask(
  db: D1Database,
  input: { boardId: string; taskId: string },
): Promise<CommentDto[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.task_id, c.author_type, c.author_id, c.author_name, c.body, c.created_at
         FROM comments c
         JOIN tasks t ON t.id = c.task_id
        WHERE c.task_id = ? AND t.board_id = ?
        ORDER BY c.created_at ASC, c.id ASC`,
    )
    .bind(input.taskId, input.boardId)
    .all<CommentRow>()

  return (results ?? []).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    authorType: row.author_type,
    authorName: row.author_name,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}
