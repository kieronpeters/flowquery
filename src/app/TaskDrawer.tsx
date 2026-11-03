import { useEffect, useRef, useState } from 'react'

import type { ApiError, CommentDto, ProfileDto, TaskDto } from '../shared/api-types'
import { COLUMNS, type ColumnKey } from '../shared/columns'

const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const
const PRIORITY_LABELS: Record<string, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

type Mode = { kind: 'create'; status: ColumnKey } | { kind: 'edit'; taskId: string }

export type MoveDirection = 'up' | 'down' | 'left' | 'right'

type Form = {
  title: string
  description: string
  priority: string
  assigneeProfileId: string
  dueDate: string
  status: ColumnKey
}

const EMPTY: Form = {
  title: '',
  description: '',
  priority: 'none',
  assigneeProfileId: '',
  dueDate: '',
  status: 'backlog',
}

/**
 * Task detail and editor.
 *
 * One panel serves create and edit so the fields and validation cannot drift
 * apart. Deletion is two-step: a stray click must not destroy work.
 */
export function TaskDrawer(props: {
  boardId: string
  mode: Mode
  profiles: ProfileDto[]
  onClose: () => void
  onChanged: () => Promise<void> | void
  onMoveRelative?: (direction: MoveDirection) => Promise<string | null>
}) {
  const { boardId, mode, profiles, onClose, onChanged, onMoveRelative } = props

  const [form, setForm] = useState<Form>(
    mode.kind === 'create' ? { ...EMPTY, status: mode.status } : EMPTY,
  )
  const [version, setVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(mode.kind === 'edit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // Bumped after a move so the drawer reloads the task's new position and version.
  const [reloadToken, setReloadToken] = useState(0)
  const [comments, setComments] = useState<CommentDto[]>([])
  const [commentsLoading, setCommentsLoading] = useState(mode.kind === 'edit')
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [postingComment, setPostingComment] = useState(false)

  const drawerRef = useRef<HTMLElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  /**
   * A dialog that claims aria-modal must behave like one: focus returns to
   * whatever opened it, and Tab cannot walk into the page behind. Without this
   * a keyboard or screen-reader user is told the background is inert and then
   * put inside it anyway.
   */
  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null

    return () => {
      returnFocusRef.current?.focus?.()
    }
  }, [])

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return

    const root = drawerRef.current
    if (!root) return

    const focusable = [
      ...root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => element.offsetParent !== null)

    if (focusable.length === 0) return

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const active = document.activeElement

    if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault()
      last.focus()
    }
  }

  useEffect(() => {
    if (mode.kind !== 'edit') return

    let cancelled = false

    fetch(`/api/v1/boards/${boardId}/tasks/${mode.taskId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return (await response.json()) as { task: TaskDto }
      })
      .then(({ task }) => {
        if (cancelled) return
        setForm({
          title: task.title,
          description: task.description,
          priority: task.priority,
          assigneeProfileId: task.assignee?.id ?? '',
          dueDate: task.dueDate ?? '',
          status: task.status,
        })
        setVersion(task.version)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError('That task could not be loaded. It may have been deleted.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [boardId, mode, reloadToken])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (mode.kind !== 'edit') return

    let cancelled = false

    fetch(`/api/v1/boards/${boardId}/tasks/${mode.taskId}/comments`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return (await response.json()) as { comments?: unknown }
      })
      .then((body) => {
        if (cancelled) return

        if (!Array.isArray(body.comments)) {
          // Degrade the comment list, not the dialog.
          setCommentError('Comments could not be loaded.')
          setCommentsLoading(false)
          return
        }

        setComments(body.comments as CommentDto[])
        setCommentsLoading(false)
      })
      .catch(() => {
        if (!cancelled) setCommentsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [boardId, mode, reloadToken])

  async function postComment() {
    if (mode.kind !== 'edit' || postingComment) return

    const body = commentText.trim()
    if (!body) return

    setPostingComment(true)
    setCommentError(null)

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/tasks/${mode.taskId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as ApiError | null
        setCommentError(error?.error.message ?? 'Could not add the comment.')
        return
      }

      const created = (await response.json()) as { comment: CommentDto }
      setComments((current) => [...current, created.comment])
      setCommentText('')
      await onChanged()
    } finally {
      setPostingComment(false)
    }
  }

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError(null)

    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      assigneeProfileId: form.assigneeProfileId || null,
      dueDate: form.dueDate || null,
      status: form.status,
    }
    if (version !== null) payload.expectedVersion = version

    try {
      const response = await fetch(
        mode.kind === 'create'
          ? `/api/v1/boards/${boardId}/tasks`
          : `/api/v1/boards/${boardId}/tasks/${mode.taskId}`,
        {
          method: mode.kind === 'create' ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setError(body?.error.message ?? 'Could not save the task.')
        return
      }

      await onChanged()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function move(direction: MoveDirection) {
    if (!onMoveRelative || busy) return

    setBusy(true)
    setMoveError(null)

    try {
      const message = await onMoveRelative(direction)
      if (message) {
        setMoveError(message)
        return
      }
      // The task's column, position and version all changed; reload it.
      setReloadToken((token) => token + 1)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (mode.kind !== 'edit' || busy) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/tasks/${mode.taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setError('Could not delete the task.')
        return
      }

      await onChanged()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        ref={drawerRef}
        onKeyDown={onDialogKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <h2 id="drawer-title">{mode.kind === 'create' ? 'New task' : 'Task'}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {loading ? (
          <p role="status">Loading…</p>
        ) : (
          <form className="drawer-form" onSubmit={save}>
            <label className="field">
              <span className="field-label">Title</span>
              <input
                className="input"
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                maxLength={200}
                autoFocus
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                className="input textarea"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                rows={6}
                maxLength={20000}
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Status</span>
                <select
                  className="input"
                  value={form.status}
                  onChange={(event) => update('status', event.target.value as ColumnKey)}
                >
                  {COLUMNS.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Priority</span>
                <select
                  className="input"
                  value={form.priority}
                  onChange={(event) => update('priority', event.target.value)}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Assignee</span>
                <select
                  className="input"
                  value={form.assigneeProfileId}
                  onChange={(event) => update('assigneeProfileId', event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName} — {profile.roleTitle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Due date</span>
                <input
                  className="input"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => update('dueDate', event.target.value)}
                />
              </label>
            </div>

            {mode.kind === 'edit' && onMoveRelative && (
              <div className="move-row">
                <span className="field-label">Move</span>
                <div className="move-buttons">
                  <button
                    className="button"
                    type="button"
                    onClick={() => void move('left')}
                    disabled={busy}
                    aria-label="Move to the previous column"
                    title="Previous column"
                  >
                    ←
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => void move('up')}
                    disabled={busy}
                    aria-label="Move up one place"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => void move('down')}
                    disabled={busy}
                    aria-label="Move down one place"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => void move('right')}
                    disabled={busy}
                    aria-label="Move to the next column"
                    title="Next column"
                  >
                    →
                  </button>
                  <span className="move-hint">column · order</span>
                </div>
                {moveError && (
                  <p className="alert" role="alert">
                    {moveError}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}

            <div className="drawer-actions">
              <button
                className="button button-primary"
                type="submit"
                disabled={busy || !form.title.trim()}
              >
                {mode.kind === 'create' ? 'Create task' : 'Save changes'}
              </button>
              <button className="button" type="button" onClick={onClose} disabled={busy}>
                Cancel
              </button>

              {mode.kind === 'edit' && (
                <span className="drawer-danger">
                  {confirmingDelete ? (
                    <>
                      <button
                        className="button button-danger"
                        type="button"
                        onClick={() => void remove()}
                        disabled={busy}
                      >
                        Delete permanently
                      </button>
                      <button
                        className="button"
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        disabled={busy}
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      className="button button-danger"
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  )}
                </span>
              )}
            </div>
          </form>
        )}

        {mode.kind === 'edit' && !loading && (
          <section className="comments" aria-labelledby="comments-heading">
            <h3 id="comments-heading" className="section-heading">
              Comments
            </h3>

            {commentsLoading ? (
              <p role="status">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="empty">No comments yet.</p>
            ) : (
              <ul className="comment-list">
                {comments.map((comment) => (
                  <li key={comment.id} className="comment">
                    <p className="comment-meta">
                      <strong>{comment.authorName}</strong> ·{' '}
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                    {/* Rendered as text, never as HTML (COM-003). */}
                    <p className="comment-body">{comment.body}</p>
                  </li>
                ))}
              </ul>
            )}

            <label className="field">
              <span className="field-label">Add a comment</span>
              <textarea
                className="input textarea"
                rows={3}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={10000}
              />
            </label>

            {commentError && (
              <p className="alert" role="alert">
                {commentError}
              </p>
            )}

            <button
              className="button"
              type="button"
              onClick={() => void postComment()}
              disabled={postingComment || !commentText.trim()}
            >
              Add comment
            </button>
          </section>
        )}
      </aside>
    </div>
  )
}
