import { describe, expect, it } from 'vitest'

import { isOverdue, matchesFilters, todayIso } from '../src/app/BoardPage'
import type { TaskDto } from '../src/shared/api-types'

/**
 * The board's filtering and overdue rules, tested without a DOM.
 *
 * These are the bits that decide what you see, so they are worth pinning:
 * a wrong overdue rule nags about finished work, and a wrong filter hides it.
 */

function task(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 'tsk_1',
    title: 'Add OAuth sign-in',
    description: '',
    descriptionTruncated: false,
    status: 'backlog',
    position: 0,
    priority: 'high',
    assignee: null,
    dueDate: null,
    version: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('isOverdue', () => {
  it('is true for a past date that is not done', () => {
    expect(isOverdue(task({ dueDate: '2026-11-01' }), '2026-11-03')).toBe(true)
  })

  it('is false on the due date itself', () => {
    expect(isOverdue(task({ dueDate: '2026-11-03' }), '2026-11-03')).toBe(false)
  })

  it('is false once the work is done, however late it was', () => {
    expect(isOverdue(task({ dueDate: '2026-01-01', status: 'done' }), '2026-11-03')).toBe(false)
  })

  it('is false with no due date', () => {
    expect(isOverdue(task({ dueDate: null }), '2026-11-03')).toBe(false)
  })
})

describe('todayIso', () => {
  it('formats the local date, not the UTC one', () => {
    expect(todayIso(new Date(2026, 10, 3, 23, 30))).toBe('2026-11-03')
    expect(todayIso(new Date(2026, 0, 9, 0, 5))).toBe('2026-01-09')
  })
})

describe('matchesFilters', () => {
  const none = { query: '', assigneeId: null, priority: null }

  it('matches everything with no filters', () => {
    expect(matchesFilters(task(), none)).toBe(true)
  })

  it('matches title text case-insensitively', () => {
    expect(matchesFilters(task(), { ...none, query: 'oauth' })).toBe(true)
    expect(matchesFilters(task(), { ...none, query: 'kanban' })).toBe(false)
  })

  it('matches on assignee and priority', () => {
    const assigned = task({
      assignee: { id: 'prf_bob', displayName: 'Bob', roleTitle: 'Engineering Manager' },
    })

    expect(matchesFilters(assigned, { ...none, assigneeId: 'prf_bob' })).toBe(true)
    expect(matchesFilters(assigned, { ...none, assigneeId: 'prf_alex' })).toBe(false)
    expect(matchesFilters(assigned, { ...none, priority: 'high' })).toBe(true)
    expect(matchesFilters(assigned, { ...none, priority: 'low' })).toBe(false)
  })
})
