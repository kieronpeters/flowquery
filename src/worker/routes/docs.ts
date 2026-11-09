import { Hono } from 'hono'

import { getDoc, listDocs } from '../docs/catalog'
import type { AppEnv } from '../env'
import { requireSession } from '../middleware/session'

/**
 * Repository documentation, served to signed-in humans.
 *
 * The Markdown is imported at build time from `docs/` and `team/`; the browser
 * receives only the document it requests, so internal engineering material is
 * never part of the client bundle.
 *
 * Every route requires a session. All current human accounts are
 * administrators; if a non-admin role is introduced, this is the place to
 * filter the `internal` audience.
 */
export const docsRoutes = new Hono<AppEnv>()

docsRoutes.use('*', requireSession)

docsRoutes.get('/', (c) => c.json({ docs: listDocs() }))

docsRoutes.get('/*', (c) => {
  const prefix = '/api/v1/docs/'
  const raw = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) : ''
  const slug = decodeURIComponent(raw).replace(/\/+$/, '')

  const doc = getDoc(slug)
  if (!doc) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Document not found.' } }, 404)
  }

  return c.json({ doc })
})
