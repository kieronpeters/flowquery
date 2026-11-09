import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import type { ApiError, BoardTheme, BoardView, ProfileDto, TaskDto } from '../shared/api-types'
import type { ColumnKey } from '../shared/columns'
import { ActivityFeed } from './ActivityFeed'
import { BoardLiveStatus } from './BoardLiveStatus'
import { ProfileAvatar } from './ProfileAvatar'
import { applyMove, boardSignature, withoutTask } from './board-state'
import { TaskDrawer } from './TaskDrawer'
import { ThemePanel } from './ThemePanel'
import { cardBackground, inkFor } from './theme'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; view: BoardView }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }

type DrawerState = { kind: 'create'; status: ColumnKey } | { kind: 'edit'; taskId: string } | null

const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const

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

/** Today in the reader's timezone, as YYYY-MM-DD, to compare against dueDate. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * Overdue means the date has passed and the work is not finished. Comparing
 * date strings is safe here: dueDate is YYYY-MM-DD and so is todayIso, and
 * using the local date avoids a task turning red at the wrong midnight.
 */
export function isOverdue(task: TaskDto, today: string = todayIso()): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return task.dueDate < today
}

type BoardFilters = {
  query: string
  assigneeId: string | null
  priority: string | null
}

export function matchesFilters(task: TaskDto, filters: BoardFilters): boolean {
  const query = filters.query.trim().toLowerCase()
  if (query && !task.title.toLowerCase().includes(query)) return false
  if (filters.assigneeId && task.assignee?.id !== filters.assigneeId) return false
  if (filters.priority && task.priority !== filters.priority) return false
  return true
}

function CardBody({ task, profiles }: { task: TaskDto; profiles: ProfileDto[] }) {
  const assigneeProfile = task.assignee
    ? profiles.find((profile) => profile.id === task.assignee!.id)
    : undefined

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
        {task.assignee && (
          <span className="card-assignee">
            {assigneeProfile && assigneeProfile.kind !== 'human' && (
              <ProfileAvatar
                name={assigneeProfile.displayName}
                profileId={assigneeProfile.id}
                avatarPath={assigneeProfile.avatarPath}
                avatarUrl={assigneeProfile.avatarUrl}
                kind={assigneeProfile.kind}
                size={16}
              />
            )}
            {task.assignee.displayName}
          </span>
        )}
        {task.dueDate && (
          <span className={isOverdue(task) ? 'card-due overdue' : 'card-due'}>
            Due {formatDueDate(task.dueDate)}
          </span>
        )}
      </span>
    </>
  )
}

function SortableCard({
  task,
  boardId,
  profiles,
  draggable = true,
  onOpen,
}: {
  task: TaskDto
  boardId: string
  profiles: ProfileDto[]
  draggable?: boolean
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
  })

  const ticketHref = `/boards/${encodeURIComponent(boardId)}/tickets/${encodeURIComponent(task.id)}`

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'card-item dragging' : 'card-item'}
    >
      {/*
        The card is a real link, as in Jira and Trello: the title is clickable,
        the URL can be copied or opened in a new tab, and the SPA intercepts a
        plain click so the drawer opens without a full page load.
      */}
      <a
        className="card"
        href={ticketHref}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onOpen()
        }}
        {...listeners}
      >
        <CardBody task={task} profiles={profiles} />
      </a>

      {/*
        Touch drag handle. On a phone, dragging has to start somewhere the
        browser will not treat as a scroll, so this is the only element with
        `touch-action: none`. It is hidden on devices with a mouse, where the
        whole card already drags.
      */}
      <button
        className="card-handle"
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${task.title}`}
      >
        ⠿
      </button>
    </li>
  )
}

export function BoardPage() {
  const { boardId, ticketId } = useParams<{ boardId: string; ticketId?: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [profiles, setProfiles] = useState<ProfileDto[]>([])
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [ticketMissing, setTicketMissing] = useState(false)
  // Read by `load` without making the loader depend on the ticket route: a
  // delete closes the ticket URL, and a refetch at that moment would bring the
  // optimistically removed card back.
  const ticketIdRef = useRef(ticketId)
  ticketIdRef.current = ticketId
  const [notice, setNotice] = useState<string | null>(null)
  // The card being dragged, rendered in a portal so it follows the cursor
  // instead of being clipped by the column or board scroll container.
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null)
  const [showTheme, setShowTheme] = useState(false)
  // Which column a phone is showing. Desktop ignores it: every column is
  // visible there and the tab bar is hidden by CSS.
  const [activeColumn, setActiveColumn] = useState<ColumnKey>('backlog')
  // Bumped whenever board data changes, so the feed refetches.
  const [activityKey, setActivityKey] = useState(0)
  // True while a write is in flight; background polling pauses so a refresh
  // cannot land on top of an optimistic move or a save.
  const [mutating, setMutating] = useState(false)

  const [query, setQuery] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [priority, setPriority] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  // The board's one-line description, edited in place under the title.
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')

  // Deletion waits a few seconds so it can be taken back. Nothing is sent to
  // the server until the window closes, so an undo is a no-op, not a restore.
  const [pendingDelete, setPendingDelete] = useState<{
    taskId: string
    title: string
    timer: ReturnType<typeof setTimeout>
  } | null>(null)

  const sensors = useSensors(
    // Mouse: a few pixels of movement starts the drag, as before.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: a short hold starts the drag, so a swipe still scrolls the page.
    // Without this, every finger movement on a card was interpreted as a drag
    // and the board could not be scrolled on a phone at all.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const load = useCallback(
    async (options: { silent?: boolean; background?: boolean; signal?: AbortSignal } = {}) => {
      if (!boardId) return
      if (!options.silent) setState({ kind: 'loading' })

      let response: Response
      try {
        response = await fetch(`/api/v1/boards/${encodeURIComponent(boardId)}`, {
          signal: options.signal,
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (options.background) throw error
        setState({ kind: 'error', message: 'The board could not be reached.' })
        return
      }

      if (response.status === 401) {
        const currentTicket = ticketIdRef.current
        const next = currentTicket
          ? `/boards/${boardId}/tickets/${currentTicket}`
          : `/boards/${boardId}`
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
        return
      }
      if (response.status === 404) {
        setState({ kind: 'not-found' })
        return
      }
      if (!response.ok) {
        if (options.background) throw new Error(`HTTP ${response.status}`)
        setState({ kind: 'error', message: `HTTP ${response.status}` })
        return
      }

      let view: BoardView
      try {
        view = (await response.json()) as BoardView
      } catch (error) {
        if (options.background) throw error
        setState({ kind: 'error', message: 'The board response was not valid.' })
        return
      }

      // Do not replace an identical view: that would re-render the board and
      // could disturb a scroll for no reason.
      setState((current) =>
        current.kind === 'ok' && boardSignature(current.view) === boardSignature(view)
          ? current
          : { kind: 'ok', view },
      )

      // A background poll must not reset the activity feed's pagination; a
      // local change (save, move, delete) should refresh it.
      if (!options.background) setActivityKey((key) => key + 1)
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
   * The URL is the source of truth for an open ticket.
   *
   * A direct link opens the drawer once the board has loaded. Closing the drawer
   * returns to the board route, so refresh and back/forward always agree with
   * what is on screen. An unknown id is reported instead of opening a blank
   * drawer.
   */
  useEffect(() => {
    if (state.kind !== 'ok') return

    if (!ticketId) {
      setTicketMissing(false)
      setDrawer((current) => (current?.kind === 'edit' ? null : current))
      return
    }

    // While a delete is in its undo window the card is deliberately absent from
    // the optimistic view; do not turn that into a "ticket not found" error.
    if (pendingDelete?.taskId === ticketId) {
      setTicketMissing(false)
      setDrawer(null)
      return
    }

    const exists = state.view.columns.some((column) =>
      column.tasks.some((task) => task.id === ticketId),
    )

    if (exists) {
      setTicketMissing(false)
      setDrawer((current) =>
        current?.kind === 'edit' && current.taskId === ticketId
          ? current
          : { kind: 'edit', taskId: ticketId },
      )
    } else {
      setTicketMissing(true)
      setDrawer(null)
    }
  }, [pendingDelete, state, ticketId])

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

      setMutating(true)
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
      } finally {
        setMutating(false)
      }
    },
    [boardId, load],
  )

  /** Saves the appearance document and applies it without a full refetch. */
  async function saveTheme(theme: BoardTheme): Promise<string | null> {
    setMutating(true)
    try {
      const response = await fetch(`/api/v1/boards/${boardId}/theme`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(theme),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        return body?.error.message ?? 'Could not save colours.'
      }

      const body = (await response.json()) as { theme: BoardTheme }
      setState((current) =>
        current.kind === 'ok'
          ? { kind: 'ok', view: { ...current.view, theme: body.theme } }
          : current,
      )
      return null
    } finally {
      setMutating(false)
    }
  }

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

  // Shortcuts that work anywhere on the board, but never while typing.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (typing) return

      if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (event.key === 'n' && !drawer) {
        event.preventDefault()
        setDrawer({ kind: 'create', status: activeColumn })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeColumn, drawer])

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

  const { board, columns, theme } = state.view

  // Polling stops while the reader is doing something that a refresh could
  // disturb: dragging a card, waiting out an undoable delete, saving, or using
  // the ticket drawer (which holds unsaved edits of its own).
  const pollingPaused = drawer !== null || activeTask !== null || pendingDelete !== null || mutating

  const filters = { query, assigneeId, priority }
  const filtering = query.trim() !== '' || assigneeId !== null || priority !== null
  const today = todayIso()
  const allTasks = columns.flatMap((column) => column.tasks)
  const overdueCount = allTasks.filter((task) => isOverdue(task, today)).length

  // Only people who actually hold work on this board are worth offering.
  const assignees = [
    ...new Map(
      allTasks
        .filter((task) => task.assignee !== null)
        .map((task) => [task.assignee!.id, task.assignee!] as const),
    ).values(),
  ]

  function visibleTasks(tasks: TaskDto[]): TaskDto[] {
    return filtering ? tasks.filter((task) => matchesFilters(task, filters)) : tasks
  }

  function clearFilters() {
    setQuery('')
    setAssigneeId(null)
    setPriority(null)
  }

  /** Open a ticket by putting its id in the URL, so the link is copyable. */
  function openTicket(taskId: string) {
    if (!boardId) return
    navigate(`/boards/${encodeURIComponent(boardId)}/tickets/${encodeURIComponent(taskId)}`)
  }

  /** Closing the drawer returns to the board route, not a stale ticket URL. */
  function closeDrawer() {
    setDrawer(null)
    if (ticketId && boardId) {
      navigate(`/boards/${encodeURIComponent(boardId)}`, { replace: true })
    }
  }

  /** A new task has no ticket id yet, so leave any open ticket route first. */
  function openCreate(status: ColumnKey) {
    if (ticketId && boardId) {
      navigate(`/boards/${encodeURIComponent(boardId)}`, { replace: true })
    }
    setDrawer({ kind: 'create', status })
  }

  /** Removes the card at once, then deletes it for real when the window closes. */
  function requestDelete(taskId: string, title: string) {
    setDrawer(null)
    setState((current) =>
      current.kind === 'ok' ? { kind: 'ok', view: withoutTask(current.view, taskId) } : current,
    )

    const timer = setTimeout(() => void commitDelete(taskId), 8000)
    setPendingDelete({ taskId, title, timer })
  }

  async function commitDelete(taskId: string) {
    setPendingDelete(null)
    setMutating(true)

    try {
      await fetch(`/api/v1/boards/${boardId}/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      })
    } finally {
      if (ticketIdRef.current === taskId && boardId) {
        navigate(`/boards/${encodeURIComponent(boardId)}`, { replace: true })
      }
      await load({ silent: true })
      setMutating(false)
    }
  }

  function undoDelete() {
    if (!pendingDelete) return

    clearTimeout(pendingDelete.timer)
    setPendingDelete(null)
    // The server still has the task; reloading is how it comes back.
    void load({ silent: true })
  }

  const editingTaskId = drawer?.kind === 'edit' ? drawer.taskId : null

  async function saveDescription() {
    if (!boardId) return

    setMutating(true)
    try {
      const response = await fetch(`/api/v1/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: descriptionDraft }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setNotice(body?.error.message ?? 'Could not save the description.')
        return
      }

      setEditingDescription(false)
      await load({ silent: true })
    } finally {
      setMutating(false)
    }
  }

  function taskTitle(taskId: string): string {
    const task = columns.flatMap((column) => column.tasks).find((item) => item.id === taskId)
    return task?.title ?? 'task'
  }

  const pageStyle = theme.background
    ? ({
        background: theme.background,
        '--page-fg': inkFor(theme.background),
        '--page-muted': inkFor(theme.background),
      } as React.CSSProperties)
    : undefined

  return (
    <main className="board-page" style={pageStyle}>
      <Link className="back-link" to="/boards">
        ← All boards
      </Link>

      <div className="page-heading">
        <div>
          <h1>{board.name}</h1>

          {editingDescription ? (
            <div className="board-description-form">
              <textarea
                className="input textarea"
                rows={2}
                maxLength={500}
                value={descriptionDraft}
                aria-label="Board description"
                placeholder="What is this board for?"
                onChange={(event) => setDescriptionDraft(event.target.value)}
              />
              <div className="board-description-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => void saveDescription()}
                >
                  Save
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => setEditingDescription(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="board-description">
              {board.description ?? (
                <span className="board-description-empty">No description yet</span>
              )}
              <button
                className="button button-quiet inline"
                type="button"
                onClick={() => {
                  setDescriptionDraft(board.description ?? '')
                  setEditingDescription(true)
                }}
              >
                {board.description ? 'Edit' : 'Add description'}
              </button>
            </p>
          )}

          <p className="lede">
            {board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'} · drag to reorder, or open
            a card to edit it
            {overdueCount > 0 && (
              <>
                {' · '}
                <span className="overdue-count">{overdueCount} overdue</span>
              </>
            )}
          </p>
        </div>
        <div className="page-heading-actions">
          <BoardLiveStatus
            enabled
            paused={pollingPaused}
            refresh={(signal) => load({ silent: true, background: true, signal })}
          />
          <button
            className="button button-quiet inline"
            type="button"
            onClick={() => setShowTheme((open) => !open)}
            aria-expanded={showTheme}
          >
            Colours
          </button>
        </div>
      </div>

      {ticketMissing && (
        <p className="alert alert-neutral" role="alert">
          That ticket does not exist on this board.{' '}
          <Link to={`/boards/${boardId}`}>Back to the board</Link>
        </p>
      )}

      <div className="board-tools">
        <input
          ref={searchRef}
          className="input board-search"
          type="search"
          value={query}
          placeholder="Search tasks…  /"
          aria-label="Search tasks"
          onChange={(event) => setQuery(event.target.value)}
        />

        <label className="board-filter">
          <span className="visually-hidden">Assignee</span>
          <select
            className="input"
            value={assigneeId ?? ''}
            onChange={(event) => setAssigneeId(event.target.value || null)}
          >
            <option value="">Anyone</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="board-filter">
          <span className="visually-hidden">Priority</span>
          <select
            className="input"
            value={priority ?? ''}
            onChange={(event) => setPriority(event.target.value || null)}
          >
            <option value="">Any priority</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        {filtering && (
          <button className="button button-quiet inline" type="button" onClick={clearFilters}>
            Clear
          </button>
        )}

        {filtering && (
          <span className="board-tools-note">
            Dragging is off while filtered, so hidden cards cannot be reordered by accident.
          </span>
        )}
      </div>

      {showTheme && (
        <ThemePanel initial={theme} onSave={saveTheme} onClose={() => setShowTheme(false)} />
      )}

      {notice && (
        <p className="alert alert-neutral" role="status">
          {notice}
        </p>
      )}

      {pendingDelete && (
        <div className="undo-toast" role="status">
          <span>Deleted “{pendingDelete.title}”</span>
          <button className="button button-quiet inline" type="button" onClick={undoDelete}>
            Undo
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="board-tabs" role="group" aria-label="Choose a column">
          {columns.map((column) => (
            <button
              key={column.key}
              className="board-tab"
              type="button"
              aria-pressed={column.key === activeColumn}
              onClick={() => setActiveColumn(column.key)}
            >
              {column.name}
              <span className="count" aria-hidden="true">
                {column.taskCount}
              </span>
            </button>
          ))}
        </div>

        <div className="board">
          {columns.map((column) => (
            <Column
              key={column.key}
              column={column}
              boardId={boardId ?? ''}
              active={column.key === activeColumn}
              profiles={profiles}
              background={theme.columns?.[column.key]}
              ticket={theme.tickets}
              tasks={visibleTasks(column.tasks)}
              filtering={filtering}
              onOpen={openTicket}
              onAdd={() => openCreate(column.key)}
            />
          ))}
        </div>

        {/*
          The card that follows the cursor. Rendered in a portal at the document
          level, so a scroll container (the board uses overflow-x: auto) cannot
          clip it when it leaves its own column.
        */}
        <DragOverlay dropAnimation={null}>
          {activeTask
            ? (() => {
                const columnColour = theme.columns?.[activeTask.status]
                const floating =
                  theme.tickets ?? (columnColour ? cardBackground(columnColour) : undefined)

                return (
                  <div
                    className="card drag-overlay"
                    style={floating ? { background: floating, color: inkFor(floating) } : undefined}
                  >
                    <CardBody task={activeTask} profiles={profiles} />
                  </div>
                )
              })()
            : null}
        </DragOverlay>
      </DndContext>

      <ActivityFeed
        boardId={boardId ?? ''}
        refreshKey={activityKey}
        profiles={profiles}
        theme={theme}
      />

      {drawer && boardId && (
        <TaskDrawer
          boardId={boardId}
          mode={drawer}
          profiles={profiles}
          onClose={closeDrawer}
          onChanged={() => load({ silent: true })}
          onRequestDelete={
            editingTaskId ? () => requestDelete(editingTaskId, taskTitle(editingTaskId)) : undefined
          }
        />
      )}
    </main>
  )
}

function Column({
  column,
  boardId,
  active,
  profiles,
  background,
  ticket,
  tasks,
  filtering,
  onOpen,
  onAdd,
}: {
  column: BoardView['columns'][number]
  boardId: string
  active?: boolean
  profiles: ProfileDto[]
  background?: string
  ticket?: string
  tasks: TaskDto[]
  filtering: boolean
  onOpen: (taskId: string) => void
  onAdd: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key })

  // A board-wide ticket colour wins; otherwise cards inherit a tint of their
  // own column so the lane reads as one palette.
  const cardBg = ticket ?? (background ? cardBackground(background) : undefined)

  const style = {
    ...(background ? { background, '--column-fg': inkFor(background) } : {}),
    ...(cardBg ? { '--card-bg': cardBg, '--card-fg': inkFor(cardBg) } : {}),
  } as React.CSSProperties

  return (
    <section
      ref={setNodeRef}
      className={isOver ? 'column over' : 'column'}
      style={Object.keys(style).length > 0 ? style : undefined}
      data-custom={background || cardBg ? 'true' : undefined}
      data-active={active ? 'true' : undefined}
      aria-labelledby={`column-${column.key}`}
    >
      <header className="column-header">
        <h2 id={`column-${column.key}`}>{column.name}</h2>
        <span className="count">{filtering ? tasks.length : column.taskCount}</span>
      </header>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        {tasks.length === 0 ? (
          <p className="empty">{filtering ? 'No matching tasks' : 'Drop a task here'}</p>
        ) : (
          <ul className="card-list">
            {tasks.map((task) => (
              <SortableCard
                key={task.id}
                task={task}
                boardId={boardId}
                profiles={profiles}
                draggable={!filtering}
                onOpen={() => onOpen(task.id)}
              />
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
