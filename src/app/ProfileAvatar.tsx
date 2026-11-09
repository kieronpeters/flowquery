import { useState } from 'react'

import { AVATAR_PREFIX } from '../shared/avatars'
import { defaultPortraitFor } from '../shared/agent-portraits'
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
 * Sources, in order of precedence:
 *
 *  1. An uploaded picture (`avatarUrl`) — for anyone, human or agent.
 *  2. A chosen drawn colour (`svg:…`) — agents only, and always a deliberate
 *     customisation.
 *  3. The agent's default portrait, from the single mapping in
 *     `shared/agent-portraits.ts`.
 *  4. A drawn SVG avatar — the fallback when a portrait is missing or fails.
 *  5. Initials — for a human with no picture, so it is never a broken image.
 *
 * A picture that fails to load falls through to the next source rather than
 * leaving a hole: the CSP allows only GitHub and our own origin, and a stale
 * GitHub URL or a deleted asset is a normal thing to meet.
 */
export function ProfileAvatar({
  name,
  profileId,
  avatarPath,
  avatarUrl,
  kind = 'human',
  size = 32,
}: {
  name: string
  /** Stable profile id; the default portrait is looked up by this, not by name. */
  profileId?: string | null
  avatarPath?: string | null
  avatarUrl?: string | null
  kind?: 'human' | 'ai' | 'contractor'
  size?: number
}) {
  const [uploadFailed, setUploadFailed] = useState(false)
  const [portraitFailed, setPortraitFailed] = useState(false)

  const upload =
    typeof avatarUrl === 'string' && avatarUrl !== '' && !uploadFailed ? avatarUrl : null

  // A colour is an explicit choice and outranks the default portrait. A legacy
  // `team/portraits/...` path is not a choice; it predates the portrait map.
  const chosenColour =
    kind !== 'human' && typeof avatarPath === 'string' && avatarPath.startsWith(AVATAR_PREFIX)

  const portrait =
    !upload && !chosenColour && kind !== 'human' && !portraitFailed
      ? defaultPortraitFor(profileId)
      : null

  const picture = upload ?? portrait

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
        onError={() => {
          if (upload) setUploadFailed(true)
          else setPortraitFailed(true)
        }}
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
