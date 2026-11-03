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
}): string {
  const params = new URLSearchParams()

  if (input.before !== undefined) params.set('before', String(input.before))
  if (input.since !== undefined) params.set('since', String(input.since))
  if (input.actors.length > 0) params.set('actors', input.actors.join(','))

  const query = params.toString()
  return query ? `?${query}` : ''
}
