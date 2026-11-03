import type { MiddlewareHandler } from 'hono'

import { readSessionCookie } from '../auth/cookies'
import type { AppEnv } from '../env'
import { createD1AuthStore } from '../repositories/auth-store'
import { resolveSession } from '../services/auth'

/**
 * Human session gate.
 *
 * Applied once per router rather than in each handler: a route that forgets the
 * check is a data leak, and there is no reason to give anyone the chance.
 */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const store = createD1AuthStore(c.env.DB)
  const user = await resolveSession({ store, token: readSessionCookie(c) })

  if (!user) {
    return c.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } }, 401)
  }

  c.set('user', user)
  await next()
}
