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
  avatarUrl: 'https://avatars.githubusercontent.com/u/37402145?v=4',
  about: 'Runs the boards.',
  skills: 'SQL, TypeScript',
  development: null,
  hasUploadedImage: false,
  canEdit: false,
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
