import { useEffect, useRef, useState } from 'react'

export type BoardPollingStatus = 'idle' | 'refreshing' | 'error'

type BoardPollingOptions = {
  /** Poll only while the board is loaded and on screen. */
  enabled: boolean
  /** Stop polling while the reader is dragging, deleting, saving or in a drawer. */
  paused: boolean
  intervalMs?: number
  /** The transport. Today this is a fetch; SSE can replace it without touching the board. */
  refresh: (signal: AbortSignal) => Promise<void>
}

type BoardPollingState = {
  lastUpdated: number | null
  status: BoardPollingStatus
}

/**
 * Background refresh for the board.
 *
 * The board is a small, local-first application, so a five-second poll is
 * enough and needs no new infrastructure. This hook is deliberately separate
 * from the board component and takes the refresh function as an argument, so a
 * later move to Server-Sent Events is a change of transport here, not a rewrite
 * of the board.
 *
 * Guarantees:
 * - one request at a time; the next tick is scheduled only after the previous
 *   one settles;
 * - no polling while the tab is hidden, or while the caller says it is paused;
 * - an in-flight request is aborted when the board unmounts or polling pauses;
 * - a failed cycle is recorded and retried on the next tick, leaving the last
 *   good board on screen.
 */
export function useBoardPolling({
  enabled,
  paused,
  intervalMs = 5000,
  refresh,
}: BoardPollingOptions): BoardPollingState {
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [status, setStatus] = useState<BoardPollingStatus>('idle')

  // The refresh callback and pause flag change on every board render; keep them
  // in refs so they do not restart the timer.
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef(false)
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (!enabled || paused) {
      stoppedRef.current = true
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      controllerRef.current?.abort()
      controllerRef.current = null
      return
    }

    stoppedRef.current = false

    function clearTimer(): void {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    function schedule(delay: number): void {
      clearTimer()
      if (stoppedRef.current) return
      timerRef.current = setTimeout(() => void run(), delay)
    }

    async function run(): Promise<void> {
      if (stoppedRef.current || pausedRef.current || document.visibilityState === 'hidden') {
        schedule(intervalMs)
        return
      }
      if (inFlightRef.current) {
        schedule(intervalMs)
        return
      }

      inFlightRef.current = true
      const controller = new AbortController()
      controllerRef.current = controller
      setStatus('refreshing')

      try {
        await refreshRef.current(controller.signal)
        if (!stoppedRef.current) {
          setLastUpdated(Date.now())
          setStatus('idle')
        }
      } catch (error) {
        if (stoppedRef.current) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Keep the last good board on screen; the next tick tries again.
        setStatus('error')
      } finally {
        inFlightRef.current = false
        if (controllerRef.current === controller) controllerRef.current = null
        if (!stoppedRef.current) schedule(intervalMs)
      }
    }

    function onVisibilityChange(): void {
      if (document.visibilityState === 'hidden') {
        clearTimer()
      } else {
        // Coming back to the tab is a good moment to catch up immediately.
        schedule(0)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    schedule(intervalMs)

    return () => {
      stoppedRef.current = true
      clearTimer()
      controllerRef.current?.abort()
      controllerRef.current = null
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, intervalMs, paused])

  return { lastUpdated, status }
}
