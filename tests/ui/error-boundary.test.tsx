// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from '../../src/app/ErrorBoundary'

/**
 * A render crash must not leave a blank page. This is not hypothetical: during
 * development a missing constant unmounted the whole app and the screen went
 * empty, which is the least useful failure a user can report.
 */

function Boom(): never {
  throw new Error('Constant is not defined')
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('All good')).toBeTruthy()
  })

  it('shows a readable message instead of a blank page', () => {
    // React logs the error itself; silence it so the test output stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: 'Something broke' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Constant is not defined')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
  })
})
