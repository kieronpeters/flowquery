import {
  AVATAR_PREFIX,
  AVATAR_VARIANTS,
  isAvatarVariant,
  type AvatarVariant,
} from '../shared/avatars'

/**
 * Agent avatars, drawn rather than photographed.
 *
 * These are the fallback, not the default. Each agent normally shows its
 * portrait from `public/brand/agents/defaults/`, and a human may upload a
 * picture. A drawn avatar appears only when someone deliberately chooses a
 * colour, or when the portrait is missing and the image fails to load.
 *
 * The chosen variant is stored on the profile as `svg:<name>`, so the choice is
 * explicit and can be cleared by Restore default.
 */

/** Tile background and glyph colour for each variant. */
export const AVATAR_PALETTE: Record<
  AvatarVariant,
  { tile: string; glyph: string; accent: string }
> = {
  cyan: { tile: '#062b3f', glyph: '#7fe3ff', accent: '#22b8e6' },
  blue: { tile: '#0a1f4a', glyph: '#9dc2ff', accent: '#3b82f6' },
  indigo: { tile: '#191a4a', glyph: '#b4b6ff', accent: '#6366f1' },
  violet: { tile: '#2a1140', glyph: '#d9b0ff', accent: '#a855f7' },
  green: { tile: '#0c2c1a', glyph: '#9be7b4', accent: '#22c55e' },
  teal: { tile: '#062e2a', glyph: '#8ef0dd', accent: '#14b8a6' },
  amber: { tile: '#3a2408', glyph: '#ffd79a', accent: '#f59e0b' },
  rose: { tile: '#3a0f1f', glyph: '#ffb3c7', accent: '#f43f5e' },
}

/** A stable variant for a name, so an unconfigured agent still looks distinct. */
export function defaultVariant(name: string): AvatarVariant {
  let hash = 0
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) % 100000
  return AVATAR_VARIANTS[hash % AVATAR_VARIANTS.length]!
}

/** `svg:teal` -> `teal`; anything unrecognised falls back to the name. */
export function variantFromPath(path: string | null | undefined, name: string): AvatarVariant {
  if (path && path.startsWith(AVATAR_PREFIX)) {
    const value = path.slice(AVATAR_PREFIX.length)
    if (isAvatarVariant(value)) return value
  }
  return defaultVariant(name)
}

export function AgentAvatar({
  name,
  avatarPath,
  contractor = false,
  size = 24,
}: {
  name: string
  avatarPath?: string | null
  contractor?: boolean
  size?: number
}) {
  const colours = AVATAR_PALETTE[variantFromPath(avatarPath, name)]

  return (
    <svg
      className="avatar agent-avatar"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={`${name} avatar`}
      focusable="false"
    >
      <rect width="32" height="32" rx="8" fill={colours.tile} />
      {contractor ? (
        <>
          {/* Shoulders and a suit collar. */}
          <path d="M6 28c0-4.4 4.5-7 10-7s10 2.6 10 7z" fill="#0b1020" />
          <path d="M13 21.5 16 25l3-3.5-3-1.6z" fill="#e6e9f2" opacity="0.9" />
          {/* Head with dark glasses. */}
          <rect x="10" y="8" width="12" height="10" rx="4.5" fill={colours.glyph} />
          <rect x="11.2" y="11.2" width="9.6" height="3.2" rx="1.4" fill="#0b1020" />
        </>
      ) : (
        <>
          {/* Antenna. */}
          <line x1="16" y1="6.5" x2="16" y2="4" stroke={colours.accent} strokeWidth="1.6" />
          <circle cx="16" cy="3.4" r="1.6" fill={colours.accent} />
          {/* Head. */}
          <rect x="8.5" y="7.5" width="15" height="13" rx="5" fill={colours.glyph} />
          {/* Eyes. */}
          <circle cx="13" cy="13.4" r="1.7" fill={colours.tile} />
          <circle cx="19" cy="13.4" r="1.7" fill={colours.tile} />
          {/* Mouth grille. */}
          <rect x="12.5" y="17" width="7" height="1.4" rx="0.7" fill={colours.tile} />
          {/* Shoulders. */}
          <path d="M7 28c0-3.8 4-6 9-6s9 2.2 9 6z" fill={colours.accent} opacity="0.35" />
        </>
      )}
    </svg>
  )
}
