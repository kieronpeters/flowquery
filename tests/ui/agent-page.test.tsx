// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentPage } from '../../src/app/AgentPage'

/**
 * The agent access page: paste a token, see the board it reaches.
 *
 * It calls the same endpoint an agent does, so a green result is proof the
 * credential works — not a guess from the label.
 */

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AgentPage', () => {
  it('shows the board a valid token reaches, and forgets the token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          board: { id: 'brd_1', name: 'FlowQuery', taskCount: 9 },
        }),
      ),
    )

    render(<AgentPage />)

    const input = screen.getByLabelText('Token') as HTMLInputElement
    await userEvent.type(input, 'fq_test_token')
    await userEvent.click(screen.getByRole('button', { name: 'Check token' }))

    expect(await screen.findByText('FlowQuery')).toBeTruthy()
    expect(screen.getByText('brd_1')).toBeTruthy()

    // The secret is not kept on screen once it has been proven.
    expect(input.value).toBe('')
  })

  it('says a rejected token is invalid or revoked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })),
    )

    render(<AgentPage />)

    await userEvent.type(screen.getByLabelText('Token'), 'fq_revoked')
    await userEvent.click(screen.getByRole('button', { name: 'Check token' }))

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'That token is not valid, or it has been revoked.',
    )
  })

  it('sends the token as a bearer credential and nothing else', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ board: { id: 'b', name: 'B', taskCount: 0 } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<AgentPage />)
    await userEvent.type(screen.getByLabelText('Token'), 'fq_abc')
    await userEvent.click(screen.getByRole('button', { name: 'Check token' }))

    await screen.findByText('B')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/agent/board')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer fq_abc')
  })
})
