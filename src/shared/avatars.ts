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

/* -------------------------------------------------------------------------- */
/* Uploaded pictures                                                          */
/* -------------------------------------------------------------------------- */

/**
 * What a human may upload.
 *
 * SVG is deliberately absent. An SVG is a document, not a picture: it can carry
 * script and external references, and serving one from our own origin would
 * hand an attacker the page. Raster formats only.
 */
export const AVATAR_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export type AvatarImageMime = (typeof AVATAR_IMAGE_MIME_TYPES)[number]

/** Decoded size ceiling. The browser downscales to 256px, so a real photo lands far below this. */
export const AVATAR_MAX_BYTES = 64 * 1024

/** Longest edge the browser scales to before uploading. */
export const AVATAR_MAX_EDGE = 256

export function isAvatarImageMime(value: unknown): value is AvatarImageMime {
  return typeof value === 'string' && (AVATAR_IMAGE_MIME_TYPES as readonly string[]).includes(value)
}

/**
 * Where to fetch a profile's uploaded picture, or null when it has none.
 *
 * The version is the row's `updated_at`, so a replacement busts the browser
 * cache without any extra state: the URL simply changes.
 */
export function avatarUrlFor(profileId: string, updatedAt: number | null): string | null {
  if (updatedAt === null) return null
  return `/api/v1/avatars/${profileId}?v=${updatedAt}`
}

/** Kept for the tests and for readable error messages. */
export const AVATAR_IMAGE_HINT = 'PNG, JPEG or WebP, up to 64 KB after resizing.'
