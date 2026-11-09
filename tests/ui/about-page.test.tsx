// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { App } from '../../src/app/App'

/**
 * The branded shell and the About page.
 *
 * These render the whole app rather than the page alone, because the header and
 * footer live in the shell and a page-only test would not notice them missing.
 */

afterEach(cleanup)

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('app shell', () => {
  it('shows the wordmark in the header', () => {
    renderAt('/about')

    const header = screen.getByRole('banner')
    const logo = within(header).getByAltText('FlowQuery') as HTMLImageElement

    expect(logo.getAttribute('src')).toBe('/brand/logos/flowquery-logo-dark.png')
  })

  it('has a footer with the brand and the site links', () => {
    renderAt('/about')

    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeTruthy()

    expect(screen.getByRole('link', { name: 'About' }).getAttribute('href')).toBe('/about')
    expect(screen.getByRole('link', { name: 'Agents' }).getAttribute('href')).toBe('/agents')
    expect(screen.getByRole('link', { name: 'Test a token' }).getAttribute('href')).toBe('/agent')
  })
})

describe('About page', () => {
  it('explains what the product is and is not', () => {
    renderAt('/about')

    expect(screen.getByRole('heading', { level: 1, name: 'About FlowQuery' })).toBeTruthy()
    expect(screen.getByText(/five fixed columns/i)).toBeTruthy()
    expect(screen.getByText(/No organisations, projects or workspaces/i)).toBeTruthy()
    expect(screen.getByText(/Workers Free and D1 Free/i)).toBeTruthy()
  })
})
