// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PeoplePage } from '../../src/app/PeoplePage'
import { ProfilePage } from '../../src/app/ProfilePage'
import type { ProfileDetailDto, ProfileListItemDto } from '../../src/shared/api-types'

/**
 * A profile page is readable by everyone and editable only where the server
 * says so. The large picture is the point; the prose is optional.
 */

const ABDUL: ProfileDetailDto = {
  id: 'prf_abdul',
  displayName: 'Abdul',
  roleTitle: 'Administrator',
  kind: 'human',
  avatarPath: null,
  avatarUrl: '/brand/humans/abdul-default.png',
  about: 'Runs the boards.',
  skills: 'SQL, TypeScript',
  development: null,
  hasUploadedImage: false,
  hasDefaultAvatar: true,
  hasCustomAvatar: false,
  canEdit: false,
}

const ABDUL_UPLOAD: ProfileDetailDto = {
  ...ABDUL,
  canEdit: true,
  avatarUrl: '/api/v1/avatars/prf_abdul?v=1',
  hasUploadedImage: true,
  hasCustomAvatar: true,
}

const SELF: ProfileDetailDto = {
  id: 'prf_user_usr_1',
  displayName: 'Kieron',
  roleTitle: 'Administrator',
  kind: 'human',
  avatarPath: null,
  avatarUrl: null,
  about: null,
  skills: null,
  development: null,
  hasUploadedImage: false,
  hasDefaultAvatar: false,
  hasCustomAvatar: false,
  canEdit: true,
}

const BOB: ProfileDetailDto = {
  id: 'prf_bob',
  displayName: 'Bob',
  roleTitle: 'Engineering Manager',
  kind: 'ai',
  avatarPath: 'svg:cyan',
  avatarUrl: null,
  about: 'Coordinates the specialist agents.',
  skills: 'Planning, delegation, code review.',
  development: 'Turn owner goals into small, reviewable work.',
  hasUploadedImage: false,
  hasDefaultAvatar: false,
  hasCustomAvatar: true,
  canEdit: true,
}

const ALEX: ProfileDetailDto = {
  id: 'prf_alex',
  displayName: 'Alex',
  roleTitle: 'Senior Software Engineer',
  kind: 'ai',
  avatarPath: 'team/portraits/alex.png',
  avatarUrl: null,
  about: 'Leads implementation on the application code.',
  skills: 'TypeScript, React.',
  development: 'Keep the architecture small.',
  hasUploadedImage: false,
  hasDefaultAvatar: false,
  hasCustomAvatar: false,
  canEdit: true,
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderProfile(profile: ProfileDetailDto, onRead?: () => ProfileDetailDto) {
  let reads = 0

  const calls: { url: string; method: string; body: unknown }[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()

      if (method !== 'GET') {
        calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null })
        return Response.json({ ok: true })
      }

      reads += 1
      const body = reads > 1 && onRead ? onRead() : profile
      return Response.json({ profile: body })
    }),
  )

  render(
    <MemoryRouter initialEntries={[`/profiles/${profile.id}`]}>
      <Routes>
        <Route path="/profiles/:profileId" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  )

  return { calls }
}

describe('ProfilePage', () => {
  it('shows a large picture and the written sections', async () => {
    renderProfile(ABDUL)

    expect(await screen.findByRole('heading', { level: 1, name: 'Abdul' })).toBeTruthy()

    const picture = document.querySelector('.profile-hero .avatar') as HTMLElement | null
    expect(picture?.style.width).toBe('240px')

    expect(screen.getByText('Runs the boards.')).toBeTruthy()
    expect(screen.getByText('SQL, TypeScript')).toBeTruthy()
    expect(screen.getByText('Not filled in yet.')).toBeTruthy()
  })

  it('opens the picture at a much larger size, and closes it again', async () => {
    renderProfile(ABDUL)

    const trigger = await screen.findByRole('button', { name: /View Abdul.s picture larger/ })
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')

    await userEvent.click(trigger)

    const dialog = screen.getByRole('dialog')
    const large = dialog.querySelector('.avatar') as HTMLElement
    expect(parseInt(large.style.width, 10)).toBeGreaterThan(240)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('closes the preview with Escape', async () => {
    renderProfile(ABDUL)

    await userEvent.click(
      await screen.findByRole('button', { name: /View Abdul.s picture larger/ }),
    )
    expect(screen.getByRole('dialog')).toBeTruthy()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('does not offer a preview when the only picture is initials', async () => {
    renderProfile({ ...SELF, canEdit: false })

    await screen.findByRole('heading', { level: 1, name: 'Kieron' })
    expect(screen.queryByRole('button', { name: /picture larger/ })).toBeNull()
  })

  it('does not offer an edit button on another human’s page', async () => {
    renderProfile(ABDUL)

    await screen.findByRole('heading', { level: 1, name: 'Abdul' })
    expect(screen.queryByRole('button', { name: 'Edit profile' })).toBeNull()
    expect(screen.getByText(/Only Abdul can edit this profile/)).toBeTruthy()
  })

  it('offers editing on your own page and saves the text', async () => {
    const { calls } = renderProfile(SELF, () => ({
      ...SELF,
      about: 'Updated about',
    }))

    await userEvent.click(await screen.findByRole('button', { name: 'Edit profile' }))

    const about = screen.getByPlaceholderText(/A sentence or two/) as HTMLTextAreaElement
    await userEvent.type(about, 'Updated about')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.url).toBe(`/api/v1/profiles/${SELF.id}/details`)
    expect(calls[0]!.method).toBe('PATCH')
    expect(calls[0]!.body).toMatchObject({ about: 'Updated about' })
  })

  it('accepts an uploaded picture only on a profile you may edit', async () => {
    renderProfile(SELF)

    await screen.findByRole('heading', { level: 1, name: 'Kieron' })
    expect(screen.getByRole('button', { name: 'Upload a new picture' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Remove picture' })).toBeNull()
  })

  it('lets you choose an agent colour beside the picture', async () => {
    const { calls } = renderProfile(BOB)

    await screen.findByRole('heading', { level: 1, name: 'Bob' })

    // The stored variant is pressed, and no upload is set.
    expect(screen.getByRole('button', { name: 'cyan for Bob' }).getAttribute('aria-pressed')).toBe(
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: 'teal for Bob' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.url).toBe('/api/v1/profiles/prf_bob')
    expect(calls[0]!.method).toBe('PATCH')
    expect(calls[0]!.body).toEqual({ avatarPath: 'svg:teal' })

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'teal for Bob' }).getAttribute('aria-pressed'),
      ).toBe('true'),
    )
  })

  it('does not offer a colour on a human profile', async () => {
    renderProfile(SELF)

    await screen.findByRole('heading', { level: 1, name: 'Kieron' })
    expect(screen.queryByRole('group', { name: /Colour for Kieron/ })).toBeNull()
  })

  it('shows an agent’s purpose under the picture', async () => {
    renderProfile(BOB)

    await screen.findByRole('heading', { level: 1, name: 'Bob' })
    expect(screen.getByText('Coordinates the specialist agents.')).toBeTruthy()
    expect(screen.getByText('Planning, delegation, code review.')).toBeTruthy()
    expect(screen.getByText('Turn owner goals into small, reviewable work.')).toBeTruthy()
  })

  it('shows the default portrait when the avatar has not been customised', async () => {
    renderProfile(ALEX)

    await screen.findByRole('heading', { level: 1, name: 'Alex' })

    const picture = document.querySelector('.profile-hero img') as HTMLImageElement
    expect(picture.getAttribute('src')).toBe('/brand/agents/defaults/prf_alex.png')
    expect(screen.getByText('Default portrait')).toBeTruthy()
  })

  it('shows a human administrator default portrait and labels it', async () => {
    renderProfile(ABDUL)

    await screen.findByRole('heading', { level: 1, name: 'Abdul' })

    const picture = document.querySelector('.profile-hero img') as HTMLImageElement
    expect(picture.getAttribute('src')).toBe('/brand/humans/abdul-default.png')
    expect(screen.getByText('Default portrait')).toBeTruthy()
  })

  it('offers Restore default on a human who uploaded a picture', async () => {
    const { calls } = renderProfile(ABDUL_UPLOAD)

    await userEvent.click(await screen.findByRole('button', { name: 'Restore default' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.method).toBe('DELETE')
    expect(calls[0]!.url).toBe('/api/v1/profiles/prf_abdul/image')
  })

  it('offers Restore default on a customised agent and calls DELETE', async () => {
    const { calls } = renderProfile(BOB)

    await userEvent.click(await screen.findByRole('button', { name: 'Restore default' }))

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.method).toBe('DELETE')
    expect(calls[0]!.url).toBe('/api/v1/profiles/prf_bob/image')
  })
})

const DIRECTORY: ProfileListItemDto[] = [
  { ...ABDUL, isSelf: false },
  { ...SELF, isSelf: true },
  {
    id: 'prf_bob',
    displayName: 'Bob',
    roleTitle: 'Engineering Manager',
    kind: 'ai',
    avatarPath: 'svg:cyan',
    avatarUrl: null,
    isSelf: false,
  },
]

function renderPeople(profiles: ProfileListItemDto[] = DIRECTORY) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ profiles })),
  )

  render(
    <MemoryRouter initialEntries={['/people']}>
      <Routes>
        <Route path="/people" element={<PeoplePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PeoplePage', () => {
  it('shows the team overview banner above the directory', async () => {
    renderPeople()

    await screen.findByRole('heading', { level: 1, name: 'People' })

    const art = document.querySelector('.people-hero-art') as HTMLImageElement
    expect(art.getAttribute('src')).toBe('/brand/flowquery-ai-development-team-overview.png')
    expect(art.getAttribute('height')).toBe('655')
  })

  it('lists people and agents, marking the signed-in human', async () => {
    renderPeople()

    expect(await screen.findByRole('heading', { level: 1, name: 'People' })).toBeTruthy()
    expect(screen.getByText('Abdul')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.getByText('You')).toBeTruthy()
  })

  it('links each row to that profile', async () => {
    renderPeople()

    const link = (await screen.findByText('Bob')).closest('a') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/profiles/prf_bob')
  })
})
