import type { Allowlist } from '../auth/allowlist'
import type { GithubProfile } from '../auth/github'
import { randomId, randomToken, sha256Hex } from '../lib/ids'
import type { AuthStore, UserRecord } from '../repositories/auth-store'

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** The identity is valid but not on the allowlist. No account is created. */
export class NotAllowedError extends Error {
  constructor() {
    super('This FlowQuery instance is private.')
    this.name = 'NotAllowedError'
  }
}

export type SignInResult = {
  token: string
  user: UserRecord
  expiresAt: number
}

/**
 * Completes a sign-in after the provider has been verified.
 *
 * Rules:
 *  - an existing identity signs in even if the allowlist later changed, unless
 *    the account was removed (which is a separate, explicit action);
 *  - a new identity is created only if its numeric id is on the allowlist;
 *  - GitHub's name and email are refreshed on every sign-in, because they are
 *    display data and were never the identity key.
 */
export async function completeSignIn(input: {
  store: AuthStore
  allowlist: Allowlist
  profile: GithubProfile
  now?: number
}): Promise<SignInResult> {
  const now = input.now ?? Date.now()
  const { store, allowlist, profile } = input

  const preferredName = allowlist.get(profile.id) ?? null
  const displayName = preferredName ?? profile.displayName

  let user: UserRecord | null
  const identity = await store.findIdentity('github', profile.id)

  if (identity) {
    user = await store.findUserById(identity.userId)
    if (!user) {
      // An identity pointing at a missing user is corrupt state. Fail closed
      // rather than silently creating a second account.
      throw new Error('Identity exists without a user')
    }
    await store.touchIdentity(identity.id, now)
  } else {
    if (!allowlist.has(profile.id)) {
      throw new NotAllowedError()
    }

    const userId = randomId('usr')
    await store.createUser({
      id: userId,
      email: profile.email,
      displayName,
      createdAt: now,
    })
    await store.createIdentity({
      id: randomId('idn'),
      userId,
      provider: 'github',
      subject: profile.id,
      createdAt: now,
    })

    user = await store.findUserById(userId)
    if (!user) throw new Error('User creation did not persist')
  }

  await store.updateUserProfile(user.id, {
    email: profile.email,
    displayName,
    lastLoginAt: now,
  })

  const token = randomToken(32)
  const expiresAt = now + SESSION_TTL_MS

  await store.createSession({
    id: randomId('ses'),
    userId: user.id,
    tokenHash: await sha256Hex(token),
    createdAt: now,
    expiresAt,
  })

  return { token, user: { ...user, email: profile.email, displayName }, expiresAt }
}

/**
 * Resolves a session cookie to a user, sliding the expiry forward.
 * Returns null for unknown, expired or orphaned sessions.
 */
export async function resolveSession(input: {
  store: AuthStore
  token: string | undefined
  now?: number
}): Promise<UserRecord | null> {
  if (!input.token) return null

  const now = input.now ?? Date.now()
  const tokenHash = await sha256Hex(input.token)
  const session = await input.store.findSessionByTokenHash(tokenHash)
  if (!session) return null

  if (session.expiresAt <= now) {
    await input.store.deleteSessionByTokenHash(tokenHash)
    return null
  }

  const user = await input.store.findUserById(session.userId)
  if (!user) return null

  await input.store.touchSession(session.id, {
    lastSeenAt: now,
    expiresAt: now + SESSION_TTL_MS,
  })

  return user
}

export async function signOut(input: {
  store: AuthStore
  token: string | undefined
}): Promise<void> {
  if (!input.token) return
  await input.store.deleteSessionByTokenHash(await sha256Hex(input.token))
}
