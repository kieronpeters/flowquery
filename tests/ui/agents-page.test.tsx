// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentsPage } from '../../src/app/AgentsPage'
import type { ProfileDto } from '../../src/shared/api-types'

/**
 * Agent appearance: humans pick a colour or upload a picture, and the two are
 * exclusive. Agents have no account to pick one for themselves.
 */

const PROFILES: ProfileDto[] = [
  {
    id: 'prf_bob',
    displayName: 'Bob',
    roleTitle: 'Engineering Manager',
    kind: 'ai',
    avatarPath: 'svg:cyan',
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
  {
    id: 'prf_abdul',
    displayName: 'Abdul',
    roleTitle: 'Administrator',
    kind: 'human',
    avatarPath: null,
    avatarUrl: null,
  },
]

function mockApi(profiles: ProfileDto[] = PROFILES) {
  const calls: { url: string; method: string; body: unknown }[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()

      if (method !== 'GET') {
        calls.push({
          url,
          method,
          body: init?.body ? JSON.parse(String(init.body)) : null,
        })
        return Response.json({ ok: true, avatarUrl: '/api/v1/avatars/prf_bob?v=2' })
      }

      return Response.json({ profiles })
    }),
  )

  return { calls }
}

function renderPage() {
  render(
    <MemoryRouter>
      <AgentsPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AgentsPage', () => {
  it('lists the agents but not the humans', async () => {
    mockApi()
    renderPage()

    expect(await screen.findByText('Bob')).toBeTruthy()
    expect(screen.getByText('Contractor')).toBeTruthy()

    // A human's picture comes from GitHub, so they are not listed here.
    expect(screen.queryByText('Abdul')).toBeNull()
  })

  it('saves the chosen colour', async () => {
    const { calls } = mockApi()
    renderPage()

    await screen.findByText('Bob')
    await userEvent.click(screen.getByRole('button', { name: 'teal for Bob' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.url).toBe('/api/v1/profiles/prf_bob')
    expect(calls[0]!.body).toEqual({ avatarPath: 'svg:teal' })
  })

  it('marks the current colour as pressed', async () => {
    mockApi()
    renderPage()

    await screen.findByText('Bob')

    expect(screen.getByRole('button', { name: 'cyan for Bob' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: 'teal for Bob' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('offers an upload for each agent', async () => {
    mockApi()
    renderPage()

    await screen.findByText('Bob')

    expect(screen.getAllByRole('button', { name: 'Upload picture' })).toHaveLength(2)
  })

  it('shows an uploaded picture in place of the drawn avatar', async () => {
    mockApi(
      PROFILES.map((profile) =>
        profile.id === 'prf_bob'
          ? { ...profile, avatarUrl: '/api/v1/avatars/prf_bob?v=1' }
          : profile,
      ),
    )
    renderPage()

    await screen.findByText('Bob')

    const image = document.querySelector('.agent-row img') as HTMLImageElement | null
    expect(image?.getAttribute('src')).toBe('/api/v1/avatars/prf_bob?v=1')

    // A picture means the colour is no longer what is shown.
    expect(screen.getByRole('button', { name: 'cyan for Bob' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('offers to revert to the drawn avatar only when a picture is set', async () => {
    mockApi()
    renderPage()

    await screen.findByText('Bob')
    expect(screen.queryByRole('button', { name: 'Use colour' })).toBeNull()

    cleanup()
    vi.unstubAllGlobals()

    mockApi(
      PROFILES.map((profile) =>
        profile.id === 'prf_bob'
          ? { ...profile, avatarUrl: '/api/v1/avatars/prf_bob?v=1' }
          : profile,
      ),
    )
    renderPage()

    await screen.findByText('Bob')
    expect(screen.getByRole('button', { name: 'Use colour' })).toBeTruthy()
  })

  it('removes the uploaded picture', async () => {
    const { calls } = mockApi(
      PROFILES.map((profile) =>
        profile.id === 'prf_bob'
          ? { ...profile, avatarUrl: '/api/v1/avatars/prf_bob?v=1' }
          : profile,
      ),
    )
    renderPage()

    await screen.findByText('Bob')
    await userEvent.click(screen.getByRole('button', { name: 'Use colour' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.method).toBe('DELETE')
    expect(calls[0]!.url).toBe('/api/v1/profiles/prf_bob/image')
  })
})
