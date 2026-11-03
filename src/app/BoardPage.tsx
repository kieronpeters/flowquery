import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import type { BoardView, ProfileDto, TaskDto } from '../shared/api-types'
import { COLUMNS, type ColumnKey } from '../shared/columns'
import { ActivityFeed } from './ActivityFeed'
import { applyMove, locate } from './board-state'
import { TaskDrawer, type MoveDirection } from './TaskDrawer'

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

function CardBody({ task }: { task: TaskDto }) {
  return (
    <>
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
    </>
  )
}

function SortableCard({ task, onOpen }: { task: TaskDto; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'card-item dragging' : 'card-item'}
    >
      <button className="card" type="button" onClick={onOpen} {...attributes} {...listeners}>
        <CardBody task={task} />
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
  const [notice, setNotice] = useState<string | null>(null)
  // The card being dragged, rendered in a portal so it follows the cursor
  // instead of being clipped by the column or board scroll container.
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null)
  // Bumped whenever board data changes, so the feed refetches.
  const [activityKey, setActivityKey] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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
      setActivityKey((key) => key + 1)
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

  /**
   * Optimistic move: show the result immediately, then replace the board with
   * the server's authoritative ordering. On conflict or failure, refetch rather
   * than trying to repair the optimistic view locally.
   */
  const performMove = useCallback(
    async (taskId: string, status: ColumnKey, position: number, expectedVersion: number) => {
      setState((current) =>
        current.kind === 'ok'
          ? { kind: 'ok', view: applyMove(current.view, taskId, status, position) }
          : current,
      )

      try {
        const response = await fetch(
          `/api/v1/boards/${boardId}/tasks/${encodeURIComponent(taskId)}/move`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ status, position, expectedVersion }),
          },
        )

        if (response.status === 409) {
          setNotice('Someone changed that task first, so the board was refreshed.')
          await load({ silent: true })
          return
        }

        if (!response.ok) {
          setNotice('That move did not stick. The board was refreshed.')
          await load({ silent: true })
          return
        }

        const body = (await response.json()) as { board: BoardView }
        setState({ kind: 'ok', view: body.board })
        setActivityKey((key) => key + 1)
        setNotice(null)
      } catch {
        setNotice('The board could not be reached. Refresh to resync.')
        await load({ silent: true })
      }
    },
    [boardId, load],
  )

  function handleDragStart(event: DragStartEvent) {
    if (state.kind !== 'ok') return
    const id = String(event.active.id)
    const task = state.view.columns.flatMap((column) => column.tasks).find((item) => item.id === id)
    setActiveTask(task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)

    const { active, over } = event
    if (!over || state.kind !== 'ok') return

    const view = state.view
    const activeId = String(active.id)
    const overId = String(over.id)

    const task = view.columns.flatMap((column) => column.tasks).find((item) => item.id === activeId)
    if (!task) return

    const overColumn =
      view.columns.find((column) => column.key === overId) ??
      view.columns.find((column) => column.tasks.some((item) => item.id === overId))
    if (!overColumn) return

    const position =
      overColumn.key === overId
        ? overColumn.tasks.length
        : overColumn.tasks.findIndex((item) => item.id === overId)

    if (overColumn.key === task.status && position === task.position) return

    void performMove(activeId, overColumn.key, position, task.version)
  }

  /** Keyboard alternative to dragging (TASK-008). */
  const moveRelative = useCallback(
    async (taskId: string, direction: MoveDirection): Promise<string | null> => {
      if (state.kind !== 'ok') return 'The board is still loading.'

      const view = state.view
      const task = view.columns.flatMap((column) => column.tasks).find((item) => item.id === taskId)
      const here = locate(view, taskId)
      if (!task || !here) return 'That task is no longer on the board.'

      const columnIndex = COLUMNS.findIndex((column) => column.key === here.status)

      if (direction === 'up' || direction === 'down') {
        const position = direction === 'up' ? here.index - 1 : here.index + 1
        if (position < 0) return 'Already at the top of this column.'
        if (position >= here.count) return 'Already at the bottom of this column.'
        await performMove(taskId, here.status, position, task.version)
        return null
      }

      const targetIndex = direction === 'left' ? columnIndex - 1 : columnIndex + 1
      if (targetIndex < 0) return 'Already in the first column.'
      if (targetIndex >= COLUMNS.length) return 'Already in the last column.'

      const targetKey = COLUMNS[targetIndex]!.key
      const targetColumn = view.columns.find((column) => column.key === targetKey)
      if (!targetColumn) return 'That column could not be found.'

      await performMove(taskId, targetKey, targetColumn.tasks.length, task.version)
      return null
    },
    [performMove, state],
  )

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
          {board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'} · drag a card, or open it and
          use the move buttons
        </p>
      </div>

      {notice && (
        <p className="alert alert-neutral" role="status">
          {notice}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="board">
          {columns.map((column) => (
            <Column
              key={column.key}
              column={column}
              onOpen={(taskId) => setDrawer({ kind: 'edit', taskId })}
              onAdd={() => setDrawer({ kind: 'create', status: column.key })}
            />
          ))}
        </div>

        {/*
          The card that follows the cursor. Rendered in a portal at the document
          level, so a scroll container (the board uses overflow-x: auto) cannot
          clip it when it leaves its own column.
        */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="card drag-overlay">
              <CardBody task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ActivityFeed boardId={boardId ?? ''} refreshKey={activityKey} profiles={profiles} />

      {drawer && boardId && (
        <TaskDrawer
          boardId={boardId}
          mode={drawer}
          profiles={profiles}
          onClose={() => setDrawer(null)}
          onChanged={() => load({ silent: true })}
          onMoveRelative={(direction) =>
            drawer.kind === 'edit' ? moveRelative(drawer.taskId, direction) : Promise.resolve(null)
          }
        />
      )}
    </main>
  )
}

function Column({
  column,
  onOpen,
  onAdd,
}: {
  column: BoardView['columns'][number]
  onOpen: (taskId: string) => void
  onAdd: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key })

  return (
    <section
      ref={setNodeRef}
      className={isOver ? 'column over' : 'column'}
      aria-labelledby={`column-${column.key}`}
    >
      <header className="column-header">
        <h2 id={`column-${column.key}`}>{column.name}</h2>
        <span className="count">{column.taskCount}</span>
      </header>

      <SortableContext
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        {column.tasks.length === 0 ? (
          <p className="empty">Drop a task here</p>
        ) : (
          <ul className="card-list">
            {column.tasks.map((task) => (
              <SortableCard key={task.id} task={task} onOpen={() => onOpen(task.id)} />
            ))}
          </ul>
        )}
      </SortableContext>

      <button className="add-task" type="button" onClick={onAdd}>
        + Add task
      </button>
    </section>
  )
}
