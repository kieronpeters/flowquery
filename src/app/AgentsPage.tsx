import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ApiError, ProfileDto } from '../shared/api-types'
import { AVATAR_VARIANTS, avatarPathFor, type AvatarVariant } from '../shared/avatars'
import { AVATAR_PALETTE, variantFromPath } from './AgentAvatar'
import { prepareAvatarFile } from './image-resize'
import { ProfileAvatar } from './ProfileAvatar'

/**
 * Agent appearance.
 *
 * Two ways to dress an agent, and they are exclusive:
 *
 *  - a drawn avatar (a colour), which always works and weighs nothing;
 *  - an uploaded picture, which is resized in the browser and stored in D1.
 *
 * Choosing a colour clears the upload, and uploading overrides the colour, so
 * what is shown is always the last decision rather than a silent tie.
 *
 * Human profiles are not listed: their picture is their own, from the profile
 * menu or from GitHub.
 */
export function AgentsPage() {
  const [profiles, setProfiles] = useState<ProfileDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const pendingId = useRef<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/profiles')
      .then(async (response) => {
        // Appearance is administration: without a session there is nothing to
        // administer, so send them to sign in rather than showing an error.
        if (response.status === 401) {
          navigate('/login?next=/agents', { replace: true })
          return
        }
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
  }, [navigate])

  function replace(profileId: string, patch: Partial<ProfileDto>) {
    setProfiles((current) =>
      (current ?? []).map((item) => (item.id === profileId ? { ...item, ...patch } : item)),
    )
  }

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

      // The server clears any uploaded picture in the same step, so the drawn
      // avatar is what will actually be shown.
      replace(profile.id, { avatarPath: avatarPathFor(variant), avatarUrl: null })
    } catch {
      setError('The request failed. Check the connection and try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function upload(profileId: string, file: File) {
    setBusyId(profileId)
    setError(null)

    try {
      const prepared = await prepareAvatarFile(file)
      if (!prepared.ok) {
        setError(prepared.message)
        return
      }

      const response = await fetch(`/api/v1/profiles/${profileId}/image`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prepared.image),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setError(body?.error.message ?? 'That picture could not be saved.')
        return
      }

      const body = (await response.json()) as { avatarUrl: string | null }
      replace(profileId, { avatarUrl: body.avatarUrl })
    } catch {
      setError('The upload failed. Check the connection and try again.')
    } finally {
      setBusyId(null)
      if (fileInput.current) fileInput.current.value = ''
      pendingId.current = null
    }
  }

  async function useDefault(profile: ProfileDto) {
    if (busyId) return
    setBusyId(profile.id)
    setError(null)

    try {
      const response = await fetch(`/api/v1/profiles/${profile.id}/image`, { method: 'DELETE' })
      if (!response.ok) {
        setError('That picture could not be removed.')
        return
      }
      replace(profile.id, { avatarUrl: null })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="page page-narrow">
      <h1>Agents</h1>
      <p className="lede">
        The AI specialists you can assign work to. Give each one a colour, or upload a picture of
        your own — it appears wherever they are mentioned.
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
            const busy = busyId === profile.id

            return (
              <li className="agent-row" key={profile.id}>
                <ProfileAvatar
                  name={profile.displayName}
                  avatarPath={profile.avatarPath}
                  avatarUrl={profile.avatarUrl}
                  kind={profile.kind}
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
                      aria-pressed={variant === current && !profile.avatarUrl}
                      disabled={busyId !== null}
                      onClick={() => void choose(profile, variant)}
                    />
                  ))}
                </div>

                <div className="agent-picture-actions">
                  <button
                    className="button button-quiet inline"
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => {
                      pendingId.current = profile.id
                      setPickerFor(profile.id)
                      fileInput.current?.click()
                    }}
                  >
                    {busy ? 'Working…' : 'Upload picture'}
                  </button>

                  {profile.avatarUrl && (
                    <button
                      className="button button-quiet inline"
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void useDefault(profile)}
                    >
                      Use colour
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        aria-label="Choose a picture for this agent"
        data-picker-for={pickerFor ?? ''}
        onChange={(event) => {
          const file = event.target.files?.[0]
          const profileId = pendingId.current
          if (file && profileId) void upload(profileId, file)
        }}
      />
    </main>
  )
}
