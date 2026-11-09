import { Hono } from 'hono'

import { avatarUrlFor } from '../../shared/avatars'
import type { AppEnv } from '../env'
import { requireSession } from '../middleware/session'
import {
  findHumanProfileId,
  getHumanGithubAvatar,
  getProfileDetailById,
  listActiveProfiles,
  listHumanGithubAvatars,
} from '../repositories/boards'
import { getAvatarVersion, listAvatarVersions } from '../repositories/profile-avatars'
import { setProfileAvatar, updateProfileDetails } from '../services/profiles'
import { clearProfileImage, setProfileImage } from '../services/profile-avatars'

export const profileRoutes = new Hono<AppEnv>()

profileRoutes.use('*', requireSession)

/** Assignable profiles. They are global, not board-scoped: no fake tenancy. */
profileRoutes.get('/', async (c) => {
  const actor = c.get('user')
  const [rows, versions, ownProfileId, githubAvatars] = await Promise.all([
    listActiveProfiles(c.env.DB),
    // Versions only — never the image bytes. A board load must not grow just
    // because somebody uploaded a picture.
    listAvatarVersions(c.env.DB),
    findHumanProfileId(c.env.DB, { userId: actor.id, displayName: actor.displayName }),
    listHumanGithubAvatars(c.env.DB),
  ])

  return c.json({
    profiles: rows.map((profile) => {
      const uploaded = avatarUrlFor(profile.id, versions.get(profile.id) ?? null)
      return {
        id: profile.id,
        displayName: profile.display_name,
        roleTitle: profile.role_title,
        kind: profile.kind,
        avatarPath: profile.avatar_path,
        // An upload wins; GitHub is the fallback for a human who has none.
        avatarUrl:
          uploaded ?? (profile.kind === 'human' ? (githubAvatars.get(profile.id) ?? null) : null),
        isSelf: profile.id === ownProfileId,
      }
    }),
  })
})

/**
 * One profile page.
 *
 * Every signed-in human may read every profile. Editing is a separate question,
 * answered here only so the page knows whether to offer the button — and again
 * on the write path, which is where it actually counts.
 */
profileRoutes.get('/:profileId', async (c) => {
  const profileId = c.req.param('profileId')
  const profile = await getProfileDetailById(c.env.DB, profileId)

  // An inactive profile is not in the directory, so its page should not be
  // reachable by guessing the id either.
  if (!profile || profile.active !== 1) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } }, 404)
  }

  const actor = c.get('user')
  const [version, ownProfileId, githubAvatar] = await Promise.all([
    getAvatarVersion(c.env.DB, profileId),
    findHumanProfileId(c.env.DB, { userId: actor.id, displayName: actor.displayName }),
    profile.kind === 'human'
      ? getHumanGithubAvatar(c.env.DB, {
          profileId: profile.id,
          displayName: profile.display_name,
        })
      : Promise.resolve(null),
  ])

  const uploaded = avatarUrlFor(profile.id, version)
  const canEdit = profile.kind !== 'human' || ownProfileId === profile.id

  return c.json({
    profile: {
      id: profile.id,
      displayName: profile.display_name,
      roleTitle: profile.role_title,
      kind: profile.kind,
      avatarPath: profile.avatar_path,
      avatarUrl: uploaded ?? githubAvatar,
      about: profile.about,
      skills: profile.skills,
      development: profile.development,
      hasUploadedImage: uploaded !== null,
      canEdit,
    },
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
 * The prose on a profile page: job title, About, Skills, Development.
 *
 * Your own profile, or any agent's. Another human's is off limits even though
 * their page is readable — sharing boards is not sharing an identity.
 */
profileRoutes.patch('/:profileId/details', async (c) => {
  const body = await c.req.json().catch(() => null)

  const result = await updateProfileDetails(c.env.DB, {
    profileId: c.req.param('profileId'),
    actor: c.get('user'),
    body,
  })

  if (result.kind === 'not_found') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } }, 404)
  }

  if (result.kind === 'forbidden') {
    return c.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own profile, or an agent’s.',
        },
      },
      403,
    )
  }

  if (result.kind === 'invalid') {
    return c.json(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: result.message,
          fields: result.field ? { [result.field]: result.message } : undefined,
        },
      },
      400,
    )
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
