// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DocsPage } from '../../src/app/DocsPage'
import type { DocDetail, DocSummary } from '../../src/shared/api-types'

/**
 * The documentation browser renders repository Markdown and builds its
 * navigation from the worker's catalogue.
 */

const LIST: DocSummary[] = [
  {
    slug: 'agents/ai-agent-entrypoint',
    path: 'docs/agents/AI_AGENT_ENTRYPOINT.md',
    audience: 'agents',
    title: 'FlowQuery — AI Agent Entry Point',
    description: 'Master onboarding document.',
    headings: ['Canonical AI roster', 'Working rules'],
  },
  {
    slug: 'architecture',
    path: 'docs/ARCHITECTURE.md',
    audience: 'internal',
    title: 'Architecture',
    description: 'How the application is built.',
    headings: ['Layering'],
  },
  {
    slug: 'user/readme',
    path: 'docs/user/README.md',
    audience: 'user',
    title: 'User Guide',
    description: 'How to use FlowQuery.',
    headings: ['Getting in'],
  },
]

const DETAIL: DocDetail = {
  ...LIST[0]!,
  markdown: `# FlowQuery — AI Agent Entry Point

Read the [architecture](../ARCHITECTURE.md) first.

## Canonical AI roster

| Name | Role |
|---|---|
| Bob | Engineering Manager |

\`\`\`text
five fixed columns
\`\`\`
`,
}

function mockApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/v1/docs')) return Response.json({ docs: LIST })
      if (url.endsWith('/api/v1/docs/agents/ai-agent-entrypoint')) {
        return Response.json({ doc: DETAIL })
      }
      return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
    }),
  )
}

function renderDocs(path = '/docs/agents/ai-agent-entrypoint') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/docs/*" element={<DocsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DocsPage', () => {
  it('renders the Markdown and the grouped navigation', async () => {
    mockApi()
    renderDocs()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'FlowQuery — AI Agent Entry Point' }),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Architecture' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'User Guide' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy()
    expect(screen.getByText('five fixed columns')).toBeTruthy()
  })

  it('maps repository-relative Markdown links to docs routes', async () => {
    mockApi()
    renderDocs()

    const link = (await screen.findByRole('link', { name: 'architecture' })) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('/docs/architecture')
  })

  it('filters the navigation by title and headings', async () => {
    mockApi()
    renderDocs()

    await screen.findByRole('link', { name: 'Architecture' })
    await userEvent.type(screen.getByPlaceholderText('Search documents and headings'), 'Layering')

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Architecture' })).toBeTruthy()
      expect(screen.queryByRole('link', { name: 'User Guide' })).toBeNull()
    })
  })
})
