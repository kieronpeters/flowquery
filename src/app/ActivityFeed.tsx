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
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_PERIODS,
  activityQuery,
  pageWindow,
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

/**
 * How the actor is described after their name.
 *
 * A human and an agent can share a name — a token labelled "Bob" and a person
 * called Bob — so the kind is always shown, not inferred from the name.
 */
const ACTOR_KIND: Record<ActivityDto['actorType'], string> = {
  human: 'human',
  agent: 'agent',
  system: 'system',
}

/**
 * Board activity, folded away until asked for.
 *
 * Closed by default and fetched only when opened: most board visits do not
 * read the feed, so it should not cost a request. Pagination is keyset-based
 * and forward-only — the total is unknown, so the page numbers grow as you
 * walk them rather than pretending to know where the end is.
 */
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
  const [open, setOpen] = useState(false)

  const [pages, setPages] = useState<ActivityDto[][]>([])
  const [cursors, setCursors] = useState<(number | null)[]>([])
  const [page, setPage] = useState(1)
  const [roster, setRoster] = useState<ActivityActorDto[]>([])

  const [loading, setLoading] = useState(false)
  const [loadingPage, setLoadingPage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [period, setPeriod] = useState<ActivityPeriod>('all')
  const [selected, setSelected] = useState<string[]>([])

  const since = periodStart(period)
  // A string, so the effect compares by value rather than array identity.
  const actorKey = selected.join(',')

  const fetchPage = useCallback(
    async (before?: number): Promise<ActivityPageDto> => {
      const query = activityQuery({
        since,
        actors: actorKey === '' ? [] : actorKey.split(','),
        before,
        limit: ACTIVITY_PAGE_SIZE,
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
    // Nothing is fetched until the accordion is opened.
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setPages([])
    setCursors([])
    setPage(1)

    fetchPage()
      .then((first) => {
        if (cancelled) return
        setPages([first.events])
        setCursors([first.nextBefore])
        setRoster(first.actors)
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
  }, [open, fetchPage, refreshKey])

  async function goToPage(target: number) {
    if (target === page || target < 1) return

    if (target <= pages.length) {
      setPage(target)
      return
    }

    // Only the page after the last loaded one can be fetched: the cursor for
    // it is the only one we hold.
    if (target !== pages.length + 1) return

    const cursor = cursors[cursors.length - 1]
    if (cursor === null || cursor === undefined) return

    setLoadingPage(true)
    try {
      const next = await fetchPage(cursor)
      setPages((current) => [...current, next.events])
      setCursors((current) => [...current, next.nextBefore])
      setPage(target)
    } catch {
      setError('That page could not be loaded.')
    } finally {
      setLoadingPage(false)
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
  const events = pages[page - 1] ?? []
  const lastPage = Math.max(1, pages.length)
  const hasMore = cursors.length > 0 && cursors[cursors.length - 1] !== null

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
      <h2 id="activity-heading" className="activity-heading">
        <button
          className="activity-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="activity-body"
          onClick={() => setOpen((current) => !current)}
        >
          <span>Activity</span>
          <span className="activity-chevron" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
        </button>
      </h2>

      {open && (
        <div className="activity-body" id="activity-body">
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

            <span className="activity-order">Newest first</span>
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
                    <span className="activity-who">
                      {event.actorName} ({ACTOR_KIND[event.actorType] ?? event.actorType})
                    </span>{' '}
                    <span className="activity-what">{describe(event, profiles)}</span>{' '}
                    <time className="activity-when" dateTime={event.createdAt}>
                      {when(event.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>

              <nav className="activity-pages" aria-label="Activity pages">
                <button
                  className="activity-page"
                  type="button"
                  onClick={() => void goToPage(page - 1)}
                  disabled={page === 1 || loadingPage}
                >
                  Previous
                </button>

                {pageWindow(page, lastPage).map((number, index) =>
                  number === null ? (
                    <span className="activity-gap" key={`gap-${index}`} aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <button
                      className="activity-page"
                      key={number}
                      type="button"
                      aria-current={number === page ? 'page' : undefined}
                      onClick={() => void goToPage(number)}
                      disabled={loadingPage}
                    >
                      {number}
                    </button>
                  ),
                )}

                {hasMore && (
                  <span className="activity-gap" aria-hidden="true">
                    …
                  </span>
                )}

                <button
                  className="activity-page"
                  type="button"
                  onClick={() => void goToPage(lastPage + 1)}
                  disabled={!hasMore || loadingPage}
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </div>
      )}
    </section>
  )
}
