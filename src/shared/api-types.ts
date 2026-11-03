import type { ColumnKey } from './columns'

/**
 * Wire shapes returned by `/api/v1`. Shared by the Worker and the React app so
 * a change to the contract breaks the build on both sides rather than at
 * runtime.
 */

export type BoardSummary = {
  id: string
  name: string
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
}

export type ApiError = {
  error: {
    code: string
    message: string
  }
}
