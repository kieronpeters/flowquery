import { useCallback, useEffect, useState } from 'react'

import type {
  ActivityActorDto,
  ActivityDto,
  ActivityPageDto,
  BoardTheme,
  ProfileDto,
} from '../shared/api-types'
import { COLUMNS } from '../shared/columns'
import {
  ACTIVITY_PERIODS,
  activityQuery,
  periodStart,
  type ActivityPeriod,
} from './activity-filter'
import { inkFor } from './theme'

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
  theme,
}: {
  boardId: string
  refreshKey: number
  profiles: ProfileDto[]
  theme?: BoardTheme
}) {
  const [events, setEvents] = useState<ActivityDto[]>([])
  const [roster, setRoster] = useState<ActivityActorDto[]>([])
  const [nextBefore, setNextBefore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [period, setPeriod] = useState<ActivityPeriod>('all')
  const [selected, setSelected] = useState<string[]>([])

  const since = periodStart(period)
  // A string, so the effect compares by value and does not refetch on every
  // render just because the array identity changed.
  const actorKey = selected.join(',')

  const fetchPage = useCallback(
    async (before?: number): Promise<ActivityPageDto> => {
      const query = activityQuery({
        since,
        actors: actorKey === '' ? [] : actorKey.split(','),
        before,
      })
      const response = await fetch(`/api/v1/boards/${boardId}/activity${query}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const body = (await response.json()) as Partial<ActivityPageDto>

      // A bad payload should degrade this panel, not take the board down with
      // it. The feed is secondary; the board is not.
      if (!body || !Array.isArray(body.events)) throw new Error('Unexpected activity payload')

      return {
        events: body.events,
        nextBefore: typeof body.nextBefore === 'number' ? body.nextBefore : null,
        actors: Array.isArray(body.actors) ? body.actors : [],
      }
    },
    [boardId, since, actorKey],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchPage()
      .then((page) => {
        if (cancelled) return
        setEvents(page.events)
        setNextBefore(page.nextBefore)
        setRoster(page.actors)
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
      setEvents((current) => [...current, ...page.events])
      setNextBefore(page.nextBefore)
    } catch {
      setError('Older activity could not be loaded.')
    } finally {
      setLoadingMore(false)
    }
  }

  function toggleActor(name: string) {
    setSelected((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    )
  }

  function resetFilters() {
    setPeriod('all')
    setSelected([])
  }

  const filtered = period !== 'all' || selected.length > 0
  const background = theme?.activity

  return (
    <section
      className="activity"
      data-custom={background ? 'true' : undefined}
      style={
        background
          ? ({ background, '--activity-fg': inkFor(background) } as React.CSSProperties)
          : undefined
      }
      aria-labelledby="activity-heading"
    >
      <div className="activity-head">
        <h2 id="activity-heading" className="section-heading">
          Activity
        </h2>
        <span className="activity-order">Newest first</span>
      </div>

      <div className="activity-filters">
        <label className="activity-filter">
          <span className="activity-filter-label">Period</span>
          <select
            className="activity-select"
            value={period}
            onChange={(event) => setPeriod(event.target.value as ActivityPeriod)}
          >
            {ACTIVITY_PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {roster.length > 0 && (
          <fieldset className="activity-people">
            <legend className="activity-filter-label">Who</legend>

            {roster.map((actor) => (
              <label className="activity-person" key={actor.name}>
                <input
                  type="checkbox"
                  checked={selected.includes(actor.name)}
                  onChange={() => toggleActor(actor.name)}
                />
                <span>{actor.name}</span>
                <span className="activity-person-count" aria-hidden="true">
                  {actor.count}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {filtered && (
          <button className="button button-quiet inline" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        )}
      </div>

      {loading ? (
        <p role="status">Loading activity…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : events.length === 0 ? (
        filtered ? (
          <p className="empty">
            Nothing matches these filters.{' '}
            <button className="button button-quiet inline" type="button" onClick={resetFilters}>
              Show everything
            </button>
          </p>
        ) : (
          <p className="empty">Nothing has happened on this board yet.</p>
        )
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
