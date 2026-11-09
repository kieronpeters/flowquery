import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { ApiError, BoardSummary } from '../shared/api-types'
import { AiOnboardingPanel } from './AiOnboardingPanel'
import { TokenPanel } from './TokenPanel'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; boards: BoardSummary[] }
  | { kind: 'error'; message: string }

function today(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The human dashboard (M4).
 *
 * Deletion is permanent (DEC-007), so the confirmation requires typing the
 * board's exact name. The API enforces the same rule, so a UI bug cannot
 * bypass it — the worst case is a 409 and nothing deleted.
 */
export function BoardsPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [notice, setNotice] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  // A ref guard, not state: two clicks in the same frame both see `busy === false`
  // because state updates are asynchronous. This prevents duplicate boards.
  const submitting = useRef(false)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmValue, setConfirmValue] = useState('')

  const [tokenBoardId, setTokenBoardId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch('/api/v1/boards')
    if (response.status === 401) {
      navigate('/login?next=/boards', { replace: true })
      return
    }
    if (!response.ok) {
      setState({ kind: 'error', message: `Could not load boards (HTTP ${response.status}).` })
      return
    }

    const body = (await response.json()) as { boards: BoardSummary[] }
    setState({ kind: 'ready', boards: body.boards })
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

  async function createBoard(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current) return

    submitting.current = true
    setBusy(true)
    setNotice(null)

    try {
      const response = await fetch('/api/v1/boards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as ApiError | null
        setNotice(error?.error.message ?? 'Could not create the board.')
        return
      }

      setNewName('')
      await load()
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  async function saveRename(boardId: string) {
    if (submitting.current) return

    submitting.current = true
    setBusy(true)
    setNotice(null)

    try {
      const response = await fetch(`/api/v1/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: renameValue }),
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as ApiError | null
        setNotice(error?.error.message ?? 'Could not rename the board.')
        return
      }

      setRenamingId(null)
      await load()
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  async function removeBoard(board: BoardSummary) {
    if (submitting.current) return

    submitting.current = true
    setBusy(true)
    setNotice(null)

    try {
      const response = await fetch(`/api/v1/boards/${board.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmName: confirmValue }),
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as ApiError | null
        setNotice(error?.error.message ?? 'Could not delete the board.')
        return
      }

      setDeletingId(null)
      setConfirmValue('')
      setNotice(`Deleted “${board.name}” and all of its tasks.`)
      await load()
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="page">
        <p role="status">Loading boards…</p>
      </main>
    )
  }

  if (state.kind === 'error') {
    return (
      <main className="page">
        <h1>Could not load boards</h1>
        <p className="error">{state.message}</p>
        <button className="button" type="button" onClick={() => void load()}>
          Try again
        </button>
      </main>
    )
  }

  return (
    <main className="page">
      <AiOnboardingPanel />

      <div className="page-heading">
        <div>
          <h1>Boards</h1>
          <p className="lede">Every board, newest first.</p>
        </div>
      </div>

      {notice && (
        <p className="alert alert-neutral" role="status">
          {notice}
        </p>
      )}

      <form className="board-form" onSubmit={createBoard}>
        <label className="field">
          <span className="field-label">New board</span>
          <input
            className="input"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Website relaunch"
            maxLength={120}
          />
        </label>
        <button className="button button-primary" type="submit" disabled={busy || !newName.trim()}>
          Create
        </button>
      </form>

      {state.boards.length === 0 ? (
        <p className="empty-state">No boards yet. Create one above to get started.</p>
      ) : (
        <ul className="board-list">
          {state.boards.map((board) => (
            <li className="board-row" key={board.id}>
              <div className="board-row-main">
                {renamingId === board.id ? (
                  <form
                    className="inline-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void saveRename(board.id)
                    }}
                  >
                    <input
                      className="input"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      aria-label={`New name for ${board.name}`}
                      maxLength={120}
                      autoFocus
                    />
                    <button className="button button-primary" type="submit" disabled={busy}>
                      Save
                    </button>
                    <button
                      className="button"
                      type="button"
                      onClick={() => setRenamingId(null)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <Link className="board-link" to={`/boards/${board.id}`}>
                      {board.name}
                    </Link>
                    {board.description && (
                      <span className="board-description">{board.description}</span>
                    )}
                    <span className="board-meta">
                      {board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'} · created{' '}
                      {today(board.createdAt)}
                    </span>
                  </>
                )}
              </div>

              {renamingId !== board.id && (
                <div className="board-row-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      setRenamingId(board.id)
                      setRenameValue(board.name)
                      setDeletingId(null)
                      setTokenBoardId(null)
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      setTokenBoardId(tokenBoardId === board.id ? null : board.id)
                      setRenamingId(null)
                      setDeletingId(null)
                    }}
                  >
                    Tokens
                  </button>
                  <button
                    className="button button-danger"
                    type="button"
                    onClick={() => {
                      setDeletingId(board.id)
                      setConfirmValue('')
                      setRenamingId(null)
                      setTokenBoardId(null)
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}

              {deletingId === board.id && (
                <div className="confirm-panel" role="group" aria-label={`Delete ${board.name}`}>
                  <p>
                    <strong>Permanently delete “{board.name}”?</strong> This removes its{' '}
                    {board.taskCount} {board.taskCount === 1 ? 'task' : 'tasks'}, all comments,
                    activity history and any agent tokens. It cannot be undone.
                  </p>
                  <label className="field">
                    <span className="field-label">Type the board name to confirm</span>
                    <input
                      className="input"
                      value={confirmValue}
                      onChange={(event) => setConfirmValue(event.target.value)}
                      placeholder={board.name}
                      aria-label="Board name confirmation"
                    />
                  </label>
                  <div className="confirm-actions">
                    <button
                      className="button button-danger"
                      type="button"
                      disabled={busy || confirmValue !== board.name}
                      onClick={() => void removeBoard(board)}
                    >
                      Delete permanently
                    </button>
                    <button
                      className="button"
                      type="button"
                      onClick={() => setDeletingId(null)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {tokenBoardId === board.id && (
                <TokenPanel boardId={board.id} onClose={() => setTokenBoardId(null)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
