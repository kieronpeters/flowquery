// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ActivityFeed } from '../../src/app/ActivityFeed'
import type { ActivityDto } from '../../src/shared/api-types'

/**
 * The activity box: its colour, and the two filters.
 *
 * Filtering happens on the server because the feed is paginated — filtering a
 * loaded page would hide matches that sit on a later one. These tests check
 * the request that reaches the API, not just the rendering.
 */

const EVENT: ActivityDto = {
  id: 'act_1',
  taskId: 'tsk_1',
  actorType: 'human',
  actorName: 'Kieron',
  eventType: 'task.created',
  payload: { title: 'Card one', status: 'backlog' },
  createdAt: '2026-11-03T10:00:00.000Z',
}

function mockApi(options: { events?: ActivityDto[] } = {}) {
  const urls: string[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      urls.push(url)

      const allEvents = options.events ?? [EVENT]
      // The real API narrows events by the filters; mirror the actor filter so
      // the empty state can be exercised.
      const actors = new URL(url, 'http://localhost').searchParams.get('actors')
      const events = actors
        ? allEvents.filter((event) => actors.split(',').includes(event.actorName))
        : allEvents

      return Response.json({
        events,
        nextBefore: null,
        actors: [
          { name: 'Kieron', count: 2 },
          { name: 'Bob', count: 1 },
        ],
      })
    }),
  )

  return { urls }
}

function renderFeed(theme?: { activity?: string }) {
  render(<ActivityFeed boardId="brd_demo" refreshKey={0} profiles={[]} theme={theme} />)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ActivityFeed', () => {
  it('renders the event and says it is newest first', async () => {
    mockApi()
    renderFeed()

    expect(await screen.findByText(/Card one/)).toBeTruthy()
    expect(screen.getByText('Newest first')).toBeTruthy()
  })

  it('lists everyone who has acted as a checkbox', async () => {
    mockApi()
    renderFeed()

    expect(await screen.findByRole('checkbox', { name: /Kieron/ })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /Bob/ })).toBeTruthy()
  })

  it('asks for today from local midnight when the period changes', async () => {
    const { urls } = mockApi()
    renderFeed()

    await screen.findByText(/Card one/)
    await userEvent.selectOptions(screen.getByLabelText('Period'), 'day')

    await waitFor(() => {
      expect(urls.some((url) => url.includes('since='))).toBe(true)
    })

    const url = urls.find((item) => item.includes('since='))!
    const since = new URL(url, 'http://localhost').searchParams.get('since')
    const start = new Date(Number(since))

    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getDate()).toBe(new Date().getDate())
  })

  it('sends no period for all history', async () => {
    const { urls } = mockApi()
    renderFeed()

    await screen.findByText(/Card one/)

    await userEvent.selectOptions(screen.getByLabelText('Period'), 'month')
    await waitFor(() => expect(urls.some((url) => url.includes('since='))).toBe(true))

    await userEvent.selectOptions(screen.getByLabelText('Period'), 'all')

    await waitFor(() => {
      const latest = urls.at(-1)!
      expect(latest).not.toContain('since=')
    })
  })

  it('filters by the people ticked', async () => {
    const { urls } = mockApi()
    renderFeed()

    await userEvent.click(await screen.findByRole('checkbox', { name: /Bob/ }))

    await waitFor(() => {
      expect(urls.at(-1)).toContain('actors=Bob')
    })

    await userEvent.click(screen.getByRole('checkbox', { name: /Kieron/ }))

    await waitFor(() => {
      expect(urls.at(-1)).toContain('actors=Bob%2CKieron')
    })
  })

  it('says so when the filters match nothing, and can undo them', async () => {
    mockApi({ events: [] })
    renderFeed()

    // With no events at all, the plain empty message is shown.
    expect(await screen.findByText('Nothing has happened on this board yet.')).toBeTruthy()

    await userEvent.click(screen.getByRole('checkbox', { name: /Bob/ }))

    expect(await screen.findByText(/Nothing matches these filters/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Show everything' }))

    await waitFor(() => {
      expect(screen.queryByText(/Nothing matches these filters/)).toBeNull()
    })
  })

  it('paints the box from the board theme and flips the text to match', async () => {
    mockApi()
    renderFeed({ activity: '#f4efe6' })

    const section = document.querySelector('.activity') as HTMLElement
    await screen.findByText(/Card one/)

    expect(section.style.background).toBe('rgb(244, 239, 230)')
    expect(section.style.getPropertyValue('--activity-fg')).toBe('#0b1020')
    expect(section.getAttribute('data-custom')).toBe('true')
  })

  it('leaves the box unstyled without a theme colour', async () => {
    mockApi()
    renderFeed()

    await screen.findByText(/Card one/)

    const section = document.querySelector('.activity') as HTMLElement
    expect(section.getAttribute('data-custom')).toBeNull()
    expect(section.style.background).toBe('')
  })
})
