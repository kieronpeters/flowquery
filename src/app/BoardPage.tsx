import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import type { BoardView, TaskDto } from '../shared/api-types'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; view: BoardView }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }

const PRIORITY_LABELS: Record<string, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

function formatDueDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function TaskCard({ task }: { task: TaskDto }) {
  return (
    <li className="card">
      <h3 className="card-title">{task.title}</h3>

      {task.description && (
        <p className="card-description">
          {task.description}
          {task.descriptionTruncated && <span className="truncated"> …</span>}
        </p>
      )}

      <ul className="card-meta">
        <li className={`priority priority-${task.priority}`}>
          {PRIORITY_LABELS[task.priority] ?? task.priority}
        </li>
        {task.assignee && <li>{task.assignee.displayName}</li>}
        {task.dueDate && <li>Due {formatDueDate(task.dueDate)}</li>}
      </ul>
    </li>
  )
}

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    if (!boardId) return

    let cancelled = false
    setState({ kind: 'loading' })

    fetch(`/api/v1/boards/${encodeURIComponent(boardId)}`)
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) {
            navigate(`/login?next=${encodeURIComponent(`/boards/${boardId}`)}`, { replace: true })
          }
          return null
        }
        if (response.status === 404) {
          if (!cancelled) setState({ kind: 'not-found' })
          return null
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return (await response.json()) as BoardView
      })
      .then((view) => {
        if (!cancelled && view) setState({ kind: 'ok', view })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [boardId, navigate])

  if (state.kind === 'loading') {
    return (
      <main className="page">
        <p role="status">Loading board…</p>
      </main>
    )
  }

  if (state.kind === 'not-found') {
    return (
      <main className="page">
        <h1>Board not found</h1>
        <p className="lede">It may have been deleted, or the link may be wrong.</p>
        <Link className="button" to="/boards">
          Back to boards
        </Link>
      </main>
    )
  }

  if (state.kind === 'error') {
    return (
      <main className="page">
        <h1>Could not load the board</h1>
        <p className="error">{state.message}</p>
        <button className="button" type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    )
  }

  const { board, columns } = state.view

  return (
    <main className="board-page">
      <Link className="back-link" to="/boards">
        ← All boards
      </Link>

      <div className="board-heading">
        <h1>{board.name}</h1>
        <p className="lede">
          {board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'} · read-only preview
        </p>
      </div>

      <div className="board">
        {columns.map((column) => (
          <section className="column" key={column.key} aria-labelledby={`column-${column.key}`}>
            <header className="column-header">
              <h2 id={`column-${column.key}`}>{column.name}</h2>
              <span className="count">{column.taskCount}</span>
            </header>

            {column.tasks.length === 0 ? (
              <p className="empty">No tasks</p>
            ) : (
              <ul className="card-list">
                {column.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
