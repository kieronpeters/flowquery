import { useCallback, useEffect, useState } from 'react'

import type { ActivityDto, ActivityPageDto, ProfileDto } from '../shared/api-types'
import { COLUMNS } from '../shared/columns'

function columnName(value: unknown): string {
  const column = COLUMNS.find((item) => item.key === value)
  return column ? column.name : String(value ?? 'unknown')
}

function profileName(value: unknown, profiles: ProfileDto[]): string {
  if (!value) return 'Unassigned'
  return profiles.find((profile) => profile.id === value)?.displayName ?? String(value)
}

/**
 * Turns a stored event into one short sentence.
 *
 * The payload holds ids and short values, never task descriptions, so this
 * stays cheap and never renders user text as markup.
 */
function describe(event: ActivityDto, profiles: ProfileDto[]): string {
  const payload = event.payload

  switch (event.eventType) {
    case 'task.created':
      return `created “${payload.title}” in ${columnName(payload.status)}`
    case 'task.moved':
      return `moved a task from ${columnName(payload.from)} to ${columnName(payload.to)}`
    case 'task.title_changed':
      return `renamed a task to “${payload.to}”`
    case 'task.description_changed':
      return 'edited a task description'
    case 'task.priority_changed':
      return `changed priority from ${String(payload.from)} to ${String(payload.to)}`
    case 'task.due_date_changed':
      return payload.to ? `set a due date of ${String(payload.to)}` : 'cleared a due date'
    case 'task.assignee_changed':
      return payload.to ? `assigned ${profileName(payload.to, profiles)}` : 'unassigned a task'
    case 'task.deleted':
      return `deleted “${payload.title}”`
    case 'comment.added':
      return `commented: “${payload.preview}”`
    default:
      return event.eventType
  }
}

function when(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ActivityFeed({
  boardId,
  refreshKey,
  profiles,
}: {
  boardId: string
  refreshKey: number
  profiles: ProfileDto[]
}) {
  const [events, setEvents] = useState<ActivityDto[]>([])
  const [nextBefore, setNextBefore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (before?: number): Promise<ActivityPageDto | null> => {
      const query = before ? `?before=${before}` : ''
      const response = await fetch(`/api/v1/boards/${boardId}/activity${query}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()) as ActivityPageDto
    },
    [boardId],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchPage()
      .then((page) => {
        if (cancelled || !page) return
        setEvents(page.events)
        setNextBefore(page.nextBefore)
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError('Activity could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchPage, refreshKey])

  async function loadMore() {
    if (!nextBefore || loadingMore) return
    setLoadingMore(true)

    try {
      const page = await fetchPage(nextBefore)
      if (page) {
        setEvents((current) => [...current, ...page.events])
        setNextBefore(page.nextBefore)
      }
    } catch {
      setError('Older activity could not be loaded.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section className="activity" aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="section-heading">
        Activity
      </h2>

      {loading ? (
        <p role="status">Loading activity…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : events.length === 0 ? (
        <p className="empty">Nothing has happened on this board yet.</p>
      ) : (
        <>
          <ol className="activity-list">
            {events.map((event) => (
              <li key={event.id} className="activity-item">
                <span className="activity-who">{event.actorName}</span>{' '}
                <span className="activity-what">{describe(event, profiles)}</span>{' '}
                <time className="activity-when" dateTime={event.createdAt}>
                  {when(event.createdAt)}
                </time>
              </li>
            ))}
          </ol>

          {nextBefore && (
            <button
              className="button"
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load older'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
