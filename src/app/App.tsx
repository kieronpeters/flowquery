import { useEffect, useState } from 'react'

type Health = {
  status: string
  service: string
  version: string
  time: string
}

type State =
  { kind: 'checking' } | { kind: 'ok'; health: Health } | { kind: 'error'; message: string }

/**
 * M1 foundation check.
 *
 * This screen exists to prove that the build, the static assets and the Worker
 * API work together. It is not product UI and will be replaced in M2 when the
 * board application shell is built.
 */
export function App() {
  const [state, setState] = useState<State>({ kind: 'checking' })

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/health')
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return (await response.json()) as Health
      })
      .then((health) => {
        if (!cancelled) setState({ kind: 'ok', health })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="shell">
      <h1>FlowQuery</h1>
      <p className="lede">Foundation build — repository and toolchain only.</p>

      <section className="card" aria-live="polite">
        <h2>API</h2>
        {state.kind === 'checking' && <p>Checking…</p>}
        {state.kind === 'ok' && (
          <dl>
            <dt>Status</dt>
            <dd>{state.health.status}</dd>
            <dt>Version</dt>
            <dd>{state.health.version}</dd>
            <dt>Server time</dt>
            <dd>{state.health.time}</dd>
          </dl>
        )}
        {state.kind === 'error' && <p className="error">Unreachable: {state.message}</p>}
      </section>

      <p className="note">
        This placeholder is removed in M2. It contains no product features, no authentication and no
        database access.
      </p>
    </main>
  )
}
