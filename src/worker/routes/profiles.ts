import { Hono } from 'hono'

import { avatarUrlFor } from '../../shared/avatars'
import type { AppEnv } from '../env'
import { requireSession } from '../middleware/session'
import { listActiveProfiles } from '../repositories/boards'
import { listAvatarVersions } from '../repositories/profile-avatars'
import { setProfileAvatar } from '../services/profiles'
import { clearProfileImage, setProfileImage } from '../services/profile-avatars'

export const profileRoutes = new Hono<AppEnv>()

profileRoutes.use('*', requireSession)

/** Assignable profiles. They are global, not board-scoped: no fake tenancy. */
profileRoutes.get('/', async (c) => {
  const [rows, versions] = await Promise.all([
    listActiveProfiles(c.env.DB),
    // Versions only — never the image bytes. A board load must not grow just
    // because somebody uploaded a picture.
    listAvatarVersions(c.env.DB),
  ])

  return c.json({
    profiles: rows.map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      roleTitle: profile.role_title,
      kind: profile.kind,
      avatarPath: profile.avatar_path,
      avatarUrl: avatarUrlFor(profile.id, versions.get(profile.id) ?? null),
    })),
  })
})

/** Change an agent's drawn avatar. Human-only, and not for human profiles. */
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

/**
 * Upload a picture for a profile.
 *
 * Your own, or any agent's. The body is `{ mime, data }` with `data` as plain
 * base64 — the browser has already downscaled it, so there is no multipart
 * parsing and no temporary file anywhere.
 */
profileRoutes.put('/:profileId/image', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { mime?: unknown; data?: unknown } | null

  if (!body) {
    return c.json({ error: { code: 'VALIDATION_FAILED', message: 'Expected a JSON object.' } }, 400)
  }

  const now = Date.now()
  const profileId = c.req.param('profileId')

  const result = await setProfileImage(c.env.DB, {
    profileId,
    actor: c.get('user'),
    payload: body,
    now,
  })

  if (result.kind === 'not_found') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } }, 404)
  }

  // Not 403 vs 404: both say "not yours to change", and distinguishing them
  // would confirm which human profiles exist.
  if (result.kind === 'forbidden') {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'You can only change your own picture.' } },
      403,
    )
  }

  if (result.kind === 'invalid') {
    return c.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: result.message,
          fields: { image: result.message },
        },
      },
      400,
    )
  }

  return c.json({ ok: true, avatarUrl: avatarUrlFor(profileId, now) })
})

/** Removes an uploaded picture, so the drawn avatar shows again. */
profileRoutes.delete('/:profileId/image', async (c) => {
  const result = await clearProfileImage(c.env.DB, {
    profileId: c.req.param('profileId'),
    actor: c.get('user'),
  })

  if (result.kind === 'not_found') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } }, 404)
  }

  if (result.kind === 'forbidden') {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'You can only change your own picture.' } },
      403,
    )
  }

  return c.body(null, 204)
})
