import { useBoardPolling } from './use-board-polling'

/**
 * A quiet "the board is live" line next to the board actions.
 *
 * It is intentionally not a live region: announcing a refresh every five
 * seconds would be noise. The text is visible, and the offline state is the only
 * one that changes meaning.
 */
export function BoardLiveStatus({
  enabled,
  paused,
  refresh,
  intervalMs,
}: {
  enabled: boolean
  paused: boolean
  refresh: (signal: AbortSignal) => Promise<void>
  intervalMs?: number
}) {
  const { lastUpdated, status } = useBoardPolling({ enabled, paused, refresh, intervalMs })

  const time = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  const label = status === 'error' ? 'Offline — retrying' : time ? `Updated ${time}` : 'Live'

  return (
    <p
      className={status === 'error' ? 'board-live-status is-offline' : 'board-live-status'}
      title="The board refreshes every few seconds while this tab is active."
    >
      <span className="board-live-dot" aria-hidden="true" />
      {label}
    </p>
  )
}
