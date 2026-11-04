// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TaskDrawer } from '../../src/app/TaskDrawer'
import type { TaskDto } from '../../src/shared/api-types'

/**
 * The task dialog is the most interactive surface in the app and, until now,
 * the least tested: every other test runs against the Worker.
 *
 * These check behaviour a user would notice — that fields load, that saving
 * carries the version guard, and that deletion takes two deliberate clicks.
 */

const task: TaskDto = {
  id: 'tsk_1',
  title: 'Ship the board',
  description: 'Full description here',
  descriptionTruncated: false,
  status: 'todo',
  position: 1,
  priority: 'high',
  assignee: { id: 'prf_alex', displayName: 'Alex', roleTitle: 'Engineer' },
  dueDate: '2026-12-01',
  version: 3,
  createdAt: '2026-11-03T00:00:00.000Z',
  updatedAt: '2026-11-03T00:00:00.000Z',
}

type Call = { url: string; method: string; body: unknown }

function mockApi(options: { comments?: unknown[] } = {}) {
  const calls: Call[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = init?.body ? JSON.parse(String(init.body)) : undefined

    calls.push({ url, method, body })

    if (url.endsWith('/comments') && method === 'GET') {
      return new Response(JSON.stringify({ comments: options.comments ?? [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    if (url.includes('/tasks/') && method === 'GET') {
      return new Response(JSON.stringify({ task }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    if (method === 'DELETE') return new Response(null, { status: 204 })
    if (method === 'PATCH') {
      return new Response(JSON.stringify({ task: { ...task, version: 4 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({}), { status: 200 })
  })

  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

afterEach(() => {
  // Testing Library's automatic cleanup relies on a global afterEach, which
  // this config does not enable. Without this, rendered dialogs accumulate and
  // queries start matching the previous test's DOM.
  cleanup()
  vi.unstubAllGlobals()
})

function renderDrawer(overrides: Partial<Parameters<typeof TaskDrawer>[0]> = {}) {
  const onClose = vi.fn()
  const onChanged = vi.fn(async () => {})

  render(
    <TaskDrawer
      boardId="brd_demo"
      mode={{ kind: 'edit', taskId: 'tsk_1' }}
      profiles={[
        {
          id: 'prf_alex',
          displayName: 'Alex',
          roleTitle: 'Engineer',
          kind: 'ai',
          avatarPath: null,
          avatarUrl: null,
        },
        {
          id: 'prf_user_usr_1',
          displayName: 'Kieron',
          roleTitle: 'Administrator',
          kind: 'human',
          avatarPath: null,
          avatarUrl: null,
        },
        {
          id: 'prf_contractor',
          displayName: 'Contractor',
          roleTitle: 'External Specialist',
          kind: 'contractor',
          avatarPath: null,
          avatarUrl: null,
        },
      ]}
      onClose={onClose}
      onChanged={onChanged}
      {...overrides}
    />,
  )

  return { onClose, onChanged }
}

describe('TaskDrawer', () => {
  it('labels each assignee as human or AI agent', async () => {
    renderDrawer()

    const assignee = await screen.findByLabelText('Assignee')

    expect(within(assignee).getByRole('option', { name: 'Kieron · Human' })).toBeTruthy()
    expect(within(assignee).getByRole('option', { name: 'Alex · AI Agent' })).toBeTruthy()
    // The contractor is an AI agent too, and reads as one.
    expect(within(assignee).getByRole('option', { name: 'Contractor · AI Agent' })).toBeTruthy()
  })

  it('loads the task and shows every field', async () => {
    mockApi()
    renderDrawer()

    expect(await screen.findByDisplayValue('Ship the board')).toBeTruthy()
    expect(screen.getByDisplayValue('Full description here')).toBeTruthy()
    expect(screen.getByDisplayValue('2026-12-01')).toBeTruthy()

    const priority = screen.getAllByRole('combobox')[1] as HTMLSelectElement
    expect(priority.value).toBe('high')
  })

  it('saves with the version it loaded, so a concurrent edit is caught', async () => {
    const { calls } = mockApi()
    const onChanged = vi.fn(async () => {})
    renderDrawer({ onChanged })

    const title = await screen.findByDisplayValue('Ship the board')
    await userEvent.clear(title)
    await userEvent.type(title, 'Renamed task')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const patch = calls.find((call) => call.method === 'PATCH')
      expect(patch).toBeTruthy()
    })

    const patch = calls.find((call) => call.method === 'PATCH')!
    expect(patch.url).toContain('/api/v1/boards/brd_demo/tasks/tsk_1')
    expect(patch.body).toMatchObject({ title: 'Renamed task', expectedVersion: 3 })

    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('requires a second, deliberate click to delete', async () => {
    const { calls } = mockApi()
    renderDrawer()

    await screen.findByDisplayValue('Ship the board')

    // First click only arms the confirmation.
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Keep' })).toBeTruthy()
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))

    await waitFor(() => {
      expect(calls.some((call) => call.method === 'DELETE')).toBe(true)
    })
  })

  it('does not send anything when the user keeps the task', async () => {
    const { calls } = mockApi()
    renderDrawer()

    await screen.findByDisplayValue('Ship the board')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }))

    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Delete permanently' })).toBeNull()
  })

  it('disables saving when the title is empty', async () => {
    mockApi()
    renderDrawer()

    const title = await screen.findByDisplayValue('Ship the board')
    await userEvent.clear(title)

    const save = screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
  })

  it('shows existing comments as text, not markup', async () => {
    mockApi({
      comments: [
        {
          id: 'cmt_1',
          taskId: 'tsk_1',
          authorType: 'human',
          authorName: 'Kieron',
          body: '<b>not bold</b>',
          createdAt: '2026-11-03T00:00:00.000Z',
        },
      ],
    })
    renderDrawer()

    const body = await screen.findByText('<b>not bold</b>')
    expect(body.tagName).toBe('P')
    expect(body.querySelector('b')).toBeNull()
  })
})
