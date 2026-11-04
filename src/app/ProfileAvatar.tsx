import { useState } from 'react'

import { AgentAvatar } from './AgentAvatar'

/** First letter of each word, at most two: "Kieron Peters" -> "KP". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const letters = parts.slice(0, 2).map((part) => part[0]!.toUpperCase())
  return letters.join('')
}

/**
 * One person or agent, in a circle.
 *
 * Three sources, in order of precedence:
 *
 *  1. An uploaded picture (`avatarUrl`) — for anyone, human or agent.
 *  2. A drawn SVG avatar — for agents and the contractor.
 *  3. Initials — for a human with neither, so it is never a broken image.
 *
 * A picture that fails to load falls through to the next source rather than
 * leaving a hole: the CSP allows only GitHub and our own origin, and a stale
 * GitHub URL is a normal thing to meet.
 */
export function ProfileAvatar({
  name,
  avatarPath,
  avatarUrl,
  kind = 'human',
  size = 32,
}: {
  name: string
  avatarPath?: string | null
  avatarUrl?: string | null
  kind?: 'human' | 'ai' | 'contractor'
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const picture = typeof avatarUrl === 'string' && avatarUrl !== '' && !failed ? avatarUrl : null

  if (picture) {
    return (
      <img
        className="avatar"
        src={picture}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    )
  }

  if (kind !== 'human') {
    return (
      <AgentAvatar
        name={name}
        avatarPath={avatarPath ?? null}
        contractor={kind === 'contractor'}
        size={size}
      />
    )
  }

  return (
    <span
      className="avatar avatar-fallback"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
