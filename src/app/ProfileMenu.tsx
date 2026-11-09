import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { ApiError } from '../shared/api-types'
import { prepareAvatarFile } from './image-resize'
import { ProfileAvatar, initials } from './ProfileAvatar'

// Re-exported so existing imports keep working; the helper now lives with the
// component that uses it.
export { initials }

type Me = {
  displayName: string
  avatarUrl: string | null
  profileId: string | null
  hasUploadedImage: boolean
}

/**
 * Who is signed in, in the header.
 *
 * The picture is an uploaded one if there is one, otherwise the GitHub avatar
 * captured at sign-in, otherwise initials — so the menu is never a broken
 * image. Changing it is a menu item, not a separate settings page.
 */
export function ProfileMenu() {
  const [me, setMe] = useState<Me | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const container = useRef<HTMLDivElement | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  async function loadMe() {
    try {
      const response = await fetch('/api/v1/auth/me')
      if (!response.ok) return
      const body = (await response.json()) as { user?: Me }
      setMe(body.user ?? null)
    } catch {
      // Signed out, offline, or no fetch at all. Nothing to show.
    }
  }

  useEffect(() => {
    void loadMe()
  }, [])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!me) return null

  async function signOut() {
    setOpen(false)
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
    } finally {
      navigate('/login')
    }
  }

  async function upload(file: File) {
    if (!me?.profileId) {
      setError('Your profile could not be found.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      // Resized in the browser first: a phone photo never leaves at full size.
      const prepared = await prepareAvatarFile(file)
      if (!prepared.ok) {
        setError(prepared.message)
        return
      }

      const response = await fetch(`/api/v1/profiles/${me.profileId}/image`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prepared.image),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setError(body?.error.message ?? 'That picture could not be saved.')
        return
      }

      await loadMe()
    } catch {
      setError('The upload failed. Check the connection and try again.')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function removePicture() {
    if (!me?.profileId) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/profiles/${me.profileId}/image`, { method: 'DELETE' })
      if (!response.ok) {
        setError('That picture could not be removed.')
        return
      }
      await loadMe()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="profile" ref={container}>
      <button
        className="profile-button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ProfileAvatar
          name={me.displayName}
          profileId={me.profileId}
          avatarUrl={me.avatarUrl}
          kind="human"
          size={32}
        />
        <span className="profile-name">{me.displayName}</span>
      </button>

      {open && (
        <div className="profile-menu" role="menu" aria-label="Account">
          <p className="profile-menu-name">{me.displayName}</p>

          {me.profileId && (
            <Link
              className="profile-menu-item"
              role="menuitem"
              to={`/profiles/${encodeURIComponent(me.profileId)}`}
              onClick={() => setOpen(false)}
            >
              View my profile
            </Link>
          )}

          <Link
            className="profile-menu-item"
            role="menuitem"
            to="/people"
            onClick={() => setOpen(false)}
          >
            People
          </Link>

          <button
            className="profile-menu-item"
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {busy ? 'Working…' : 'Upload a new image'}
          </button>

          {me.hasUploadedImage && (
            <button
              className="profile-menu-item"
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => void removePicture()}
            >
              Remove picture
            </button>
          )}

          <Link
            className="profile-menu-item"
            role="menuitem"
            to="/agents"
            onClick={() => setOpen(false)}
          >
            Agents
          </Link>

          <button className="profile-menu-item" type="button" role="menuitem" onClick={signOut}>
            Sign out
          </button>

          {error && (
            <p className="profile-menu-error" role="alert">
              {error}
            </p>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            aria-label="Choose a profile picture"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </div>
      )}
    </div>
  )
}
