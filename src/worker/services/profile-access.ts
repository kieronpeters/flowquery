import type { D1Database } from '@cloudflare/workers-types'

import type { ProfileRow } from '../domain/types'
import type { UserRecord } from '../repositories/auth-store'
import { findHumanProfileId, getProfileById } from '../repositories/boards'

/**
 * Who may change whose profile.
 *
 * Every signed-in human may *view* every profile — the pages are a directory,
 * like a company intranet. Editing is narrower:
 *
 *  - a human may edit their own profile;
 *  - a human may edit any non-human profile, because agents and the contractor
 *    have no account of their own;
 *  - a human may not edit another human.
 *
 * This lives in one function because two callers now depend on it: the picture
 * endpoints and the profile-text endpoint. Two copies would eventually disagree,
 * and the one that disagreed would be the security check.
 */
export type ProfileEditAccess =
  { kind: 'allowed'; profile: ProfileRow } | { kind: 'forbidden' } | { kind: 'not_found' }

export async function canEditProfile(
  db: D1Database,
  input: { profileId: string; actor: UserRecord },
): Promise<ProfileEditAccess> {
  const target = await getProfileById(db, input.profileId)
  if (!target) return { kind: 'not_found' }

  if (target.kind === 'human') {
    const ownProfileId = await findHumanProfileId(db, {
      userId: input.actor.id,
      displayName: input.actor.displayName,
    })

    if (ownProfileId !== target.id) return { kind: 'forbidden' }
  }

  return { kind: 'allowed', profile: target }
}
