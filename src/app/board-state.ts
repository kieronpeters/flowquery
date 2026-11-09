import type { BoardView } from '../shared/api-types'
import type { ColumnKey } from '../shared/columns'
import { moveWithin } from '../shared/ordering'

/**
 * A stable fingerprint of everything the board renders.
 *
 * Background refresh uses it to avoid replacing state with an identical view,
 * which would re-render the board and could disturb a scroll or drag for no
 * reason. The server's field order is stable for a given shape, and a false
 * positive only costs one re-render.
 */
export function boardSignature(view: BoardView): string {
  return JSON.stringify(view)
}

/**
 * Optimistic board update for a move.
 *
 * This deliberately mirrors the server's rule — remove, insert at index,
 * renumber both affected columns — so the UI shows the end state immediately.
 * It is reconciled with the server's authoritative view as soon as the request
 * returns; if the two disagree, the server wins.
 */
export function applyMove(
  view: BoardView,
  taskId: string,
  status: ColumnKey,
  position: number,
): BoardView {
  const moving = view.columns.flatMap((column) => column.tasks).find((task) => task.id === taskId)
  if (!moving) return view

  const sourceKey = moving.status
  const targetKey = status

  const idsFor = (key: ColumnKey): string[] => {
    const column = view.columns.find((item) => item.key === key)
    if (!column) return []
    return column.tasks.filter((task) => task.id !== taskId).map((task) => task.id)
  }

  const targetIds = moveWithin(idsFor(targetKey), taskId, position)
  const sourceIds = sourceKey === targetKey ? targetIds : idsFor(sourceKey)

  const byId = new Map(
    view.columns.flatMap((column) => column.tasks).map((task) => [task.id, task]),
  )

  const columns = view.columns.map((column) => {
    const ids = column.key === targetKey ? targetIds : column.key === sourceKey ? sourceIds : null

    if (!ids) return column

    const tasks = ids
      .map((id, index) => {
        const task = byId.get(id)
        if (!task) return null
        return {
          ...task,
          status: column.key,
          position: index,
        }
      })
      .filter((task): task is NonNullable<typeof task> => task !== null)

    return { ...column, tasks, taskCount: tasks.length }
  })

  return { ...view, columns }
}

/** The moved task's current index and column, read from a view. */
export function locate(
  view: BoardView,
  taskId: string,
): { status: ColumnKey; index: number; count: number } | null {
  for (const column of view.columns) {
    const index = column.tasks.findIndex((task) => task.id === taskId)
    if (index !== -1) return { status: column.key, index, count: column.tasks.length }
  }
  return null
}

/**
 * The board without one task, positions renumbered.
 *
 * Used for the optimistic half of undoable deletion: the card disappears at
 * once, and if the reader changes their mind the board is reloaded from the
 * server rather than reconstructed by hand.
 */
export function withoutTask(view: BoardView, taskId: string): BoardView {
  const columns = view.columns.map((column) => {
    const tasks = column.tasks
      .filter((task) => task.id !== taskId)
      .map((task, index) => ({ ...task, position: index }))

    return { ...column, tasks, taskCount: tasks.length }
  })

  const removed = view.columns.some((column) => column.tasks.some((task) => task.id === taskId))

  return {
    ...view,
    board: { ...view.board, taskCount: Math.max(0, view.board.taskCount - (removed ? 1 : 0)) },
    columns,
  }
}
