/**
 * Allowlist parsing for the two human administrators.
 *
 * Format: `<immutable-github-numeric-id>:<display name>`, comma separated.
 *
 *   AUTH_ALLOWLIST="583231:Kieron,1234567:Friend"
 *
 * The numeric id is the only identity key (DEC-031). Usernames and email
 * addresses are mutable on GitHub and can be re-claimed, so keying on them
 * would silently transfer access; the numeric id cannot change and is never
 * reused.
 *
 * The display name is optional. When omitted, GitHub's own name is used.
 * An empty or malformed allowlist admits nobody: fail closed.
 */

/** GitHub numeric id → optional preferred display name. */
export type Allowlist = Map<string, string | null>

export function parseAllowlist(raw: string | undefined): Allowlist {
  const entries: Allowlist = new Map()
  if (!raw) return entries

  for (const part of raw.split(',')) {
    const entry = part.trim()
    if (!entry) continue

    const separator = entry.indexOf(':')
    const id = (separator === -1 ? entry : entry.slice(0, separator)).trim()
    const name = separator === -1 ? '' : entry.slice(separator + 1).trim()

    // GitHub numeric ids are positive integers. Anything else is a typo and is
    // ignored rather than guessed at.
    if (!/^\d+$/.test(id)) continue

    entries.set(id, name || null)
  }

  return entries
}

export function isAllowed(allowlist: Allowlist, githubUserId: string): boolean {
  return allowlist.has(String(githubUserId))
}
