// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentsPage } from '../../src/app/AgentsPage'
import type { ProfileDto } from '../../src/shared/api-types'

/**
 * The agents page is a directory now.
 *
 * Appearance belongs on the agent's profile, next to the picture it changes.
 * This page should only list who is available and open the right profile.
 */

const PROFILES: ProfileDto[] = [
  {
    id: 'prf_bob',
    displayName: 'Bob',
    roleTitle: 'Engineering Manager',
    kind: 'ai',
    avatarPath: 'team/portraits/bob.png',
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ profiles })),
  )
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
  it('shows the full team overview artwork above the directory', async () => {
    mockApi()
    renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'FlowQuery AI Development Team' }),
    ).toBeTruthy()

    const art = document.querySelector('.agents-hero-art') as HTMLImageElement
    expect(art.getAttribute('src')).toBe('/brand/flowquery-ai-development-team-overview.png')
    expect(art.getAttribute('width')).toBe('1536')
    expect(art.getAttribute('height')).toBe('655')
    expect(screen.getByText(/directory below opens each agent/)).toBeTruthy()
  })

  it('lists the agents but not the humans', async () => {
    mockApi()
    renderPage()

    expect(await screen.findByText('Bob')).toBeTruthy()
    expect(screen.getByText('Contractor')).toBeTruthy()
    expect(screen.queryByText('Abdul')).toBeNull()
  })

  it('shows each agent’s default portrait', async () => {
    mockApi()
    renderPage()

    await screen.findByText('Bob')
    const picture = document.querySelector('.agent-card img') as HTMLImageElement
    expect(picture.getAttribute('src')).toBe('/brand/agents/defaults/prf_bob.png')
  })

  it('opens each agent profile from the row', async () => {
    mockApi()
    renderPage()

    const link = (await screen.findByRole('link', { name: /Open Bob/ })) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/profiles/prf_bob')

    const contractor = screen.getByRole('link', {
      name: /Open Contractor/,
    }) as HTMLAnchorElement
    expect(contractor.getAttribute('href')).toBe('/profiles/prf_contractor')
  })

  it('shows a View profile affordance instead of appearance controls', async () => {
    mockApi()
    renderPage()

    await screen.findByText('Bob')

    expect(screen.getAllByText('View profile')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /for Bob/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Upload picture' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Use colour' })).toBeNull()
  })
})
