import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { signInHref } from './auth-links'

/**
 * Landing page (NAV-001).
 *
 * A signed-in human is sent straight to their boards; everyone else sees the
 * front door and a way in. The check is a cheap session probe, not a guard.
 */
export function HomePage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/auth/me')
      .then((response) => {
        if (!cancelled) setSignedIn(response.ok)
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (signedIn === null) {
    return (
      <main className="page">
        <p role="status">Loading…</p>
      </main>
    )
  }

  if (signedIn) return <Navigate to="/boards" replace />

  return (
    <main className="page">
      <h1>FlowQuery</h1>
      <p className="lede">
        A small, private Kanban board for planning and tracking real work. Two people, a handful of
        boards, and an AI engineering manager that reads the backlog through an API.
      </p>

      <nav className="home-links" aria-label="Get started">
        <a className="button button-primary" href={signInHref()}>
          Sign in
        </a>
        <Link className="button" to="/signup">
          How access works
        </Link>
      </nav>

      <p className="note">Private instance. Accounts are limited to an allowlist.</p>
    </main>
  )
}
