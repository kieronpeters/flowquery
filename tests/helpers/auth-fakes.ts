import type { D1Database } from '@cloudflare/workers-types'

import type {
  AuthStore,
  IdentityRecord,
  SessionRecord,
  UserRecord,
} from '../../src/worker/repositories/auth-store'

/**
 * In-memory AuthStore for testing the sign-in service without a database.
 * Behaviour mirrors the D1 implementation closely enough to be meaningful;
 * the SQL itself is verified separately against local D1.
 */
export function createMemoryAuthStore(): AuthStore & {
  users: Map<string, UserRecord>
  identities: Map<string, IdentityRecord>
  sessions: Map<string, SessionRecord>
} {
  const users = new Map<string, UserRecord>()
  const identities = new Map<string, IdentityRecord>()
  const sessions = new Map<string, SessionRecord>()
  const attempts: { key: string; at: number }[] = []

  return {
    users,
    identities,
    sessions,

    async findIdentity(provider, subject) {
      for (const identity of identities.values()) {
        if (identity.provider === provider && identity.subject === subject) return identity
      }
      return null
    },
    async findUserById(userId) {
      return users.get(userId) ?? null
    },
    async createUser(input) {
      users.set(input.id, { ...input, lastLoginAt: input.createdAt })
    },
    async updateUserProfile(userId, input) {
      const user = users.get(userId)
      if (!user) return
      users.set(userId, {
        ...user,
        email: input.email,
        displayName: input.displayName,
        lastLoginAt: input.lastLoginAt,
      })
    },
    async createIdentity(input) {
      identities.set(input.id, { ...input, lastUsedAt: input.createdAt })
    },
    async touchIdentity(identityId, at) {
      const identity = identities.get(identityId)
      if (identity) identities.set(identityId, { ...identity, lastUsedAt: at })
    },
    async createSession(input) {
      sessions.set(input.tokenHash, { ...input, lastSeenAt: input.createdAt })
    },
    async findSessionByTokenHash(tokenHash) {
      return sessions.get(tokenHash) ?? null
    },
    async touchSession(sessionId, input) {
      for (const [key, session] of sessions) {
        if (session.id === sessionId) {
          sessions.set(key, { ...session, ...input })
        }
      }
    },
    async deleteSessionByTokenHash(tokenHash) {
      sessions.delete(tokenHash)
    },
    async countAttempts(key, since) {
      return attempts.filter((attempt) => attempt.key === key && attempt.at >= since).length
    },
    async recordAttempt(key, at) {
      attempts.push({ key, at })
    },
  }
}

/**
 * A deliberately small D1 stand-in for exercising the auth HTTP routes.
 *
 * It understands only the statements the auth repository emits. Anything else
 * returns empty, which is enough for the routes under test and, importantly,
 * keeps this fake from silently "passing" queries it does not implement.
 */
export function createFakeAuthD1() {
  const users = new Map<string, Record<string, unknown>>()
  const identities = new Map<string, Record<string, unknown>>()
  const sessions = new Map<string, Record<string, unknown>>()
  const attempts: string[] = []

  const db = {
    prepare(sql: string) {
      const text = sql.replace(/\s+/g, ' ').trim()
      let params: unknown[] = []

      const statement = {
        bind(...values: unknown[]) {
          params = values
          return statement
        },
        async run() {
          if (text.startsWith('INSERT INTO users')) {
            users.set(String(params[0]), {
              id: params[0],
              email: params[1],
              display_name: params[2],
              created_at: params[3],
              last_login_at: params[4],
            })
          } else if (text.startsWith('UPDATE users')) {
            const user = users.get(String(params[3]))
            if (user) {
              user.email = params[0]
              user.display_name = params[1]
              user.last_login_at = params[2]
            }
          } else if (text.startsWith('INSERT INTO auth_identities')) {
            identities.set(String(params[3]), {
              id: params[0],
              user_id: params[1],
              provider: params[2],
              subject: params[3],
              created_at: params[4],
              last_used_at: params[5],
            })
          } else if (text.startsWith('UPDATE auth_identities')) {
            const identity = identities.get(String(params[1]))
            if (identity) identity.last_used_at = params[0]
          } else if (text.startsWith('INSERT INTO sessions')) {
            sessions.set(String(params[2]), {
              id: params[0],
              user_id: params[1],
              token_hash: params[2],
              created_at: params[3],
              expires_at: params[4],
              last_seen_at: params[5],
            })
          } else if (text.startsWith('UPDATE sessions')) {
            const session = sessions.get(String(params[2]))
            if (session) {
              session.last_seen_at = params[0]
              session.expires_at = params[1]
            }
          } else if (text.startsWith('DELETE FROM sessions')) {
            sessions.delete(String(params[0]))
          } else if (text.startsWith('INSERT INTO auth_attempts')) {
            attempts.push(String(params[0]))
          } else if (text.startsWith('DELETE FROM auth_attempts')) {
            // no-op: attempt pruning is not behaviour under test
          }
          return { success: true }
        },
        async first() {
          if (text.includes('FROM auth_identities'))
            return identities.get(String(params[1])) ?? null
          if (text.includes('FROM users')) return users.get(String(params[0])) ?? null
          if (text.includes('FROM sessions')) return sessions.get(String(params[0])) ?? null
          if (text.includes('FROM auth_attempts')) {
            return { total: attempts.filter((key) => key === String(params[0])).length }
          }
          return null
        },
        async all() {
          return { results: [], success: true, meta: {} }
        },
      }

      return statement
    },
  }

  return {
    db: db as unknown as D1Database,
    users,
    identities,
    sessions,
  }
}
