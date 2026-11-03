import { Hono } from 'hono'

/**
 * Worker application.
 *
 * M1 scope: a single infrastructure endpoint used to verify that the Worker,
 * static assets and the test runner are wired together correctly.
 *
 * Deliberately absent at this milestone: database bindings, authentication,
 * board or task routes. Those belong to M2 onwards. Do not add product
 * behaviour here without the owning milestone being authorised.
 */
export const app = new Hono()

app.get('/api/v1/health', (c) =>
  c.json({
    status: 'ok',
    service: 'flowquery',
    version: '0.0.0-m1',
    time: new Date().toISOString(),
  }),
)

// Unknown API paths get JSON, never the SPA shell. Page routes are handled by
// the static-asset layer (see wrangler.jsonc), not by this Worker.
app.all('/api/*', (c) =>
  c.json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } }, 404),
)

export type AppType = typeof app
