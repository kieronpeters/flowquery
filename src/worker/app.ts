import { Hono } from 'hono'

import { COLUMNS } from '../shared/columns'
import type { Bindings } from './env'
import { securityHeaders } from './middleware/security'
import { openApiDocument } from './openapi'
import { agentRoutes } from './routes/agent'
import { authRoutes } from './routes/auth'
import { avatarRoutes } from './routes/avatars'
import { boardRoutes } from './routes/boards'
import { profileRoutes } from './routes/profiles'

export const app = new Hono<{ Bindings: Bindings }>()

/**
 * Request id.
 *
 * Every response carries it as a header, so a user-visible failure can be
 * matched to a log line without the response ever containing internal detail.
 */
app.use('*', async (c, next) => {
  c.header('X-Request-Id', crypto.randomUUID())
  await next()
})

app.use('*', securityHeaders)

/** Unexpected failures: log the detail, return none of it. */
app.onError((error, c) => {
  console.error(
    'Unhandled error',
    error instanceof Error ? error.name : 'unknown',
    c.req.method,
    new URL(c.req.url).pathname,
  )

  return c.json(
    {
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong on our side.',
        requestId: c.res.headers.get('X-Request-Id') ?? undefined,
      },
    },
    500,
  )
})

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

/** Assignable profiles — session required. */
app.route('/api/v1/profiles', profileRoutes)

/** Uploaded profile pictures — session required, served same-origin. */
app.route('/api/v1/avatars', avatarRoutes)

/** The agent door. Board scope comes from the token, never from the request. */
app.route('/api/v1/agent', agentRoutes)

/** The contract, readable without the source. */
app.get('/api/v1/openapi.json', (c) => c.json(openApiDocument))

app.get('/api/v1/health', (c) =>
  c.json({
    status: 'ok',
    service: 'flowquery',
    version: '0.0.0-m8',
    time: new Date().toISOString(),
  }),
)

/** The five fixed columns (COL-001). Constant data, no authentication needed. */
app.get('/api/v1/columns', (c) => c.json({ columns: COLUMNS }))

// Unknown API paths get JSON, never the SPA shell.
app.all('/api/*', (c) =>
  c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'No such endpoint.',
        requestId: c.res.headers.get('X-Request-Id') ?? undefined,
      },
    },
    404,
  ),
)

export type AppType = typeof app
