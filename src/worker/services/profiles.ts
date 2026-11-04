import type { D1Database } from '@cloudflare/workers-types'

import { AVATAR_PREFIX, isAvatarVariant } from '../../shared/avatars'
import { getProfileById, updateProfileAvatar } from '../repositories/boards'
import { deleteProfileAvatar } from '../repositories/profile-avatars'

export type AvatarResult =
  { kind: 'ok' } | { kind: 'invalid'; message: string } | { kind: 'not_found' }

/**
 * Changes an agent's avatar.
 *
 * Humans are refused: their picture comes from GitHub, and letting it be
 * overwritten here would be a second, worse source of truth. The value is
 * restricted to a known variant rather than free text, so the database cannot
 * accumulate paths that the UI has no way to draw.
 */
export async function setProfileAvatar(
  db: D1Database,
  input: { profileId: string; avatarPath: unknown },
): Promise<AvatarResult> {
  const raw = input.avatarPath

  if (typeof raw !== 'string' || !raw.startsWith(AVATAR_PREFIX)) {
    return { kind: 'invalid', message: `avatarPath must look like "${AVATAR_PREFIX}teal".` }
  }

  const variant = raw.slice(AVATAR_PREFIX.length)
  if (!isAvatarVariant(variant)) {
    return { kind: 'invalid', message: `Unknown avatar variant: ${variant}.` }
  }

  const profile = await getProfileById(db, input.profileId)
  if (!profile) return { kind: 'not_found' }

  if (profile.kind === 'human') {
    return {
      kind: 'invalid',
      message: 'Human pictures come from GitHub and cannot be set here.',
    }
  }

  const updated = await updateProfileAvatar(db, input.profileId, raw)

  if (!updated) return { kind: 'not_found' }

  // Choosing a drawn avatar is a decision about how this agent looks, so it
  // also clears an uploaded picture. Otherwise the upload would keep winning
  // and the click would appear to do nothing.
  await deleteProfileAvatar(db, input.profileId)

  return { kind: 'ok' }
}
