import { Hono } from 'hono'

import type { AppEnv } from '../env'
import { requireSession } from '../middleware/session'
import { listActiveProfiles } from '../repositories/boards'
import { setProfileAvatar } from '../services/profiles'

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

/** Change an agent's avatar. Human-only, and not for human profiles. */
profileRoutes.patch('/:profileId', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { avatarPath?: unknown } | null

  const result = await setProfileAvatar(c.env.DB, {
    profileId: c.req.param('profileId'),
    avatarPath: body?.avatarPath,
  })

  if (result.kind === 'not_found') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } }, 404)
  }

  if (result.kind === 'invalid') {
    return c.json({ error: { code: 'VALIDATION_FAILED', message: result.message } }, 400)
  }

  return c.json({ ok: true })
})
