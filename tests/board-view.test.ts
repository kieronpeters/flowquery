import { describe, expect, it } from 'vitest'

import type { BoardRow, ProfileRow, TaskRow } from '../src/worker/domain/types'
import { assembleBoardView, DESCRIPTION_PREVIEW_LENGTH } from '../src/worker/services/board-view'

const board: BoardRow = {
  id: 'brd_test',
  name: 'Test Board',
  description: null,
  created_by: 'usr_test',
  created_at: 1793664000000,
  updated_at: 1793664000000,
  theme: '{}',
}

const profiles: ProfileRow[] = [
  {
    id: 'prf_alex',
    display_name: 'Alex',
    role_title: 'Senior Software Engineer',
    kind: 'ai',
    avatar_path: null,
    active: 1,
  },
]

function task(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'tsk_default',
    board_id: 'brd_test',
    title: 'A task',
    description: '',
    status: 'backlog',
    position: 0,
    priority: 'none',
    assignee_profile_id: null,
    due_date: null,
    version: 1,
    created_at: 1793664000000,
    updated_at: 1793664000000,
    ...overrides,
  }
}

describe('assembleBoardView', () => {
  it('always returns five columns in product order, including empty ones', () => {
    const view = assembleBoardView(board, [], profiles)

    expect(view.columns.map((column) => column.key)).toEqual([
      'backlog',
      'todo',
      'in_progress',
      'review',
      'done',
    ])
    expect(view.columns.every((column) => column.tasks.length === 0)).toBe(true)
    expect(view.board.taskCount).toBe(0)
  })

  it('places tasks in the right column and orders them by position', () => {
    const view = assembleBoardView(
      board,
      [
        task({ id: 'b', status: 'backlog', position: 1 }),
        task({ id: 'a', status: 'backlog', position: 0 }),
        task({ id: 'c', status: 'review', position: 0 }),
      ],
      profiles,
    )

    const backlog = view.columns.find((column) => column.key === 'backlog')
    const review = view.columns.find((column) => column.key === 'review')

    expect(backlog?.tasks.map((item) => item.id)).toEqual(['a', 'b'])
    expect(review?.tasks.map((item) => item.id)).toEqual(['c'])
    expect(view.board.taskCount).toBe(3)
  })

  it('resolves the assignee profile and leaves it null when unassigned', () => {
    const view = assembleBoardView(
      board,
      [
        task({ id: 'assigned', assignee_profile_id: 'prf_alex' }),
        task({ id: 'unassigned', position: 1 }),
      ],
      profiles,
    )

    const tasks = view.columns[0]?.tasks ?? []
    expect(tasks[0]?.assignee).toEqual({
      id: 'prf_alex',
      displayName: 'Alex',
      roleTitle: 'Senior Software Engineer',
    })
    expect(tasks[1]?.assignee).toBeNull()
  })

  it('truncates long descriptions and flags them', () => {
    const long = 'x'.repeat(DESCRIPTION_PREVIEW_LENGTH + 120)
    const view = assembleBoardView(board, [task({ description: long })], profiles)

    const item = view.columns[0]?.tasks[0]
    expect(item?.descriptionTruncated).toBe(true)
    expect(item?.description).toHaveLength(DESCRIPTION_PREVIEW_LENGTH)
  })

  it('leaves short descriptions intact and unflagged', () => {
    const view = assembleBoardView(board, [task({ description: 'short' })], profiles)

    const item = view.columns[0]?.tasks[0]
    expect(item?.descriptionTruncated).toBe(false)
    expect(item?.description).toBe('short')
  })

  it('renders timestamps as ISO strings', () => {
    const view = assembleBoardView(board, [], profiles)

    expect(view.board.createdAt).toBe(new Date(1793664000000).toISOString())
  })
})
