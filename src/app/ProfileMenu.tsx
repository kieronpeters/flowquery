import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Me = {
  displayName: string
  avatarUrl: string | null
}

/** First letter of each word, at most two: "Kieron Peters" -> "KP". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const letters = parts.slice(0, 2).map((part) => part[0]!.toUpperCase())
  return letters.join('')
}

/**
 * Who is signed in, in the header.
 *
 * The picture comes from GitHub and is loaded from avatars.githubusercontent.com
 * — the only external origin the CSP allows. If it is missing or fails to load,
 * initials stand in, so the menu is never a broken image.
 */
export function ProfileMenu() {
  const [me, setMe] = useState<Me | null>(null)
  const [open, setOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const container = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/v1/auth/me')
        if (!response.ok) return
        const body = (await response.json()) as { user?: Me }
        if (!cancelled) setMe(body.user ?? null)
      } catch {
        // Signed out, offline, or no fetch at all. Nothing to show.
      }
    }

    void load()

    return () => {
      cancelled = true
    }
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

  const showImage = me.avatarUrl !== null && !imageFailed

  return (
    <div className="profile" ref={container}>
      <button
        className="profile-button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {showImage ? (
          <img
            className="avatar"
            src={me.avatarUrl ?? ''}
            alt=""
            width={32}
            height={32}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="avatar avatar-fallback" aria-hidden="true">
            {initials(me.displayName)}
          </span>
        )}
        <span className="profile-name">{me.displayName}</span>
      </button>

      {open && (
        <div className="profile-menu" role="menu" aria-label="Account">
          <p className="profile-menu-name">{me.displayName}</p>
          <button className="profile-menu-item" type="button" role="menuitem" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
