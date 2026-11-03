import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Me = { user: { id: string; displayName: string; email: string } }

/**
 * Authenticated landing page.
 *
 * M3 scaffolding: it proves the session works and gives a sign-out control.
 * The real dashboard, listing every board, is M4.
 */
export function BoardsPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [me, setMe] = useState<Me['user'] | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/auth/me')
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) navigate('/login?next=/boards', { replace: true })
          return null
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return (await response.json()) as Me
      })
      .then((body) => {
        if (cancelled || !body) return
        setMe(body.user)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  async function signOut() {
    await fetch('/api/v1/auth/logout', { method: 'POST' })
    navigate('/', { replace: true })
  }

  if (state === 'loading') {
    return (
      <main className="page">
        <p role="status">Checking your session…</p>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="page">
        <h1>Something went wrong</h1>
        <p className="error">Your session could not be checked.</p>
        <Link className="button" to="/login">
          Sign in again
        </Link>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>Boards</h1>
      <p className="lede">
        Signed in as {me?.displayName}. The board dashboard arrives in M4; for now the seeded board
        is reachable directly.
      </p>

      <nav className="home-links" aria-label="Boards">
        <Link className="button" to="/boards/brd_demo">
          FlowQuery Development
        </Link>
      </nav>

      <button className="button button-quiet" type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}
