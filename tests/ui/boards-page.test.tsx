// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BoardsPage } from '../../src/app/BoardsPage'

/**
 * The dashboard, where the dangerous action lives.
 *
 * Deletion is permanent (DEC-007), so the tests here are mostly about what must
 * *not* happen: no request until the exact name is typed.
 */

const boards = [
  {
    id: 'brd_1',
    name: 'FlowQuery Development',
    createdAt: '2026-11-03T00:00:00.000Z',
    updatedAt: '2026-11-03T00:00:00.000Z',
    taskCount: 9,
  },
  {
    id: 'brd_2',
    name: 'Second board',
    createdAt: '2026-11-02T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
    taskCount: 0,
  },
]

type Call = { url: string; method: string; body: unknown }

function mockApi(handler?: (call: Call) => Response | null) {
  const calls: Call[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      const call = { url, method, body }
      calls.push(call)

      const override = handler?.(call)
      if (override) return override

      if (url.endsWith('/auth/me')) {
        return Response.json({
          user: { id: 'usr_1', displayName: 'Kieron', email: 'k@example.com' },
        })
      }
      if (url.endsWith('/api/v1/boards') && method === 'GET') {
        return Response.json({ boards })
      }
      if (method === 'DELETE') return new Response(null, { status: 204 })
      if (method === 'POST') return Response.json({ board: boards[0] }, { status: 201 })

      return Response.json({})
    }),
  )

  return { calls }
}

function renderDashboard() {
  render(
    <MemoryRouter initialEntries={['/boards']}>
      <Routes>
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/login" element={<p>sign in page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('BoardsPage', () => {
  it('lists every board with its task count', async () => {
    mockApi()
    renderDashboard()

    expect(await screen.findByText('FlowQuery Development')).toBeTruthy()
    expect(screen.getByText('Second board')).toBeTruthy()
    expect(screen.getByText(/9 tasks/)).toBeTruthy()
    expect(screen.getByText('Every board, newest first.')).toBeTruthy()
  })

  it('sends the visitor to sign in when the session has expired', async () => {
    mockApi((call) =>
      call.url.endsWith('/api/v1/boards') && call.method === 'GET'
        ? Response.json({}, { status: 401 })
        : null,
    )
    renderDashboard()

    expect(await screen.findByText('sign in page')).toBeTruthy()
  })

  it('will not delete until the exact name is typed', async () => {
    const { calls } = mockApi()
    renderDashboard()

    const row = (await screen.findByText('FlowQuery Development')).closest(
      '.board-row',
    ) as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }))

    const confirm = screen.getByLabelText('Board name confirmation')
    const destroy = screen.getByRole('button', { name: 'Delete permanently' }) as HTMLButtonElement
    expect(destroy.disabled).toBe(true)

    await userEvent.type(confirm, 'flowquery')
    expect(destroy.disabled).toBe(true)
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)

    await userEvent.clear(confirm)
    await userEvent.type(confirm, 'FlowQuery Development')
    expect(destroy.disabled).toBe(false)

    await userEvent.click(destroy)

    await waitFor(() => {
      const deletion = calls.find((call) => call.method === 'DELETE')
      expect(deletion).toBeTruthy()
      expect(JSON.parse(JSON.stringify(deletion!.body))).toMatchObject({
        confirmName: 'FlowQuery Development',
      })
    })
  })

  it('does nothing when the deletion is cancelled', async () => {
    const { calls } = mockApi()
    renderDashboard()

    const row = (await screen.findByText('FlowQuery Development')).closest(
      '.board-row',
    ) as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }))

    const panel = screen.getByRole('group', { name: /Delete FlowQuery Development/ })
    await userEvent.click(within(panel).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('Board name confirmation')).toBeNull()
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
  })

  it('creates a board with the trimmed name', async () => {
    const { calls } = mockApi()
    renderDashboard()

    await screen.findByText('FlowQuery Development')

    const input = screen.getByPlaceholderText('e.g. Website relaunch')
    await userEvent.type(input, '  New board  ')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      const post = calls.find((call) => call.method === 'POST')
      expect(post).toBeTruthy()
    })

    const post = calls.find((call) => call.method === 'POST')!
    expect(post.body).toEqual({ name: 'New board' })
  })
})
