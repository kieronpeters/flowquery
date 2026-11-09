/**
 * Default portraits for the two human administrators.
 *
 * Keyed by the immutable GitHub numeric id, which is the identity key the
 * allowlist and `auth_identities` already use (DEC-031). Display names and
 * usernames are deliberately not used: they are mutable on GitHub.
 *
 * The supplied images are the approved defaults. They are never overwritten;
 * an upload is stored in D1 and wins, and removing it restores these files.
 */
export const HUMAN_DEFAULT_AVATARS_BY_GITHUB_ID: Record<string, string> = {
  // Kieron — production identity `github:51761129`.
  '51761129': '/brand/humans/kieron-default.png',
  // Abdul — allowlisted id, adopted by his pre-created profile on first sign-in.
  '37402145': '/brand/humans/abdul-default.png',
}

/**
 * The pre-created Abdul profile exists before his first sign-in, when there is
 * no user row and therefore no GitHub subject to match. The profile id is a
 * stable application key, not a display name, so it is safe to use as a
 * fallback until the identity exists.
 */
export const HUMAN_DEFAULT_AVATARS_BY_PROFILE_ID: Record<string, string> = {
  prf_abdul: '/brand/humans/abdul-default.png',
}

/** The default human portrait, preferring the immutable GitHub id. */
export function humanDefaultAvatarFor(input: {
  githubId?: string | null
  profileId?: string | null
}): string | null {
  if (input.githubId) {
    const byId = HUMAN_DEFAULT_AVATARS_BY_GITHUB_ID[input.githubId]
    if (byId) return byId
  }

  if (input.profileId) {
    const byProfile = HUMAN_DEFAULT_AVATARS_BY_PROFILE_ID[input.profileId]
    if (byProfile) return byProfile
  }

  return null
}
