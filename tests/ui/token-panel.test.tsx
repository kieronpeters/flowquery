// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TokenPanel } from '../../src/app/TokenPanel'

/**
 * Agent tokens: one per agent per board, chosen from a list, rotatable in place.
 *
 * The dropdown exists because the label is what activity attribution matches
 * on. A free-text field was the one way to get it wrong.
 */

const PROFILES = [
  {
    id: 'prf_bob',
    displayName: 'Bob',
    roleTitle: 'Engineering Manager',
    kind: 'ai',
    avatarPath: 'svg:cyan',
    avatarUrl: null,
  },
  {
    id: 'prf_alex',
    displayName: 'Alex',
    roleTitle: 'Senior Software Engineer',
    kind: 'ai',
    avatarPath: 'svg:blue',
    avatarUrl: null,
  },
  {
    id: 'prf_abdul',
    displayName: 'Abdul',
    roleTitle: 'Administrator',
    kind: 'human',
    avatarPath: null,
    avatarUrl: null,
  },
]

type Token = {
  id: string
  profileId: string | null
  label: string
  tokenPrefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

function token(overrides: Partial<Token> = {}): Token {
  return {
    id: 'tok_1',
    profileId: 'prf_bob',
    label: 'Bob',
    tokenPrefix: 'fq_ABCD',
    createdAt: '2026-11-04T00:00:00.000Z',
    lastUsedAt: null,
    revokedAt: null,
    ...overrides,
  }
}

function mockApi(initial: Token[] = []) {
  const calls: { url: string; method: string; body: unknown }[] = []
  let tokens = initial

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()

      if (method === 'GET' && url.endsWith('/tokens')) {
        return Response.json({ tokens })
      }

      if (method === 'GET' && url.endsWith('/profiles')) {
        return Response.json({ profiles: PROFILES })
      }

      const body = init?.body ? JSON.parse(String(init.body)) : null
      calls.push({ url, method, body })

      if (method === 'POST' && url.endsWith('/rotate')) {
        const previous = tokens.find((item) => url.includes(item.id)) ?? token()
        const replacement = token({ id: 'tok_new', lastUsedAt: null })
        tokens = [{ ...previous, revokedAt: '2026-11-04T01:00:00.000Z' }, replacement]
        return Response.json({ token: 'fq_NEWSECRET', record: replacement }, { status: 201 })
      }

      if (method === 'POST') {
        const created = token({ id: 'tok_new', profileId: body.profileId })
        tokens = [...tokens, created]
        return Response.json({ token: 'fq_NEWSECRET', record: created }, { status: 201 })
      }

      if (method === 'DELETE') {
        tokens = tokens.map((item) =>
          url.includes(item.id) ? { ...item, revokedAt: '2026-11-04T01:00:00.000Z' } : item,
        )
        return new Response(null, { status: 204 })
      }

      return Response.json({ ok: true })
    }),
  )

  return { calls }
}

function renderPanel() {
  render(<TokenPanel boardId="brd_1" onClose={() => {}} />)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TokenPanel', () => {
  it('offers agents by name rather than a free-text label', async () => {
    mockApi()
    renderPanel()

    const select = (await screen.findByLabelText('Agent')) as HTMLSelectElement
    const options = Array.from(select.options).map((option) => option.textContent)

    expect(options).toHaveLength(2)
    expect(options[0]).toContain('Bob')
    expect(options[1]).toContain('Alex')

    // A human signs in with GitHub; they never appear as a token holder.
    expect(options.join(' ')).not.toContain('Abdul')
  })

  it('creates a token for the chosen agent', async () => {
    const { calls } = mockApi()
    renderPanel()

    await screen.findByLabelText('Agent')
    await userEvent.click(screen.getByRole('button', { name: 'Create token' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.url).toBe('/api/v1/boards/brd_1/tokens')
    expect(calls[0]!.body).toEqual({ profileId: 'prf_bob' })

    // The plaintext is shown once, with the agent's name on it.
    expect(await screen.findByText(/New token for Bob/)).toBeTruthy()
    expect(screen.getByText('fq_NEWSECRET')).toBeTruthy()
  })

  it('does not offer an agent that already holds a token', async () => {
    mockApi([token({ profileId: 'prf_bob' })])
    renderPanel()

    await screen.findByText('Bob')
    const select = screen.getByLabelText('Agent') as HTMLSelectElement

    expect(
      Array.from(select.options)
        .map((option) => option.textContent)
        .join(' '),
    ).toContain('Alex')
    expect(
      Array.from(select.options)
        .map((option) => option.textContent)
        .join(' '),
    ).not.toContain('Bob')
  })

  it('says so when every agent already has a token', async () => {
    mockApi([token({ profileId: 'prf_bob' }), token({ id: 'tok_2', profileId: 'prf_alex' })])
    renderPanel()

    expect(await screen.findByText('Every agent already has a token on this board.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create token' })).toBeNull()
  })

  it('rotates a token and shows the replacement', async () => {
    const { calls } = mockApi([token()])
    renderPanel()

    await screen.findByText('Bob')
    await userEvent.click(screen.getByRole('button', { name: 'Rotate' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.url).toBe('/api/v1/boards/brd_1/tokens/tok_1/rotate')
    expect(calls[0]!.method).toBe('POST')

    expect(await screen.findByText(/New token for Bob/)).toBeTruthy()
    expect(screen.getByText('fq_NEWSECRET')).toBeTruthy()
  })

  it('revokes a token', async () => {
    const { calls } = mockApi([token()])
    renderPanel()

    await screen.findByText('Bob')
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.method).toBe('DELETE')
    expect(calls[0]!.url).toBe('/api/v1/boards/brd_1/tokens/tok_1')
  })

  it('keeps revoked tokens out of the way', async () => {
    mockApi([
      token(),
      token({ id: 'tok_old', label: 'Bob', revokedAt: '2026-11-01T00:00:00.000Z' }),
    ])
    renderPanel()

    await screen.findAllByText('Bob')

    // The live token is on the page; the revoked one is behind a disclosure.
    expect(screen.getByRole('button', { name: 'Rotate' })).toBeTruthy()
    expect(screen.getByText('Revoked tokens')).toBeTruthy()
  })
})
