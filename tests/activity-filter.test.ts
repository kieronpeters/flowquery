import { describe, expect, it } from 'vitest'

import { ACTIVITY_PERIODS, activityQuery, periodStart } from '../src/app/activity-filter'

/**
 * Filter boundaries are local-time questions, so these use local Date
 * construction throughout. The point is that "today" starts at 00:00 where
 * the reader is, not at 00:00 UTC.
 */

const WEDNESDAY = new Date(2026, 10, 4, 15, 30) // 4 November 2026, local time.

function asDate(ms: number | undefined): Date {
  expect(ms).toBeTypeOf('number')
  return new Date(ms as number)
}

describe('periodStart', () => {
  it('has no lower bound for all history', () => {
    expect(periodStart('all', WEDNESDAY)).toBeUndefined()
  })

  it('starts today at local midnight', () => {
    const start = asDate(periodStart('day', WEDNESDAY))

    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(10)
    expect(start.getDate()).toBe(4)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
  })

  it('starts the week on Monday', () => {
    const start = asDate(periodStart('week', WEDNESDAY))

    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(2)
  })

  it('keeps a Monday as the start of its own week', () => {
    const monday = new Date(2026, 10, 2, 9, 0)
    expect(asDate(periodStart('week', monday)).getDate()).toBe(2)
  })

  it('starts the week on the previous Monday for a Sunday', () => {
    const sunday = new Date(2026, 10, 8, 9, 0)
    const start = asDate(periodStart('week', sunday))

    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(2)
  })

  it('starts the month on the first', () => {
    const start = asDate(periodStart('month', WEDNESDAY))

    expect(start.getMonth()).toBe(10)
    expect(start.getDate()).toBe(1)
  })

  it('starts the year on 1 January', () => {
    const start = asDate(periodStart('year', WEDNESDAY))

    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(1)
  })

  it('offers the five periods in widening order, ending with all history', () => {
    expect(ACTIVITY_PERIODS.map((period) => period.value)).toEqual([
      'day',
      'week',
      'month',
      'year',
      'all',
    ])
    expect(ACTIVITY_PERIODS.at(-1)?.label).toBe('All history')
  })
})

describe('activityQuery', () => {
  it('is empty when nothing is filtered', () => {
    expect(activityQuery({ actors: [] })).toBe('')
  })

  it('includes only the filters that are set', () => {
    expect(activityQuery({ since: 1000, actors: [] })).toBe('?since=1000')
    expect(activityQuery({ actors: ['Bob', 'Kieron'] })).toBe('?actors=Bob%2CKieron')
    expect(activityQuery({ before: 500, actors: [] })).toBe('?before=500')
  })

  it('sends cursor, period and people together', () => {
    const query = activityQuery({ before: 500, since: 1000, actors: ['Bob'] })
    const params = new URLSearchParams(query)

    expect(params.get('before')).toBe('500')
    expect(params.get('since')).toBe('1000')
    expect(params.get('actors')).toBe('Bob')
  })
})
