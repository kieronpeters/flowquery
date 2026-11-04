import type { ColumnKey } from './columns'

/**
 * Wire shapes returned by `/api/v1`. Shared by the Worker and the React app so
 * a change to the contract breaks the build on both sides rather than at
 * runtime.
 */

export type BoardSummary = {
  id: string
  name: string
  /** Optional "what this board is for". Null when nobody has written one. */
  description: string | null
  createdAt: string
  updatedAt: string
  taskCount: number
}

export type AssigneeSummary = {
  id: string
  displayName: string
  roleTitle: string
}

export type TaskDto = {
  id: string
  title: string
  description: string
  descriptionTruncated: boolean
  status: ColumnKey
  position: number
  priority: string
  assignee: AssigneeSummary | null
  dueDate: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export type ColumnView = {
  key: ColumnKey
  name: string
  position: number
  taskCount: number
  tasks: TaskDto[]
}

export type BoardView = {
  board: BoardSummary
  columns: ColumnView[]
  /** Per-board colours. Empty object means "use the defaults". */
  theme: BoardTheme
}

export type BoardTheme = {
  /** Page background behind the board. */
  background?: string
  /** One colour per column, keyed by column. */
  columns?: Partial<Record<ColumnKey, string>>
  /** Card background for the whole board. Falls back to a tint of the column. */
  tickets?: string
  /** Background of the activity box at the foot of the board. */
  activity?: string
}

export type ProfileDto = {
  id: string
  displayName: string
  roleTitle: string
  kind: 'human' | 'ai' | 'contractor'
  avatarPath: string | null
}

export type CommentDto = {
  id: string
  taskId: string
  authorType: 'human' | 'agent'
  authorName: string
  body: string
  createdAt: string
}

export type ActivityDto = {
  id: string
  taskId: string | null
  actorType: 'human' | 'agent' | 'system'
  actorName: string
  eventType: string
  payload: Record<string, unknown>
  createdAt: string
}

export type ActivityPageDto = {
  events: ActivityDto[]
  nextBefore: number | null
  /** Everyone who has acted on this board, whether or not they match the filter. */
  actors: ActivityActorDto[]
}

export type ActivityActorDto = {
  name: string
  count: number
}

export type ApiError = {
  error: {
    code: string
    message: string
  }
}
