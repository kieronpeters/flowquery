/**
 * Activity filters.
 *
 * Periods are resolved in the browser's own timezone and sent as an instant,
 * because "today" starts at a different moment in Auckland and in London and
 * the Worker only knows UTC. Keeping this out of the component makes it
 * testable without a DOM.
 */

export type ActivityPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

export const ACTIVITY_PERIODS: { value: ActivityPeriod; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All history' },
]

/**
 * Start of the selected period in local time, as milliseconds.
 *
 * Weeks start on Monday: the feed is for a small team, and a week that begins
 * on Sunday splits the weekend in two.
 */
export function periodStart(period: ActivityPeriod, now: Date = new Date()): number | undefined {
  if (period === 'all') return undefined

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === 'week') {
    // getDay(): 0 = Sunday. Shift so Monday is 0.
    const weekday = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - weekday)
  } else if (period === 'month') {
    start.setDate(1)
  } else if (period === 'year') {
    start.setMonth(0, 1)
  }

  return start.getTime()
}

/** Query string for one page, including only the filters that are set. */
export function activityQuery(input: {
  since?: number
  actors: string[]
  before?: number
  limit?: number
}): string {
  const params = new URLSearchParams()

  if (input.before !== undefined) params.set('before', String(input.before))
  if (input.since !== undefined) params.set('since', String(input.since))
  if (input.actors.length > 0) params.set('actors', input.actors.join(','))
  if (input.limit !== undefined) params.set('limit', String(input.limit))

  const query = params.toString()
  return query ? `?${query}` : ''
}

/** Events per page. Deliberately small: the feed is a footnote, not the board. */
export const ACTIVITY_PAGE_SIZE = 10

/**
 * Which page numbers to render.
 *
 * The feed is keyset-paginated, so the total is unknown until the end is
 * reached — there is no "last page" to jump to and no honest total to show.
 * Pages are therefore numbered as they are visited, and a `null` marks a gap
 * that has not been loaded yet.
 *
 * With `last` loaded pages, this keeps the row short: the first page, the
 * current page and its neighbours, and the furthest page reached so far.
 */
export function pageWindow(current: number, last: number): (number | null)[] {
  const safeLast = Math.max(1, last)
  const safeCurrent = Math.min(Math.max(1, current), safeLast)

  if (safeLast <= 7) {
    return Array.from({ length: safeLast }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, safeLast])
  for (let page = safeCurrent - 1; page <= safeCurrent + 1; page += 1) {
    if (page > 1 && page < safeLast) pages.add(page)
  }

  const ordered = [...pages].sort((a, b) => a - b)
  const result: (number | null)[] = []

  for (const page of ordered) {
    const previous = result[result.length - 1]
    if (typeof previous === 'number' && page - previous > 1) result.push(null)
    result.push(page)
  }

  return result
}
