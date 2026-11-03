// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ActivityFeed } from '../../src/app/ActivityFeed'
import type { ActivityDto } from '../../src/shared/api-types'

/**
 * The activity box: folded away until opened, ten to a page, and paginated
 * forward only — the total is unknown until you reach the end.
 *
 * Filtering happens on the server because the feed is paginated, so these
 * check the requests that reach the API, not just the rendering.
 */

const BASE = Date.UTC(2026, 10, 3, 12, 0, 0)

function makeEvents(count: number): ActivityDto[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `act_${index}`,
    taskId: 'tsk_1',
    actorType: index % 2 === 0 ? ('human' as const) : ('agent' as const),
    actorName: index % 2 === 0 ? 'Kieron' : 'Bob',
    eventType: 'task.created',
    payload: { title: `Card ${index}`, status: 'backlog' },
    createdAt: new Date(BASE - index * 60_000).toISOString(),
  }))
}

function mockApi(options: { total?: number } = {}) {
  const urls: string[] = []
  const all = makeEvents(options.total ?? 1)

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      urls.push(url)

      const params = new URL(url, 'http://localhost').searchParams
      const limit = Number(params.get('limit') ?? 20)
      const before = params.get('before')
      const actors = params.get('actors')

      let remaining = all
      if (before) {
        remaining = remaining.filter((event) => Date.parse(event.createdAt) < Number(before))
      }
      if (actors) {
        remaining = remaining.filter((event) => actors.split(',').includes(event.actorName))
      }

      const page = remaining.slice(0, limit)
      const hasMore = remaining.length > limit

      return Response.json({
        events: page,
        nextBefore: hasMore ? Date.parse(page[page.length - 1]!.createdAt) : null,
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

async function openFeed() {
  await userEvent.click(screen.getByRole('button', { name: 'Activity' }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ActivityFeed', () => {
  it('is folded away by default and costs no request', async () => {
    const { urls } = mockApi()

    renderFeed()

    expect(screen.getByRole('button', { name: 'Activity' }).getAttribute('aria-expanded')).toBe(
      'false',
    )
    expect(urls).toHaveLength(0)
    expect(screen.queryByText(/Card 0/)).toBeNull()
  })

  it('loads and reveals the feed when opened, and hides it again', async () => {
    mockApi()
    renderFeed()

    await openFeed()

    expect(await screen.findByText(/Card 0/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Activity' }).getAttribute('aria-expanded')).toBe(
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Activity' }))
    expect(screen.queryByText(/Card 0/)).toBeNull()
  })

  it('asks for ten at a time', async () => {
    const { urls } = mockApi({ total: 25 })
    renderFeed()
    await openFeed()

    await screen.findByText(/Card 0/)
    expect(urls[0]).toContain('limit=10')
  })

  it('shows ten entries on the first page', async () => {
    mockApi({ total: 25 })
    renderFeed()
    await openFeed()

    await screen.findByText(/Card 0/)
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(10)
  })

  it('walks forward to the next page without losing the first', async () => {
    mockApi({ total: 25 })
    renderFeed()
    await openFeed()
    await screen.findByText(/Card 0/)

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText(/Card 10/)).toBeTruthy()
    expect(screen.queryByText(/Card 0/)).toBeNull()

    const current = screen.getByRole('button', { name: '2' })
    expect(current.getAttribute('aria-current')).toBe('page')

    // Going back is instant: page one is still in memory, so no new request.
    const requestsBefore = screen.getAllByRole('button').length
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByText(/Card 0/)).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(requestsBefore)
  })

  it('does not offer a jump to the end it has not reached', async () => {
    mockApi({ total: 25 })
    renderFeed()
    await openFeed()
    await screen.findByText(/Card 0/)

    // Only page one is loaded, so there is no "3" to click yet.
    expect(screen.queryByRole('button', { name: '3' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy()
  })

  it('stops at the last page', async () => {
    mockApi({ total: 12 })
    renderFeed()
    await openFeed()
    await screen.findByText(/Card 0/)

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(/Card 10/)

    // 12 events is two pages; the second is the last, so Next is disabled.
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
  })

  it('marks each actor as human or agent, not just by name', async () => {
    mockApi({ total: 2 })
    renderFeed()
    await openFeed()

    expect(await screen.findByText('Kieron (human)')).toBeTruthy()
    expect(screen.getByText('Bob (agent)')).toBeTruthy()
  })

  it('says why the feed failed, not just that it did', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: { code: 'INTERNAL' } }, { status: 500 })),
    )

    renderFeed()
    await openFeed()

    expect(await screen.findByText(/Activity could not be loaded \(HTTP 500\)/)).toBeTruthy()
  })

  it('lists everyone who has acted as a checkbox', async () => {
    mockApi()
    renderFeed()
    await openFeed()

    expect(await screen.findByRole('checkbox', { name: /Kieron/ })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /Bob/ })).toBeTruthy()
  })

  it('asks for today from local midnight when the period changes', async () => {
    const { urls } = mockApi()
    renderFeed()
    await openFeed()
    await screen.findByText(/Card 0/)

    await userEvent.selectOptions(screen.getByLabelText('Period'), 'day')

    await waitFor(() => {
      expect(urls.some((url) => url.includes('since='))).toBe(true)
    })

    const url = urls.find((item) => item.includes('since='))!
    const since = new URL(url, 'http://localhost').searchParams.get('since')
    const start = new Date(Number(since))

    expect(start.getHours()).toBe(0)
    expect(start.getDate()).toBe(new Date().getDate())
  })

  it('sends no period for all history', async () => {
    const { urls } = mockApi()
    renderFeed()
    await openFeed()
    await screen.findByText(/Card 0/)

    await userEvent.selectOptions(screen.getByLabelText('Period'), 'month')
    await waitFor(() => expect(urls.some((url) => url.includes('since='))).toBe(true))

    await userEvent.selectOptions(screen.getByLabelText('Period'), 'all')
    await waitFor(() => expect(urls.at(-1)).not.toContain('since='))
  })

  it('filters by the people ticked', async () => {
    const { urls } = mockApi()
    renderFeed()
    await openFeed()

    await userEvent.click(await screen.findByRole('checkbox', { name: /Bob/ }))
    await waitFor(() => expect(urls.at(-1)).toContain('actors=Bob'))

    await userEvent.click(screen.getByRole('checkbox', { name: /Kieron/ }))
    await waitFor(() => expect(urls.at(-1)).toContain('actors=Bob%2CKieron'))
  })

  it('says so when the filters match nothing, and can undo them', async () => {
    mockApi({ total: 0 })
    renderFeed()
    await openFeed()

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
    await openFeed()

    await screen.findByText(/Card 0/)

    const section = document.querySelector('.activity') as HTMLElement
    expect(section.style.background).toBe('rgb(244, 239, 230)')
    expect(section.style.getPropertyValue('--activity-fg')).toBe('#0b1020')
    expect(section.getAttribute('data-custom')).toBe('true')
  })

  it('still looks like a window without a theme colour', async () => {
    mockApi()
    renderFeed()
    await openFeed()

    await screen.findByText(/Card 0/)

    const section = document.querySelector('.activity') as HTMLElement
    // No inline colour, but the panel styling comes from CSS, not from the theme.
    expect(section.style.background).toBe('')
    expect(section.getAttribute('data-custom')).toBeNull()
    expect(section.className).toContain('activity')
  })
})
