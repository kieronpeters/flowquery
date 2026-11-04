/**
 * The avatar variants an agent can wear.
 *
 * Shared by the Worker (to validate what a human sends) and the app (to draw
 * it), so the two can never disagree about what is a valid variant.
 */
export const AVATAR_VARIANTS = [
  'cyan',
  'blue',
  'indigo',
  'violet',
  'green',
  'teal',
  'amber',
  'rose',
] as const

export type AvatarVariant = (typeof AVATAR_VARIANTS)[number]

export const AVATAR_PREFIX = 'svg:'

export function isAvatarVariant(value: string): value is AvatarVariant {
  return (AVATAR_VARIANTS as readonly string[]).includes(value)
}

/** The stored form, e.g. `svg:teal`. */
export function avatarPathFor(variant: AvatarVariant): string {
  return `${AVATAR_PREFIX}${variant}`
}
