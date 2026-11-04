import type { D1Database } from '@cloudflare/workers-types'

/**
 * Uploaded profile pictures.
 *
 * One row per profile, replaced in place. There is no history: a picture is
 * decoration, and keeping old ones would grow the database for no benefit.
 * `updated_at` doubles as a cache-busting version in the URL.
 */

export type ProfileAvatarRecord = {
  profileId: string
  mime: string
  data: string
  updatedAt: number
}

type AvatarRow = {
  profile_id: string
  mime: string
  data: string
  updated_at: number
}

export async function getProfileAvatar(
  db: D1Database,
  profileId: string,
): Promise<ProfileAvatarRecord | null> {
  const row = await db
    .prepare('SELECT profile_id, mime, data, updated_at FROM profile_avatars WHERE profile_id = ?')
    .bind(profileId)
    .first<AvatarRow>()

  if (!row) return null

  return {
    profileId: row.profile_id,
    mime: row.mime,
    data: row.data,
    updatedAt: row.updated_at,
  }
}

/**
 * Version numbers for every profile that has a picture.
 *
 * Listing profiles needs only this — never the image bytes — so a board load
 * stays the same size it was before uploads existed.
 */
export async function listAvatarVersions(db: D1Database): Promise<Map<string, number>> {
  const { results } = await db
    .prepare('SELECT profile_id, updated_at FROM profile_avatars')
    .all<{ profile_id: string; updated_at: number }>()

  const versions = new Map<string, number>()
  for (const row of results ?? []) versions.set(row.profile_id, row.updated_at)
  return versions
}

/** Just the version, for the one profile a page cares about. */
export async function getAvatarVersion(db: D1Database, profileId: string): Promise<number | null> {
  const row = await db
    .prepare('SELECT updated_at FROM profile_avatars WHERE profile_id = ?')
    .bind(profileId)
    .first<{ updated_at: number }>()

  return row?.updated_at ?? null
}

export async function upsertProfileAvatar(
  db: D1Database,
  input: { profileId: string; mime: string; data: string; now: number },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO profile_avatars (profile_id, mime, data, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(profile_id) DO UPDATE SET
         mime = excluded.mime,
         data = excluded.data,
         updated_at = excluded.updated_at`,
    )
    .bind(input.profileId, input.mime, input.data, input.now)
    .run()
}

/** Returns false when there was nothing to remove. */
export async function deleteProfileAvatar(db: D1Database, profileId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM profile_avatars WHERE profile_id = ?')
    .bind(profileId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}
