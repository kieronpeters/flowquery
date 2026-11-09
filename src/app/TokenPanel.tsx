import { useCallback, useEffect, useState } from 'react'

import type { ApiError, ProfileDto } from '../shared/api-types'
import { ProfileAvatar } from './ProfileAvatar'

type TokenRow = {
  id: string
  profileId: string | null
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
 * One agent holds one token per board, so the form is a choice of agent rather
 * than a free-text label: the label is the agent's name, and it is what the
 * activity feed matches on. Typing it by hand was the one way to get it wrong.
 *
 * Rotating replaces the token in a single step. Revoking and creating separately
 * left a window where the agent had nothing, and a person who forgot the second
 * half.
 *
 * The plaintext appears once, in a panel the user must dismiss. There is no
 * "show again": the server only ever stored a hash.
 */
export function TokenPanel({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [profiles, setProfiles] = useState<ProfileDto[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<{ token: string; label: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const [tokenResponse, profileResponse] = await Promise.all([
      fetch(`/api/v1/boards/${boardId}/tokens`),
      fetch('/api/v1/profiles'),
    ])

    if (!tokenResponse.ok || !profileResponse.ok) {
      setError('Tokens could not be loaded.')
      setLoading(false)
      return
    }

    const tokenBody = (await tokenResponse.json()) as { tokens: TokenRow[] }
    const profileBody = (await profileResponse.json()) as { profiles: ProfileDto[] }

    setTokens(tokenBody.tokens)
    setProfiles(profileBody.profiles.filter((profile) => profile.kind !== 'human'))
    setLoading(false)
  }, [boardId])

  useEffect(() => {
    void load()
  }, [load])

  const live = tokens.filter((token) => token.revokedAt === null)
  const liveProfileIds = new Set(live.map((token) => token.profileId))
  const available = profiles.filter((profile) => !liveProfileIds.has(profile.id))
  const chosen = available.find((profile) => profile.id === selected) ?? available[0] ?? null

  function profileFor(token: TokenRow): ProfileDto | null {
    return profiles.find((profile) => profile.id === token.profileId) ?? null
  }

  async function create() {
    if (busy || !chosen) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/tokens`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profileId: chosen.id }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setError(body?.error.message ?? 'The token could not be created.')
        return
      }

      const body = (await response.json()) as { token: string; record: TokenRow }
      setRevealed({ token: body.token, label: body.record.label })
      setSelected('')
      setCopied(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function rotate(token: TokenRow) {
    if (busy) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/tokens/${token.id}/rotate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setError(body?.error.message ?? 'That token could not be rotated.')
        return
      }

      const body = (await response.json()) as { token: string; record: TokenRow }
      setRevealed({ token: body.token, label: body.record.label })
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
    if (!revealed) return
    try {
      await navigator.clipboard.writeText(revealed.token)
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
        boards, and it cannot see any other board. Each agent holds one token per board.
      </p>

      {revealed && (
        <div className="token-reveal" role="status">
          <p className="token-reveal-title">
            New token for {revealed.label} — copy it now, it will not be shown again.
          </p>
          <code className="token-value">{revealed.token}</code>
          <div className="token-reveal-actions">
            <button className="button button-primary" type="button" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy token'}
            </button>
            <button className="button" type="button" onClick={() => setRevealed(null)}>
              Done
            </button>
          </div>
          <p className="token-note">
            FlowQuery stores only a hash. If you lose it, rotate the token for that agent.
          </p>
        </div>
      )}

      {loading ? (
        <p role="status">Loading tokens…</p>
      ) : live.length === 0 ? (
        <p className="empty">No tokens yet.</p>
      ) : (
        <ul className="token-list">
          {live.map((token) => {
            const profile = profileFor(token)

            return (
              <li key={token.id} className="token-row">
                <ProfileAvatar
                  name={token.label}
                  profileId={profile?.id ?? null}
                  avatarPath={profile?.avatarPath ?? null}
                  avatarUrl={profile?.avatarUrl ?? null}
                  kind={profile?.kind ?? 'ai'}
                  size={28}
                />

                <div className="token-row-main">
                  <span className="token-label">{token.label}</span>
                  <span className="token-meta">
                    {token.tokenPrefix}… · used {when(token.lastUsedAt)}
                  </span>
                </div>

                <div className="token-row-actions">
                  <button
                    className="button button-quiet inline"
                    type="button"
                    disabled={busy}
                    onClick={() => void rotate(token)}
                    title="Replace this token with a new one; the old one stops working"
                  >
                    Rotate
                  </button>
                  <button
                    className="button button-danger inline"
                    type="button"
                    onClick={() => void revoke(token.id)}
                    disabled={busy}
                  >
                    Revoke
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {tokens.some((token) => token.revokedAt !== null) && (
        <details className="token-history">
          <summary>Revoked tokens</summary>
          <ul className="token-list">
            {tokens
              .filter((token) => token.revokedAt !== null)
              .map((token) => (
                <li key={token.id} className="token-row revoked">
                  <div className="token-row-main">
                    <span className="token-label">{token.label}</span>
                    <span className="token-meta">
                      {token.tokenPrefix}… · revoked {when(token.revokedAt)}
                    </span>
                  </div>
                </li>
              ))}
          </ul>
        </details>
      )}

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {available.length === 0 ? (
        <p className="token-note">Every agent already has a token on this board.</p>
      ) : (
        <form
          className="token-form"
          onSubmit={(event) => {
            event.preventDefault()
            void create()
          }}
        >
          <label className="field">
            <span className="field-label">Agent</span>
            <select
              className="input"
              value={chosen?.id ?? ''}
              onChange={(event) => setSelected(event.target.value)}
            >
              {available.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName} — {profile.roleTitle}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary" type="submit" disabled={busy || !chosen}>
            Create token
          </button>
        </form>
      )}
    </div>
  )
}
