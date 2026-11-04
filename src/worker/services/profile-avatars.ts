import type { D1Database } from '@cloudflare/workers-types'

import { decodeAvatarImage } from '../lib/image'
import type { UserRecord } from '../repositories/auth-store'
import { findHumanProfileId, getProfileById } from '../repositories/boards'
import {
  deleteProfileAvatar,
  getProfileAvatar,
  type ProfileAvatarRecord,
  upsertProfileAvatar,
} from '../repositories/profile-avatars'

export type ImageChangeResult =
  | { kind: 'ok' }
  | { kind: 'invalid'; message: string }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }

/**
 * Who may change whose picture.
 *
 * A human may change their own, and any non-human profile's — the agents are
 * theirs to dress. They may not change another human's: two administrators
 * share the boards, not each other's identity.
 */
async function authorise(
  db: D1Database,
  input: { profileId: string; actor: UserRecord },
): Promise<ImageChangeResult | { kind: 'allowed' }> {
  const target = await getProfileById(db, input.profileId)
  if (!target) return { kind: 'not_found' }

  if (target.kind === 'human') {
    const ownProfileId = await findHumanProfileId(db, {
      userId: input.actor.id,
      displayName: input.actor.displayName,
    })

    if (ownProfileId !== target.id) return { kind: 'forbidden' }
  }

  return { kind: 'allowed' }
}

export async function setProfileImage(
  db: D1Database,
  input: { profileId: string; actor: UserRecord; payload: unknown; now?: number },
): Promise<ImageChangeResult> {
  const permission = await authorise(db, input)
  if (permission.kind !== 'allowed') return permission

  const payload = (input.payload ?? {}) as { mime?: unknown; data?: unknown }
  const decoded = decodeAvatarImage(payload)
  if (!decoded.ok) return { kind: 'invalid', message: decoded.message }

  await upsertProfileAvatar(db, {
    profileId: input.profileId,
    mime: decoded.image.mime,
    data: decoded.image.data,
    now: input.now ?? Date.now(),
  })

  return { kind: 'ok' }
}

/** Removes an uploaded picture, falling back to the drawn avatar. */
export async function clearProfileImage(
  db: D1Database,
  input: { profileId: string; actor: UserRecord },
): Promise<ImageChangeResult> {
  const permission = await authorise(db, input)
  if (permission.kind !== 'allowed') return permission

  await deleteProfileAvatar(db, input.profileId)
  return { kind: 'ok' }
}

/** The bytes to serve, or null when that profile has no uploaded picture. */
export async function readProfileImage(
  db: D1Database,
  profileId: string,
): Promise<ProfileAvatarRecord | null> {
  return await getProfileAvatar(db, profileId)
}
