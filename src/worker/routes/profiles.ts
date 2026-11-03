import { Hono } from 'hono'

import type { AppEnv } from '../env'
import { requireSession } from '../middleware/session'
import { listActiveProfiles } from '../repositories/boards'

export const profileRoutes = new Hono<AppEnv>()

profileRoutes.use('*', requireSession)

/** Assignable profiles. They are global, not board-scoped: no fake tenancy. */
profileRoutes.get('/', async (c) => {
  const rows = await listActiveProfiles(c.env.DB)

  return c.json({
    profiles: rows.map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      roleTitle: profile.role_title,
      kind: profile.kind,
      avatarPath: profile.avatar_path,
    })),
  })
})
