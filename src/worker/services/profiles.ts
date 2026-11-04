import type { D1Database } from '@cloudflare/workers-types'

import { AVATAR_PREFIX, isAvatarVariant } from '../../shared/avatars'
import { getProfileById, updateProfileAvatar } from '../repositories/boards'

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
  return updated ? { kind: 'ok' } : { kind: 'not_found' }
}
