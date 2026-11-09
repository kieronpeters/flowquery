// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BoardLiveStatus } from '../../src/app/BoardLiveStatus'
import { useBoardPolling } from '../../src/app/use-board-polling'

/**
 * Background board refresh.
 *
 * The interesting behaviour is not the fetch; it is the discipline around it:
 * one request at a time, no work while the tab is hidden or the reader is
 * editing, and a failed cycle that retries without blanking the board.
 */

let visibility: DocumentVisibilityState = 'visible'

function Harness({
  refresh,
  enabled = true,
  paused = false,
  intervalMs = 5000,
}: {
  refresh: (signal: AbortSignal) => Promise<void>
  enabled?: boolean
  paused?: boolean
  intervalMs?: number
}) {
  const { lastUpdated, status } = useBoardPolling({ enabled, paused, intervalMs, refresh })
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="updated">{lastUpdated ?? ''}</span>
    </div>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('useBoardPolling', () => {
  it('refreshes on the interval and records the last update', async () => {
    const refresh = vi.fn(async () => {})

    render(<Harness refresh={refresh} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('updated').textContent).not.toBe('')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('does not start a second request while one is still in flight', async () => {
    let resolve!: () => void
    const refresh = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done
        }),
    )

    render(<Harness refresh={refresh} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(refresh).toHaveBeenCalledTimes(1)

    // A full interval passes while the first request is unresolved.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(refresh).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolve()
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('does not poll while paused and resumes when unpaused', async () => {
    const refresh = vi.fn(async () => {})

    const { rerender } = render(<Harness refresh={refresh} paused />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(refresh).not.toHaveBeenCalled()

    rerender(<Harness refresh={refresh} paused={false} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('does not poll while the tab is hidden and catches up when visible', async () => {
    const refresh = vi.fn(async () => {})

    render(<Harness refresh={refresh} />)

    visibility = 'hidden'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(refresh).not.toHaveBeenCalled()

    visibility = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('records an error and retries on the next cycle', async () => {
    const refresh = vi.fn(async () => {
      throw new Error('offline')
    })

    render(<Harness refresh={refresh} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(screen.getByTestId('status').textContent).toBe('error')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('stops polling after unmount', async () => {
    const refresh = vi.fn(async () => {})

    const { unmount } = render(<Harness refresh={refresh} />)
    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe('BoardLiveStatus', () => {
  it('shows Live first and the update time after a successful poll', async () => {
    const refresh = vi.fn(async () => {})

    render(<BoardLiveStatus enabled paused={false} refresh={refresh} intervalMs={5000} />)
    expect(screen.getByText('Live')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(screen.getByText(/Updated/)).toBeTruthy()
  })

  it('shows the offline state after a failed poll', async () => {
    const refresh = vi.fn(async () => {
      throw new Error('offline')
    })

    render(<BoardLiveStatus enabled paused={false} refresh={refresh} intervalMs={5000} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(screen.getByText('Offline — retrying')).toBeTruthy()
  })
})
