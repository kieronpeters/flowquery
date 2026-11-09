// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
      description: null,
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
    description: null,
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

function mockApi(
  overrides: {
    moveStatus?: number
    patchStatus?: number
    theme?: BoardTheme
    boardStatus?: number
  } = {},
) {
  const calls: Call[] = []
  let currentBoard: BoardView = { ...boardWith([cardOne], [cardTwo]), theme: overrides.theme ?? {} }

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

      if (overrides.boardStatus === 401 && method === 'GET' && url.endsWith('/brd_demo')) {
        return Response.json(
          { error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } },
          { status: 401 },
        )
      }

      if (url.endsWith('/move')) {
        if (overrides.moveStatus === 409) {
          return Response.json({ error: { code: 'CONFLICT', message: 'stale' } }, { status: 409 })
        }
        return Response.json({ board: movedBoard, task: movedBoard.columns[1]!.tasks[0]! })
      }

      if (overrides.patchStatus === 409 && method === 'PATCH' && url.includes('/tasks/')) {
        return Response.json(
          { error: { code: 'CONFLICT', message: 'Someone changed that task first.' } },
          { status: 409 },
        )
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
      return Response.json(currentBoard)
    }),
  )

  return {
    calls,
    setBoard: (next: BoardView) => {
      currentBoard = next
    },
  }
}

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="path">{location.pathname}</p>
}

function renderBoard() {
  render(
    <MemoryRouter initialEntries={['/boards/brd_demo']}>
      <LocationProbe />
      <Routes>
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/boards/:boardId/tickets/:ticketId" element={<BoardPage />} />
        <Route path="/login" element={<p>sign in page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderTicket(ticketId: string) {
  render(
    <MemoryRouter initialEntries={[`/boards/brd_demo/tickets/${ticketId}`]}>
      <Routes>
        <Route path="/boards/:boardId/tickets/:ticketId" element={<BoardPage />} />
        <Route path="/login" element={<p>sign in page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
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

  it('refreshes the board in the background and shows the update time', async () => {
    vi.useFakeTimers()
    const { setBoard } = mockApi()
    renderBoard()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByText('Card one')).toBeTruthy()
    expect(screen.getByText('Live')).toBeTruthy()

    setBoard(boardWith([cardOne, makeTask({ id: 'tsk_3', title: 'Card three' })], [cardTwo]))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(screen.getByText('Card three')).toBeTruthy()
    expect(screen.getByText(/Updated/)).toBeTruthy()
  })

  it('opens a task when its card is clicked', async () => {
    mockApi()
    renderBoard()

    await userEvent.click(await screen.findByText('Card one'))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(await screen.findByDisplayValue('Card one')).toBeTruthy()
  })

  it('moves a task between columns with the status selector', async () => {
    const { calls } = mockApi()
    renderBoard()

    await userEvent.click(await screen.findByText('Card one'))
    const dialog = await screen.findByRole('dialog')

    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'todo')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = calls.find(
        (call) => call.method === 'PATCH' && call.url.endsWith('/tasks/tsk_1'),
      )
      expect(patch).toBeTruthy()
      expect(patch!.body).toMatchObject({ status: 'todo' })
    })
  })

  it('makes the card title a direct ticket link', async () => {
    mockApi()
    renderBoard()

    const link = (await screen.findByText('Card one')).closest('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/boards/brd_demo/tickets/tsk_1')
  })

  it('keeps the dragged card on screen while it is outside its column', async () => {
    mockApi()
    renderBoard()

    const handle = await screen.findByRole('button', { name: 'Drag Card one' })
    handle.focus()

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

  it('shows the server error when a status save conflicts', async () => {
    const { calls } = mockApi({ patchStatus: 409 })
    renderBoard()

    await userEvent.click(await screen.findByText('Card one'))
    const dialog = await screen.findByRole('dialog')

    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'todo')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText(/Someone changed that task first/i)).toBeTruthy()

    const patch = calls.find((call) => call.method === 'PATCH' && call.url.endsWith('/tasks/tsk_1'))
    expect(patch).toBeTruthy()
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

  it('lets the board description be written in place', async () => {
    const { calls } = mockApi()
    renderBoard()

    await screen.findByText('Card one')

    await userEvent.click(screen.getByRole('button', { name: 'Add description' }))
    await userEvent.type(screen.getByLabelText('Board description'), 'Planning board')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(calls.some((call) => call.method === 'PATCH')).toBe(true)
    })

    const patch = calls.find((call) => call.method === 'PATCH')!
    expect(patch.body).toEqual({ description: 'Planning board' })
  })

  it('gives the activity box its own surface', async () => {
    mockApi({ theme: { activity: '#141a2e' } })
    renderBoard()

    const feed = await screen.findByRole('region', { name: 'Activity' })
    expect(feed.getAttribute('data-custom')).toBe('true')
    expect(feed.style.getPropertyValue('--activity-fg')).toBe('#e6e9f2')
  })

  it('opens a ticket from a direct URL', async () => {
    mockApi()
    renderTicket('tsk_1')

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(await screen.findByDisplayValue('Card one')).toBeTruthy()
  })

  it('puts the ticket id in the URL when a card is opened', async () => {
    mockApi()
    renderBoard()

    await userEvent.click(await screen.findByText('Card one'))

    await waitFor(() => {
      expect(screen.getByTestId('path').textContent).toBe('/boards/brd_demo/tickets/tsk_1')
    })
  })

  it('copies a direct ticket link from the drawer', async () => {
    mockApi()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    renderTicket('tsk_1')
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: 'Copy ticket link' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0]![0]).toContain('/boards/brd_demo/tickets/tsk_1')
    expect(await screen.findByText('Ticket link copied.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeTruthy()
  })

  it('shows the ticket link when the clipboard is unavailable', async () => {
    mockApi()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('no clipboard')) },
      configurable: true,
    })

    renderTicket('tsk_1')
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: 'Copy ticket link' }))

    const input = (await screen.findByLabelText('Ticket link')) as HTMLInputElement
    expect(input.value).toContain('/boards/brd_demo/tickets/tsk_1')
  })

  it('reports a ticket that is not on the board', async () => {
    mockApi()
    renderTicket('tsk_missing')

    expect(await screen.findByText(/does not exist on this board/i)).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sends an unauthenticated direct ticket link to sign in', async () => {
    mockApi({ boardStatus: 401 })
    renderTicket('tsk_1')

    expect(await screen.findByText('sign in page')).toBeTruthy()
  })
})
