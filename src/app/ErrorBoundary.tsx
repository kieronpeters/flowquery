import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Catches a render crash and shows something readable.
 *
 * Without this, one thrown error unmounts the whole tree and the page goes
 * blank — which is exactly what happened during development when a constant was
 * referenced before it existed. A blank page gives the reader nothing to
 * report; this gives them a sentence and a button.
 *
 * It deliberately does not try to recover state: a component that threw is not
 * trustworthy, so the only honest recovery is a reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // There is no error service; the console is where this can go.
    console.error('Unhandled render error', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="page page-narrow">
        <h1>Something broke</h1>
        <p className="lede">
          This page stopped rendering. Reloading usually fixes it. Anything you had typed but not
          saved is gone.
        </p>

        <p className="error" role="alert">
          {this.state.error.message || 'Unknown error'}
        </p>

        <button
          className="button button-primary"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </main>
    )
  }
}
