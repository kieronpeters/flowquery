import { describe, expect, it } from 'vitest'

import { boardSignature } from '../src/app/board-state'
import type { BoardView, TaskDto } from '../src/shared/api-types'

function task(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 'tsk_1',
    title: 'Card one',
    description: '',
    descriptionTruncated: false,
    status: 'backlog',
    position: 0,
    priority: 'none',
    assignee: null,
    dueDate: null,
    version: 1,
    createdAt: '2026-11-03T00:00:00.000Z',
    updatedAt: '2026-11-03T00:00:00.000Z',
    ...overrides,
  }
}

function view(tasks: TaskDto[]): BoardView {
  return {
    board: {
      id: 'brd_demo',
      name: 'Board',
      description: null,
      createdAt: '2026-11-03T00:00:00.000Z',
      updatedAt: '2026-11-03T00:00:00.000Z',
      taskCount: tasks.length,
    },
    theme: {},
    columns: [
      { key: 'backlog', name: 'Backlog', position: 0, taskCount: tasks.length, tasks },
      { key: 'todo', name: 'To Do', position: 1, taskCount: 0, tasks: [] },
      { key: 'in_progress', name: 'In Progress', position: 2, taskCount: 0, tasks: [] },
      { key: 'review', name: 'Review', position: 3, taskCount: 0, tasks: [] },
      { key: 'done', name: 'Done', position: 4, taskCount: 0, tasks: [] },
    ],
  }
}

describe('boardSignature', () => {
  it('is stable for an unchanged board', () => {
    expect(boardSignature(view([task()]))).toBe(boardSignature(view([task()])))
  })

  it('changes when a task is created, updated or moved', () => {
    const base = view([task()])

    expect(boardSignature(view([task(), task({ id: 'tsk_2', title: 'Card two' })]))).not.toBe(
      boardSignature(base),
    )
    expect(boardSignature(view([task({ title: 'Renamed' })]))).not.toBe(boardSignature(base))
    expect(boardSignature(view([task({ status: 'todo' })]))).not.toBe(boardSignature(base))
  })
})
