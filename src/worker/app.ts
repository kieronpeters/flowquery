import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'

import { COLUMNS } from '../shared/columns'
import { loadBoardView } from './services/board-view'

export type Bindings = {
  DB: D1Database
}

/**
 * Worker application.
 *
 * M2 scope: read-only. Health, the fixed column list, and one board read path
 * that exercises D1 through repository → service → route.
 *
 * SECURITY NOTE — TEMPORARY:
 * `GET /api/v1/boards/:boardId` is unauthenticated at this milestone because
 * human authentication is M3. Nothing is deployed, and M3 adds session
 * enforcement before any deployment can happen (M9). Do not add mutation
 * routes here before authentication exists.
 */
export const app = new Hono<{ Bindings: Bindings }>()

app.get('/api/v1/health', (c) =>
  c.json({
    status: 'ok',
    service: 'flowquery',
    version: '0.0.0-m2',
    time: new Date().toISOString(),
  }),
)

/** The five fixed columns (COL-001). Served from a constant, not the database. */
app.get('/api/v1/columns', (c) => c.json({ columns: COLUMNS }))

/** Read-only board view: metadata, columns and their tasks. */
app.get('/api/v1/boards/:boardId', async (c) => {
  const boardId = c.req.param('boardId')

  try {
    const view = await loadBoardView(c.env.DB, boardId)
    if (!view) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)
    }
    return c.json(view)
  } catch (error) {
    // Log the failure without echoing request data or credentials.
    console.error('Board read failed', error instanceof Error ? error.name : 'unknown')
    return c.json(
      { error: { code: 'UNAVAILABLE', message: 'The board could not be loaded.' } },
      503,
    )
  }
})

// Unknown API paths get JSON, never the SPA shell. Page routes are served by
// the static-asset layer (see wrangler.jsonc), not by this Worker.
app.all('/api/*', (c) =>
  c.json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } }, 404),
)

export type AppType = typeof app
