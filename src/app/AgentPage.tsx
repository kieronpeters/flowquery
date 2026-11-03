import { useState } from 'react'

import type { BoardSummary } from '../shared/api-types'

/**
 * Agent sign-in page.
 *
 * A human pastes a token here to see what it can reach. It calls the agent
 * board endpoint — the same one an agent uses — so what it shows is the truth
 * about the credential, not a guess from the token's label.
 *
 * The token lives in component state only: it is never stored, never put in the
 * URL, and cleared as soon as it has been checked.
 */
export function AgentPage() {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [board, setBoard] = useState<BoardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function check(event: React.FormEvent) {
    event.preventDefault()

    const value = token.trim()
    if (!value || busy) return

    setBusy(true)
    setError(null)
    setBoard(null)

    try {
      const response = await fetch('/api/v1/agent/board', {
        headers: { authorization: `Bearer ${value}` },
      })

      if (!response.ok) {
        setError(
          response.status === 401
            ? 'That token is not valid, or it has been revoked.'
            : `The board could not be read (HTTP ${response.status}).`,
        )
        return
      }

      const body = (await response.json()) as { board?: BoardSummary }
      if (!body.board) {
        setError('The API returned an unexpected payload.')
        return
      }

      setBoard(body.board)
      // No reason to keep the secret on screen once it has been proven.
      setToken('')
    } catch {
      setError('The request failed. Check the connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page page-narrow">
      <h1>Agent access</h1>

      <p className="lede">
        Paste a token to see the board it reaches. A token can only ever reach the board it was
        created for — it cannot list boards, change them, or see any other board.
      </p>

      <form className="stack-form" onSubmit={(event) => void check(event)}>
        <label className="field">
          <span className="field-label">Token</span>
          <input
            className="input"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="fq_…"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>

        <button className="button button-primary" type="submit" disabled={busy || !token.trim()}>
          {busy ? 'Checking…' : 'Check token'}
        </button>
      </form>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {board && (
        <section className="agent-result" aria-live="polite">
          <h2 className="section-heading">This token reaches</h2>
          <p className="agent-board-name">{board.name}</p>
          <dl className="agent-facts">
            <div>
              <dt>Board</dt>
              <dd>
                <code>{board.id}</code>
              </dd>
            </div>
            <div>
              <dt>Tasks</dt>
              <dd>{board.taskCount}</dd>
            </div>
          </dl>
          <p className="note">
            The token was not stored. Reload the page and it is gone from the browser.
          </p>
        </section>
      )}
    </main>
  )
}
