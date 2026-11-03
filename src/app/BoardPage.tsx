import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import type { BoardView, ProfileDto, TaskDto } from '../shared/api-types'
import type { ColumnKey } from '../shared/columns'
import { TaskDrawer } from './TaskDrawer'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; view: BoardView }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }

type DrawerState = { kind: 'create'; status: ColumnKey } | { kind: 'edit'; taskId: string } | null

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

function TaskCard({ task, onOpen }: { task: TaskDto; onOpen: () => void }) {
  return (
    <li>
      <button className="card" type="button" onClick={onOpen}>
        <span className="card-title">{task.title}</span>

        {task.description && (
          <span className="card-description">
            {task.description}
            {task.descriptionTruncated && <span className="truncated"> …</span>}
          </span>
        )}

        <span className="card-meta">
          <span className={`priority priority-${task.priority}`}>
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
          {task.assignee && <span>{task.assignee.displayName}</span>}
          {task.dueDate && <span>Due {formatDueDate(task.dueDate)}</span>}
        </span>
      </button>
    </li>
  )
}

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [profiles, setProfiles] = useState<ProfileDto[]>([])
  const [drawer, setDrawer] = useState<DrawerState>(null)

  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!boardId) return
      if (!options.silent) setState({ kind: 'loading' })

      const response = await fetch(`/api/v1/boards/${encodeURIComponent(boardId)}`)

      if (response.status === 401) {
        navigate(`/login?next=${encodeURIComponent(`/boards/${boardId}`)}`, { replace: true })
        return
      }
      if (response.status === 404) {
        setState({ kind: 'not-found' })
        return
      }
      if (!response.ok) {
        setState({ kind: 'error', message: `HTTP ${response.status}` })
        return
      }

      setState({ kind: 'ok', view: (await response.json()) as BoardView })
    },
    [boardId, navigate],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/profiles')
      .then(async (response) =>
        response.ok ? ((await response.json()) as { profiles: ProfileDto[] }) : null,
      )
      .then((body) => {
        if (!cancelled && body) setProfiles(body.profiles)
      })
      .catch(() => null)

    return () => {
      cancelled = true
    }
  }, [])

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
        <button className="button" type="button" onClick={() => void load()}>
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
          {board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'}
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
                  <TaskCard
                    key={task.id}
                    task={task}
                    onOpen={() => setDrawer({ kind: 'edit', taskId: task.id })}
                  />
                ))}
              </ul>
            )}

            <button
              className="add-task"
              type="button"
              onClick={() => setDrawer({ kind: 'create', status: column.key })}
            >
              + Add task
            </button>
          </section>
        ))}
      </div>

      {drawer && boardId && (
        <TaskDrawer
          boardId={boardId}
          mode={drawer}
          profiles={profiles}
          onClose={() => setDrawer(null)}
          onChanged={() => load({ silent: true })}
        />
      )}
    </main>
  )
}
