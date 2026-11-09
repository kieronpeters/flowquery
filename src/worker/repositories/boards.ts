import type { D1Database } from '@cloudflare/workers-types'

import type { BoardRow, ProfileDetailRow, ProfileRow, TaskRow } from '../domain/types'

/**
 * All SQL lives here (docs/ARCHITECTURE.md §3).
 *
 * Every function that returns board data takes `boardId` as its first
 * parameter. That is deliberate: there is no signature that can return tenant
 * data without a scope (SEC-001). When the agent API arrives in M7 it reuses
 * these functions with the board taken from the token, not from the request.
 */

export async function getBoardById(db: D1Database, boardId: string): Promise<BoardRow | null> {
  return await db
    .prepare(
      'SELECT id, name, description, created_by, created_at, updated_at, theme FROM boards WHERE id = ?',
    )
    .bind(boardId)
    .first<BoardRow>()
}

/** Stores the appearance document. Returns false when the board does not exist. */
export async function updateBoardTheme(
  db: D1Database,
  input: { boardId: string; theme: unknown; now: number },
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE boards SET theme = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(input.theme), input.now, input.boardId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}

export type BoardWithCountRow = BoardRow & { task_count: number }

/** Every board, newest first, with its task count. Humans can see all boards. */
export async function listBoardsWithTaskCounts(db: D1Database): Promise<BoardWithCountRow[]> {
  const { results } = await db
    .prepare(
      `SELECT b.id, b.name, b.description, b.created_by, b.created_at, b.updated_at,
              COUNT(t.id) AS task_count
         FROM boards b
         LEFT JOIN tasks t ON t.board_id = b.id
        GROUP BY b.id
        ORDER BY b.created_at DESC`,
    )
    .all<BoardWithCountRow>()

  return results ?? []
}

export async function insertBoard(
  db: D1Database,
  input: { id: string; name: string; createdBy: string; now: number },
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO boards (id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(input.id, input.name, input.createdBy, input.now, input.now)
    .run()
}

/** Returns false when the board does not exist. */
export async function updateBoardName(
  db: D1Database,
  input: { boardId: string; name: string; now: number },
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE boards SET name = ?, updated_at = ? WHERE id = ?')
    .bind(input.name, input.now, input.boardId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}

/** Stores the one-line description. Null clears it. */
export async function updateBoardDescription(
  db: D1Database,
  input: { boardId: string; description: string | null; now: number },
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE boards SET description = ?, updated_at = ? WHERE id = ?')
    .bind(input.description, input.now, input.boardId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}
/** Returns false when the board does not exist. Cascades to tasks, comments, activity and tokens. */
export async function deleteBoardById(db: D1Database, boardId: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM boards WHERE id = ?').bind(boardId).run()
  return (result.meta?.changes ?? 0) > 0
}

export async function listTasksByBoard(db: D1Database, boardId: string): Promise<TaskRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, board_id, title, description, status, position, priority,
              assignee_profile_id, due_date, version, created_at, updated_at
         FROM tasks
        WHERE board_id = ?
        ORDER BY status, position, created_at`,
    )
    .bind(boardId)
    .all<TaskRow>()

  return results ?? []
}

export async function listActiveProfiles(db: D1Database): Promise<ProfileRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, display_name, role_title, kind, avatar_path, active
         FROM team_profiles
        WHERE active = 1
        ORDER BY CASE kind WHEN 'human' THEN 0 WHEN 'ai' THEN 1 ELSE 2 END, display_name`,
    )
    .all<ProfileRow>()

  return results ?? []
}

/** One assignable profile, or null. Profiles are global, so no board scope. */
export async function getProfileById(
  db: D1Database,
  profileId: string,
): Promise<ProfileRow | null> {
  return await db
    .prepare(
      'SELECT id, display_name, role_title, kind, avatar_path, active FROM team_profiles WHERE id = ?',
    )
    .bind(profileId)
    .first<ProfileRow>()
}

/**
 * The human profile belonging to a signed-in user.
 *
 * `ensureHumanProfile` normally creates `prf_user_<userId>`, but a person whose
 * profile was created before their first sign-in (Abdul, for instance) keeps
 * that earlier row instead. Matching on either keeps both cases working.
 */
export async function findHumanProfileId(
  db: D1Database,
  input: { userId: string; displayName: string },
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT id
         FROM team_profiles
        WHERE kind = 'human'
          AND (id = ? OR display_name = ?)
        ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END
        LIMIT 1`,
    )
    .bind(`prf_user_${input.userId}`, input.displayName, `prf_user_${input.userId}`)
    .first<{ id: string }>()

  return row?.id ?? null
}

/**
 * One profile page, including the optional prose.
 *
 * Read explicitly rather than reusing `getProfileById`: that function is called
 * on paths where the text is not needed, and selecting it there would make the
 * hot path pay for a page nobody opened.
 */
export async function getProfileDetailById(
  db: D1Database,
  profileId: string,
): Promise<ProfileDetailRow | null> {
  return await db
    .prepare(
      `SELECT id, display_name, role_title, kind, avatar_path, active,
              about, skills, development
         FROM team_profiles
        WHERE id = ?`,
    )
    .bind(profileId)
    .first<ProfileDetailRow>()
}

/**
 * Replaces the editable text on a profile.
 *
 * One fixed statement rather than a dynamic SET clause: the service merges the
 * fields the caller left out with what is already stored, so the SQL never has
 * to be assembled from strings. Returns false when the profile vanished.
 */
export async function updateProfileDetails(
  db: D1Database,
  input: {
    profileId: string
    roleTitle: string
    about: string | null
    skills: string | null
    development: string | null
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE team_profiles
          SET role_title = ?, about = ?, skills = ?, development = ?
        WHERE id = ?`,
    )
    .bind(input.roleTitle, input.about, input.skills, input.development, input.profileId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}

/**
 * The GitHub picture for one human profile, if that account is known.
 *
 * A human's face comes from GitHub until they upload one (DEC-036). The link
 * is the reverse of `findHumanProfileId`: either the account owns
 * `prf_user_<id>`, or it adopted a profile created before its first sign-in by
 * matching display name. Without this the directory would show initials for a
 * person whose GitHub picture the app already holds.
 */
export async function getHumanGithubAvatar(
  db: D1Database,
  input: { profileId: string; displayName: string },
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT avatar_url
         FROM users
        WHERE ('prf_user_' || id = ? OR display_name = ?)
          AND avatar_url IS NOT NULL
        ORDER BY CASE WHEN 'prf_user_' || id = ? THEN 0 ELSE 1 END
        LIMIT 1`,
    )
    .bind(input.profileId, input.displayName, input.profileId)
    .first<{ avatar_url: string }>()

  return row?.avatar_url ?? null
}

/**
 * Every human profile whose GitHub picture is known, keyed by profile id.
 *
 * One query rather than one per person: the directory lists everyone, and a
 * loop of lookups would turn a single page load into a burst of statements.
 */
export async function listHumanGithubAvatars(db: D1Database): Promise<Map<string, string>> {
  const { results } = await db
    .prepare(
      `SELECT p.id AS profile_id, u.avatar_url
         FROM team_profiles p
         JOIN users u
           ON u.id = (
                SELECT u2.id
                  FROM users u2
                 WHERE 'prf_user_' || u2.id = p.id OR u2.display_name = p.display_name
                 ORDER BY CASE WHEN 'prf_user_' || u2.id = p.id THEN 0 ELSE 1 END
                 LIMIT 1
              )
        WHERE p.kind = 'human'
          AND p.active = 1
          AND u.avatar_url IS NOT NULL`,
    )
    .all<{ profile_id: string; avatar_url: string }>()

  const avatars = new Map<string, string>()
  for (const row of results ?? []) avatars.set(row.profile_id, row.avatar_url)
  return avatars
}

/** Returns false when the profile does not exist, so the route can answer 404. */
export async function updateProfileAvatar(
  db: D1Database,
  profileId: string,
  avatarPath: string,
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE team_profiles SET avatar_path = ? WHERE id = ?')
    .bind(avatarPath, profileId)
    .run()

  return (result.meta?.changes ?? 0) > 0
}
