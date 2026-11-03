import type { D1Database } from '@cloudflare/workers-types'

/**
 * The only place authentication SQL lives.
 *
 * Defined as an interface so the whole sign-in flow can be tested without a
 * database. `createD1AuthStore` is the production implementation; tests use a
 * small in-memory one. No business rule lives here.
 */

export type UserRecord = {
  id: string
  email: string
  displayName: string
  createdAt: number
  lastLoginAt: number | null
}

export type IdentityRecord = {
  id: string
  userId: string
  provider: string
  subject: string
  createdAt: number
  lastUsedAt: number | null
}

export type SessionRecord = {
  id: string
  userId: string
  tokenHash: string
  createdAt: number
  expiresAt: number
  lastSeenAt: number | null
}

export interface AuthStore {
  findIdentity(provider: string, subject: string): Promise<IdentityRecord | null>
  findUserById(userId: string): Promise<UserRecord | null>
  createUser(input: {
    id: string
    email: string
    displayName: string
    createdAt: number
  }): Promise<void>
  updateUserProfile(
    userId: string,
    input: { email: string; displayName: string; lastLoginAt: number },
  ): Promise<void>
  createIdentity(input: {
    id: string
    userId: string
    provider: string
    subject: string
    createdAt: number
  }): Promise<void>
  touchIdentity(identityId: string, at: number): Promise<void>

  /**
   * Makes a signed-in human assignable.
   *
   * Assignees come from `team_profiles`, which is where `kind` lives. A human
   * account is not a profile until this runs, so without it a person can sign
   * in, own boards, and still be impossible to assign a task to.
   */
  ensureHumanProfile(input: { userId: string; displayName: string }): Promise<void>

  createSession(input: {
    id: string
    userId: string
    tokenHash: string
    createdAt: number
    expiresAt: number
  }): Promise<void>
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>
  touchSession(sessionId: string, input: { lastSeenAt: number; expiresAt: number }): Promise<void>
  deleteSessionByTokenHash(tokenHash: string): Promise<void>

  countAttempts(key: string, since: number): Promise<number>
  recordAttempt(key: string, at: number): Promise<void>
}

type UserRow = {
  id: string
  email: string
  display_name: string
  created_at: number
  last_login_at: number | null
}

type IdentityRow = {
  id: string
  user_id: string
  provider: string
  subject: string
  created_at: number
  last_used_at: number | null
}

type SessionRow = {
  id: string
  user_id: string
  token_hash: string
  created_at: number
  expires_at: number
  last_seen_at: number | null
}

export function createD1AuthStore(db: D1Database): AuthStore {
  return {
    async findIdentity(provider, subject) {
      const row = await db
        .prepare(
          `SELECT id, user_id, provider, subject, created_at, last_used_at
             FROM auth_identities
            WHERE provider = ? AND subject = ?`,
        )
        .bind(provider, subject)
        .first<IdentityRow>()

      return row
        ? {
            id: row.id,
            userId: row.user_id,
            provider: row.provider,
            subject: row.subject,
            createdAt: row.created_at,
            lastUsedAt: row.last_used_at,
          }
        : null
    },

    async findUserById(userId) {
      const row = await db
        .prepare(
          'SELECT id, email, display_name, created_at, last_login_at FROM users WHERE id = ?',
        )
        .bind(userId)
        .first<UserRow>()

      return row
        ? {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            createdAt: row.created_at,
            lastLoginAt: row.last_login_at,
          }
        : null
    },

    async createUser(input) {
      await db
        .prepare(
          'INSERT INTO users (id, email, display_name, created_at, last_login_at) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(input.id, input.email, input.displayName, input.createdAt, input.createdAt)
        .run()
    },

    async updateUserProfile(userId, input) {
      await db
        .prepare('UPDATE users SET email = ?, display_name = ?, last_login_at = ? WHERE id = ?')
        .bind(input.email, input.displayName, input.lastLoginAt, userId)
        .run()
    },

    async createIdentity(input) {
      await db
        .prepare(
          'INSERT INTO auth_identities (id, user_id, provider, subject, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          input.id,
          input.userId,
          input.provider,
          input.subject,
          input.createdAt,
          input.createdAt,
        )
        .run()
    },

    async touchIdentity(identityId, at) {
      await db
        .prepare('UPDATE auth_identities SET last_used_at = ? WHERE id = ?')
        .bind(at, identityId)
        .run()
    },

    /**
     * Creates or refreshes the human's assignable profile.
     *
     * Deliberately swallows failures: a naming collision must never stop
     * somebody signing in. The worst case is that they are not assignable
     * until the name is resolved, which is recoverable; a failed login is not.
     */
    async ensureHumanProfile({ userId, displayName }) {
      const profileId = `prf_user_${userId}`

      try {
        const clash = await db
          .prepare('SELECT id, kind FROM team_profiles WHERE display_name = ? AND id <> ?')
          .bind(displayName, profileId)
          .first<{ id: string; kind: string }>()

        // A human profile already carries this name: a person pre-created before
        // their first sign-in (Abdul, for instance). Adopt it rather than
        // creating a second "Abdul (human)" beside it.
        if (clash?.kind === 'human') return

        // A non-human profile owns the name (an AI profile, typically).
        // Disambiguate rather than steal it.
        const name = clash ? `${displayName} (human)` : displayName

        await db
          .prepare(
            `INSERT INTO team_profiles (id, display_name, role_title, kind, avatar_path, active)
             VALUES (?, ?, 'Administrator', 'human', NULL, 1)
             ON CONFLICT(id) DO UPDATE SET
               display_name = excluded.display_name,
               role_title = excluded.role_title,
               kind = 'human',
               active = 1`,
          )
          .bind(profileId, name)
          .run()
      } catch {
        // See the comment above: never block sign-in for a profile sync.
      }
    },

    async createSession(input) {
      await db
        .prepare(
          'INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          input.id,
          input.userId,
          input.tokenHash,
          input.createdAt,
          input.expiresAt,
          input.createdAt,
        )
        .run()
    },

    async findSessionByTokenHash(tokenHash) {
      const row = await db
        .prepare(
          `SELECT id, user_id, token_hash, created_at, expires_at, last_seen_at
             FROM sessions
            WHERE token_hash = ?`,
        )
        .bind(tokenHash)
        .first<SessionRow>()

      return row
        ? {
            id: row.id,
            userId: row.user_id,
            tokenHash: row.token_hash,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            lastSeenAt: row.last_seen_at,
          }
        : null
    },

    async touchSession(sessionId, input) {
      await db
        .prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?')
        .bind(input.lastSeenAt, input.expiresAt, sessionId)
        .run()
    },

    async deleteSessionByTokenHash(tokenHash) {
      await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
    },

    async countAttempts(key, since) {
      const row = await db
        .prepare('SELECT COUNT(*) AS total FROM auth_attempts WHERE key = ? AND attempted_at >= ?')
        .bind(key, since)
        .first<{ total: number }>()

      return row?.total ?? 0
    },

    async recordAttempt(key, at) {
      await db
        .prepare('INSERT INTO auth_attempts (key, attempted_at) VALUES (?, ?)')
        .bind(key, at)
        .run()
      // Opportunistic pruning keeps the table bounded without a cron trigger.
      await db
        .prepare('DELETE FROM auth_attempts WHERE attempted_at < ?')
        .bind(at - 3_600_000)
        .run()
    },
  }
}
