import { useEffect, useState } from 'react'

import type { ApiError, ProfileDto, TaskDto } from '../shared/api-types'
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
}) {
  const { boardId, mode, profiles, onClose, onChanged } = props

  const [form, setForm] = useState<Form>(
    mode.kind === 'create' ? { ...EMPTY, status: mode.status } : EMPTY,
  )
  const [version, setVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(mode.kind === 'edit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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
  }, [boardId, mode])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

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
      </aside>
    </div>
  )
}
