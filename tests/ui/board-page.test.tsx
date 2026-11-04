// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BoardPage } from '../../src/app/BoardPage'
import type { BoardTheme, BoardView, TaskDto } from '../../src/shared/api-types'

/**
 * The board page: rendering, opening a task, and the keyboard move path that
 * exists so drag-and-drop is never the only way to move work (TASK-008).
 *
 * A real drag cannot be driven here — dnd-kit needs pointer input that jsdom
 * does not produce — so the gesture itself is verified in a browser instead.
 * What these cover is the wiring either way: the same endpoint, the same
 * optimistic update, the same reconciliation.
 */

function makeTask(overrides: Partial<TaskDto>): TaskDto {
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

function boardWith(backlog: TaskDto[], review: TaskDto[]): BoardView {
  return {
    board: {
      id: 'brd_demo',
      name: 'FlowQuery Development',
      createdAt: '2026-11-03T00:00:00.000Z',
      updatedAt: '2026-11-03T00:00:00.000Z',
      taskCount: backlog.length + review.length,
    },
    theme: {},
    columns: [
      { key: 'backlog', name: 'Backlog', position: 0, taskCount: backlog.length, tasks: backlog },
      { key: 'todo', name: 'To Do', position: 1, taskCount: 0, tasks: [] },
      { key: 'in_progress', name: 'In Progress', position: 2, taskCount: 0, tasks: [] },
      { key: 'review', name: 'Review', position: 3, taskCount: review.length, tasks: review },
      { key: 'done', name: 'Done', position: 4, taskCount: 0, tasks: [] },
    ],
  }
}

const cardOne = makeTask({ id: 'tsk_1', title: 'Card one', status: 'backlog', position: 0 })
const cardTwo = makeTask({ id: 'tsk_2', title: 'Card two', status: 'review', position: 0 })

/** The board after Card one moves one column right, into To Do. */
const movedBoard: BoardView = {
  board: {
    id: 'brd_demo',
    name: 'FlowQuery Development',
    createdAt: '2026-11-03T00:00:00.000Z',
    updatedAt: '2026-11-03T00:00:00.000Z',
    taskCount: 2,
  },
  theme: {},
  columns: [
    { key: 'backlog', name: 'Backlog', position: 0, taskCount: 0, tasks: [] },
    {
      key: 'todo',
      name: 'To Do',
      position: 1,
      taskCount: 1,
      tasks: [
        makeTask({ id: 'tsk_1', title: 'Card one', status: 'todo', position: 0, version: 2 }),
      ],
    },
    { key: 'in_progress', name: 'In Progress', position: 2, taskCount: 0, tasks: [] },
    { key: 'review', name: 'Review', position: 3, taskCount: 1, tasks: [cardTwo] },
    { key: 'done', name: 'Done', position: 4, taskCount: 0, tasks: [] },
  ],
}

type Call = { url: string; method: string; body: unknown }

function mockApi(overrides: { moveStatus?: number; theme?: BoardTheme } = {}) {
  const calls: Call[] = []
  const initial = { ...boardWith([cardOne], [cardTwo]), theme: overrides.theme ?? {} }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ url, method, body })

      if (url.endsWith('/api/v1/profiles')) {
        return Response.json({
          profiles: [
            {
              id: 'prf_alex',
              displayName: 'Alex',
              roleTitle: 'Engineer',
              kind: 'ai',
              avatarPath: null,
            },
          ],
        })
      }

      if (url.endsWith('/move')) {
        if (overrides.moveStatus === 409) {
          return Response.json({ error: { code: 'CONFLICT', message: 'stale' } }, { status: 409 })
        }
        return Response.json({ board: movedBoard, task: movedBoard.columns[1]!.tasks[0]! })
      }

      if (url.endsWith('/comments')) {
        return Response.json({ comments: [] })
      }
      if (url.endsWith('/activity')) {
        return Response.json({ events: [], nextBefore: null })
      }
      if (url.includes('/tasks/') && method === 'GET') {
        return Response.json({ task: cardOne })
      }

      // The board view, and any refetch of it.
      return Response.json(initial)
    }),
  )

  return { calls }
}

function renderBoard() {
  render(
    <MemoryRouter initialEntries={['/boards/brd_demo']}>
      <Routes>
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/login" element={<p>sign in page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('BoardPage', () => {
  it('renders the five columns and their cards', async () => {
    mockApi()
    renderBoard()

    expect(await screen.findByText('Card one')).toBeTruthy()
    expect(screen.getByText('Card two')).toBeTruthy()

    for (const name of ['Backlog', 'To Do', 'In Progress', 'Review', 'Done']) {
      expect(screen.getByRole('heading', { name })).toBeTruthy()
    }
  })

  it('opens a task when its card is clicked', async () => {
    mockApi()
    renderBoard()

    await userEvent.click(await screen.findByText('Card one'))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(await screen.findByDisplayValue('Card one')).toBeTruthy()
  })

  it('moves a task to the next column with the keyboard path', async () => {
    const { calls } = mockApi()
    renderBoard()

    await userEvent.click(await screen.findByText('Card one'))
    const dialog = await screen.findByRole('dialog')

    const nextColumn = within(dialog).getByRole('button', {
      name: 'Move to the next column',
    })
    await userEvent.click(nextColumn)

    await waitFor(() => {
      const move = calls.find((call) => call.url.endsWith('/move'))
      expect(move).toBeTruthy()
    })

    const move = calls.find((call) => call.url.endsWith('/move'))!
    expect(move.url).toContain('/api/v1/boards/brd_demo/tasks/tsk_1/move')
    expect(move.body).toEqual({ status: 'todo', position: 0, expectedVersion: 1 })

    // The server's board replaces the optimistic one.
    const todo = await screen.findByRole('region', { name: 'To Do' })
    expect(await within(todo).findByText('Card one')).toBeTruthy()
  })

  it('keeps the dragged card on screen while it is outside its column', async () => {
    mockApi()
    renderBoard()

    const card = await screen.findByText('Card one')
    const button = card.closest('button')!
    button.focus()

    // dnd-kit's keyboard sensor: space picks the item up.
    await userEvent.keyboard(' ')

    // The card must still be rendered, in a portal, while dragging.
    await waitFor(() => {
      const overlay = document.querySelector('.drag-overlay')
      expect(overlay).toBeTruthy()
      expect(overlay?.textContent).toContain('Card one')
    })

    // Cancel so the test does not leave a drag active.
    await userEvent.keyboard('{Escape}')
  })

  it('says so and refetches when the move conflicts', async () => {
    const { calls } = mockApi({ moveStatus: 409 })
    renderBoard()

    await userEvent.click(await screen.findByText('Card one'))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move to the next column' }))

    expect(await screen.findByText(/Someone changed that task first/i)).toBeTruthy()

    // A refetch happened: more than one board read.
    const boardReads = calls.filter(
      (call) => call.method === 'GET' && call.url.endsWith('/api/v1/boards/brd_demo'),
    )
    expect(boardReads.length).toBeGreaterThan(1)
  })

  it('applies a board ticket colour to every card', async () => {
    mockApi({ theme: { tickets: '#1e2433' } })
    renderBoard()

    const backlog = await screen.findByRole('region', { name: 'Backlog' })
    expect(backlog.style.getPropertyValue('--card-bg')).toBe('#1e2433')
    expect(backlog.style.getPropertyValue('--card-fg')).toBe('#e6e9f2')
  })

  it('tints cards with their own column when no ticket colour is set', async () => {
    mockApi({ theme: { columns: { backlog: '#dff2e4' } } })
    renderBoard()

    const backlog = await screen.findByRole('region', { name: 'Backlog' })
    const tint = backlog.style.getPropertyValue('--card-bg')

    // A pale column lifts toward white, and the ink flips to dark.
    expect(tint).not.toBe('#dff2e4')
    expect(backlog.style.getPropertyValue('--card-fg')).toBe('#0b1020')
  })

  it('offers a touch drag handle on every card', async () => {
    mockApi()
    renderBoard()

    const handle = await screen.findByRole('button', { name: 'Drag Card one' })

    // The handle must be its own control, not nested inside the card button,
    // or tapping it would open the task instead of starting a drag.
    expect(handle.tagName).toBe('BUTTON')
    expect(handle.closest('button')).toBe(handle)
    expect(handle.className).toContain('card-handle')
  })

  it('switches columns with the tab bar', async () => {
    mockApi()
    renderBoard()

    await screen.findByText('Card one')

    const backlog = screen.getByRole('button', { name: /^Backlog/ })
    const review = screen.getByRole('button', { name: /^Review/ })

    expect(backlog.getAttribute('aria-pressed')).toBe('true')
    expect(review.getAttribute('aria-pressed')).toBe('false')

    await userEvent.click(review)

    expect(review.getAttribute('aria-pressed')).toBe('true')
    expect(backlog.getAttribute('aria-pressed')).toBe('false')
  })

  it('filters cards by search text', async () => {
    mockApi()
    renderBoard()

    await screen.findByText('Card one')

    await userEvent.type(screen.getByLabelText('Search tasks'), 'two')

    expect(screen.queryByText('Card one')).toBeNull()
    expect(screen.getByText('Card two')).toBeTruthy()
  })

  it('focuses the search box when / is pressed', async () => {
    mockApi()
    renderBoard()

    await screen.findByText('Card one')
    await userEvent.keyboard('/')

    expect(document.activeElement).toBe(screen.getByLabelText('Search tasks'))
  })

  it('opens a new task when n is pressed', async () => {
    mockApi()
    renderBoard()

    await screen.findByText('Card one')
    await userEvent.keyboard('n')

    expect(await screen.findByRole('dialog')).toBeTruthy()
  })

  it('deletes a task with an undo window, and undo really cancels it', async () => {
    const { calls } = mockApi()
    renderBoard()

    await userEvent.click(await screen.findByText('Card one'))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete permanently' }))

    // Gone from the board immediately, but not yet gone from the server.
    expect(screen.queryByText('Card one')).toBeNull()
    expect(document.querySelector('.undo-toast')?.textContent).toContain('Deleted')

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(await screen.findByText('Card one')).toBeTruthy()
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
  })

  it('gives the activity box its own surface', async () => {
    mockApi({ theme: { activity: '#141a2e' } })
    renderBoard()

    const feed = await screen.findByRole('region', { name: 'Activity' })
    expect(feed.getAttribute('data-custom')).toBe('true')
    expect(feed.style.getPropertyValue('--activity-fg')).toBe('#e6e9f2')
  })
})
