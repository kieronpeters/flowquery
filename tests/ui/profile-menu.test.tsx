// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProfileMenu, initials } from '../../src/app/ProfileMenu'

/**
 * The signed-in menu: who you are, and how to leave.
 */

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderMenu() {
  render(
    <MemoryRouter>
      <ProfileMenu />
    </MemoryRouter>,
  )
}

describe('initials', () => {
  it('takes one letter per word, at most two', () => {
    expect(initials('Kieron')).toBe('K')
    expect(initials('Kieron Peters')).toBe('KP')
    expect(initials('  abdul   rahman  ')).toBe('AR')
    expect(initials('')).toBe('?')
  })
})

describe('ProfileMenu', () => {
  it('shows the signed-in name and avatar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          user: {
            id: 'usr_1',
            displayName: 'Kieron',
            email: 'k@example.com',
            avatarUrl: 'https://avatars.githubusercontent.com/u/1',
          },
        }),
      ),
    )

    renderMenu()

    expect(await screen.findByRole('button', { name: /Kieron/ })).toBeTruthy()
    const image = document.querySelector('.avatar') as HTMLImageElement
    expect(image.getAttribute('src')).toContain('avatars.githubusercontent.com')
  })

  it('falls back to initials when there is no picture', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          user: { id: 'usr_1', displayName: 'Kieron', email: 'k@example.com', avatarUrl: null },
        }),
      ),
    )

    renderMenu()

    expect(await screen.findByText('K')).toBeTruthy()
  })

  it('opens a menu and signs out', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        calls.push(url)
        if (url.endsWith('/auth/logout')) return Response.json({ ok: true })
        return Response.json({ user: { displayName: 'Kieron', avatarUrl: null } })
      }),
    )

    renderMenu()

    await userEvent.click(await screen.findByRole('button', { name: /Kieron/ }))
    expect(screen.getByRole('menu')).toBeTruthy()

    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    await waitFor(() => {
      expect(calls.some((url) => url.endsWith('/auth/logout'))).toBe(true)
    })
  })

  it('renders nothing when signed out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })),
    )

    renderMenu()

    // Give the probe a tick, then confirm the header stays empty.
    await waitFor(() => {
      expect(document.querySelector('.profile')).toBeNull()
    })
  })
})
