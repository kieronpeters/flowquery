// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentsPage } from '../../src/app/AgentsPage'

/**
 * Agent appearance: humans pick a colour, agents have no account to pick one
 * for themselves.
 */

const PROFILES = [
  {
    id: 'prf_bob',
    displayName: 'Bob',
    roleTitle: 'Engineering Manager',
    kind: 'ai',
    avatarPath: 'svg:cyan',
  },
  {
    id: 'prf_contractor',
    displayName: 'Contractor',
    roleTitle: 'External Specialist',
    kind: 'contractor',
    avatarPath: null,
  },
  {
    id: 'prf_abdul',
    displayName: 'Abdul',
    roleTitle: 'Administrator',
    kind: 'human',
    avatarPath: null,
  },
]

function mockApi() {
  const patches: { url: string; body: unknown }[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()

      if (method === 'PATCH') {
        patches.push({ url, body: JSON.parse(String(init?.body)) })
        return Response.json({ ok: true })
      }

      return Response.json({ profiles: PROFILES })
    }),
  )

  return { patches }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AgentsPage', () => {
  it('lists the agents but not the humans', async () => {
    mockApi()
    render(<AgentsPage />)

    expect(await screen.findByText('Bob')).toBeTruthy()
    expect(screen.getByText('Contractor')).toBeTruthy()

    // A human's picture comes from GitHub, so they are not listed here.
    expect(screen.queryByText('Abdul')).toBeNull()
  })

  it('saves the chosen colour', async () => {
    const { patches } = mockApi()
    render(<AgentsPage />)

    await screen.findByText('Bob')
    await userEvent.click(screen.getByRole('button', { name: 'teal for Bob' }))

    await waitFor(() => expect(patches).toHaveLength(1))
    expect(patches[0]!.url).toBe('/api/v1/profiles/prf_bob')
    expect(patches[0]!.body).toEqual({ avatarPath: 'svg:teal' })
  })

  it('marks the current colour as pressed', async () => {
    mockApi()
    render(<AgentsPage />)

    await screen.findByText('Bob')

    expect(screen.getByRole('button', { name: 'cyan for Bob' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: 'teal for Bob' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })
})
