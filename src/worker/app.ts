import { Hono } from 'hono'

import { COLUMNS } from '../shared/columns'
import type { Bindings } from './env'
import { authRoutes } from './routes/auth'
import { boardRoutes } from './routes/boards'

export const app = new Hono<{ Bindings: Bindings }>()

/**
 * CSRF guard for state-changing requests.
 *
 * Browsers always send `Origin` on cross-origin and same-origin non-GET
 * requests, so a present-but-mismatched origin is an attack. A missing Origin
 * means a non-browser client (Bob, curl); bearer-token clients in M7 are not
 * exposed to CSRF at all, because they never rely on ambient cookies.
 */
app.use('/api/*', async (c, next) => {
  const method = c.req.method
  const safe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
  if (!safe) {
    const origin = c.req.header('origin')
    if (origin && origin !== new URL(c.req.url).origin) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Cross-origin request rejected.' } },
        403,
      )
    }
  }
  await next()
})

/** Human authentication (AUTH-01). */
app.route('/api/v1', authRoutes)

/** Board reads and administration — session required. */
app.route('/api/v1/boards', boardRoutes)

app.get('/api/v1/health', (c) =>
  c.json({
    status: 'ok',
    service: 'flowquery',
    version: '0.0.0-m4',
    time: new Date().toISOString(),
  }),
)

/** The five fixed columns (COL-001). Constant data, no authentication needed. */
app.get('/api/v1/columns', (c) => c.json({ columns: COLUMNS }))

// Unknown API paths get JSON, never the SPA shell.
app.all('/api/*', (c) =>
  c.json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } }, 404),
)

export type AppType = typeof app
