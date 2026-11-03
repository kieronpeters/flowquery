import type { Hono } from 'hono'

import type { AppEnv } from '../env'
import { readActivity } from '../services/activity'

/** Board activity feed. Registered onto the board router. */
export function registerActivityRoutes(router: Hono<AppEnv>): void {
  router.get('/:boardId/activity', async (c) => {
    const result = await readActivity(c.env.DB, {
      boardId: c.req.param('boardId'),
      limit: c.req.query('limit'),
      before: c.req.query('before'),
    })

    if (result.kind === 'not_found') {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Board not found.' } }, 404)
    }

    if (result.kind === 'invalid') {
      return c.json({ error: { code: 'VALIDATION_FAILED', message: result.message } }, 400)
    }

    return c.json(result.page)
  })
}
