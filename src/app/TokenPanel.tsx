import { useCallback, useEffect, useState } from 'react'

import type { ApiError } from '../shared/api-types'

type TokenRow = {
  id: string
  label: string
  tokenPrefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

function when(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Agent credential management for one board.
 *
 * The plaintext appears once, in a panel the user must dismiss. There is no
 * "show again": the server only ever stored a hash.
 */
export function TokenPanel({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/boards/${boardId}/tokens`)
    if (!response.ok) {
      setError('Tokens could not be loaded.')
      setLoading(false)
      return
    }
    const body = (await response.json()) as { tokens: TokenRow[] }
    setTokens(body.tokens)
    setLoading(false)
  }, [boardId])

  useEffect(() => {
    void load()
  }, [load])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (busy || !label.trim()) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/tokens`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setError(body?.error.message ?? 'The token could not be created.')
        return
      }

      const body = (await response.json()) as { token: string }
      setCreatedToken(body.token)
      setLabel('')
      setCopied(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(tokenId: string) {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/tokens/${tokenId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        setError('That token could not be revoked.')
        return
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!createdToken) return
    try {
      await navigator.clipboard.writeText(createdToken)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="token-panel" role="group" aria-label="Agent tokens">
      <div className="token-panel-header">
        <h3 className="section-heading">Agent tokens</h3>
        <div className="token-panel-actions">
          <a className="button button-quiet inline" href="/agent">
            Test a token
          </a>
          <button className="button button-quiet inline" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <p className="token-note">
        A token lets one agent reach this board and nothing else. It cannot create, rename or delete
        boards, and it cannot see any other board.
      </p>

      {createdToken && (
        <div className="token-reveal" role="status">
          <p className="token-reveal-title">Copy this now — it will not be shown again.</p>
          <code className="token-value">{createdToken}</code>
          <div className="token-reveal-actions">
            <button className="button button-primary" type="button" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy token'}
            </button>
            <button className="button" type="button" onClick={() => setCreatedToken(null)}>
              Done
            </button>
          </div>
          <p className="token-note">
            FlowQuery stores only a hash. If you lose it, revoke it and create another.
          </p>
        </div>
      )}

      {loading ? (
        <p role="status">Loading tokens…</p>
      ) : tokens.length === 0 ? (
        <p className="empty">No tokens yet.</p>
      ) : (
        <ul className="token-list">
          {tokens.map((token) => (
            <li key={token.id} className={token.revokedAt ? 'token-row revoked' : 'token-row'}>
              <div className="token-row-main">
                <span className="token-label">{token.label}</span>
                <span className="token-meta">
                  {token.tokenPrefix}… · used {when(token.lastUsedAt)}
                  {token.revokedAt && ' · revoked'}
                </span>
              </div>
              {!token.revokedAt && (
                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => void revoke(token.id)}
                  disabled={busy}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <form className="token-form" onSubmit={create}>
        <label className="field">
          <span className="field-label">New token label</span>
          <input
            className="input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Bob — main development"
            maxLength={80}
          />
        </label>
        <button className="button button-primary" type="submit" disabled={busy || !label.trim()}>
          Create token
        </button>
      </form>
    </div>
  )
}
