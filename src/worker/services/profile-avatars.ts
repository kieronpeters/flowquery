import type { D1Database } from '@cloudflare/workers-types'

import { decodeAvatarImage } from '../lib/image'
import type { UserRecord } from '../repositories/auth-store'
import {
  deleteProfileAvatar,
  getProfileAvatar,
  type ProfileAvatarRecord,
  upsertProfileAvatar,
} from '../repositories/profile-avatars'
import { canEditProfile } from './profile-access'

export type ImageChangeResult =
  | { kind: 'ok' }
  | { kind: 'invalid'; message: string }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }

export async function setProfileImage(
  db: D1Database,
  input: { profileId: string; actor: UserRecord; payload: unknown; now?: number },
): Promise<ImageChangeResult> {
  const permission = await canEditProfile(db, input)
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
  const permission = await canEditProfile(db, input)
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
