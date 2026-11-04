import { useEffect, useState } from 'react'

import type { ApiError, ProfileDto } from '../shared/api-types'
import { AVATAR_VARIANTS, avatarPathFor, type AvatarVariant } from '../shared/avatars'
import { AgentAvatar, AVATAR_PALETTE, variantFromPath } from './AgentAvatar'

/**
 * Agent appearance.
 *
 * Humans set the avatar for the AI specialists here; the specialists themselves
 * have no account to sign in with, so this is the only way their picture ever
 * changes. Human profiles are not listed — their picture comes from GitHub.
 */
export function AgentsPage() {
  const [profiles, setProfiles] = useState<ProfileDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/profiles')
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = (await response.json()) as { profiles?: ProfileDto[] }
        if (!Array.isArray(body.profiles)) throw new Error('Unexpected payload')
        if (!cancelled) setProfiles(body.profiles.filter((profile) => profile.kind !== 'human'))
      })
      .catch(() => {
        if (!cancelled) setError('The agents could not be loaded.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function choose(profile: ProfileDto, variant: AvatarVariant) {
    if (busyId) return
    setBusyId(profile.id)
    setError(null)

    try {
      const response = await fetch(`/api/v1/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatarPath: avatarPathFor(variant) }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setError(body?.error.message ?? 'That avatar could not be saved.')
        return
      }

      setProfiles((current) =>
        (current ?? []).map((item) =>
          item.id === profile.id ? { ...item, avatarPath: avatarPathFor(variant) } : item,
        ),
      )
    } catch {
      setError('The request failed. Check the connection and try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="page page-narrow">
      <h1>Agents</h1>
      <p className="lede">
        The AI specialists you can assign work to. Pick a colour for each one; it appears wherever
        they are mentioned.
      </p>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {profiles === null ? (
        <p role="status">Loading agents…</p>
      ) : (
        <ul className="agent-list">
          {profiles.map((profile) => {
            const current = variantFromPath(profile.avatarPath, profile.displayName)

            return (
              <li className="agent-row" key={profile.id}>
                <AgentAvatar
                  name={profile.displayName}
                  avatarPath={profile.avatarPath}
                  contractor={profile.kind === 'contractor'}
                  size={40}
                />

                <div className="agent-identity">
                  <span className="agent-name">{profile.displayName}</span>
                  <span className="agent-role">{profile.roleTitle}</span>
                </div>

                <div
                  className="agent-swatches"
                  role="group"
                  aria-label={`Colour for ${profile.displayName}`}
                >
                  {AVATAR_VARIANTS.map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      className="agent-swatch"
                      style={{ background: AVATAR_PALETTE[variant].accent }}
                      aria-label={`${variant} for ${profile.displayName}`}
                      aria-pressed={variant === current}
                      disabled={busyId !== null}
                      onClick={() => void choose(profile, variant)}
                    />
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
