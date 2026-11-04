import {
  AVATAR_IMAGE_MIME_TYPES,
  AVATAR_MAX_BYTES,
  type AvatarImageMime,
  isAvatarImageMime,
} from '../../shared/avatars'

/**
 * Uploaded picture validation.
 *
 * Two independent checks, because either alone is insufficient:
 *
 *  1. The declared MIME type, which is what the browser says it sent.
 *  2. The actual magic bytes, which are what it really sent.
 *
 * A client can lie about the first, so the second decides. Both must agree:
 * a PNG body labelled `image/jpeg` is rejected rather than quietly relabelled,
 * because a mismatch is a sign of something hand-rolled and worth refusing.
 */

export type DecodedImage = { mime: AvatarImageMime; data: string; bytes: number }

export type ImageResult = { ok: true; image: DecodedImage } | { ok: false; message: string }

/** Reads the format from the first bytes of the file. */
export function sniffImageMime(bytes: Uint8Array): AvatarImageMime | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

/** Strict base64: no data: prefix, no whitespace, standard alphabet. */
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

function decodeBase64(value: string): Uint8Array | null {
  if (value.length === 0 || value.length % 4 !== 0) return null
  if (!BASE64.test(value)) return null

  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

/**
 * Validates an uploaded picture and returns the form we store.
 *
 * `declaredMime` is what the client claimed; `base64` is the body. The size
 * check runs on the decoded bytes, so padding tricks cannot slip a larger file
 * past it.
 */
export function decodeAvatarImage(raw: { mime?: unknown; data?: unknown }): ImageResult {
  if (!isAvatarImageMime(raw.mime)) {
    return { ok: false, message: `Images must be one of: ${AVATAR_IMAGE_MIME_TYPES.join(', ')}.` }
  }

  if (typeof raw.data !== 'string') {
    return { ok: false, message: 'Image data must be a base64 string.' }
  }

  // A cheap upper bound before doing any decoding work.
  if (raw.data.length > Math.ceil(AVATAR_MAX_BYTES / 3) * 4 + 4) {
    return { ok: false, message: 'That image is too large. Try one under 64 KB.' }
  }

  const bytes = decodeBase64(raw.data)
  if (!bytes) {
    return { ok: false, message: 'Image data is not valid base64.' }
  }

  if (bytes.length === 0) {
    return { ok: false, message: 'That image is empty.' }
  }

  if (bytes.length > AVATAR_MAX_BYTES) {
    return { ok: false, message: 'That image is too large. Try one under 64 KB.' }
  }

  const actual = sniffImageMime(bytes)
  if (!actual) {
    return { ok: false, message: 'That file is not a PNG, JPEG or WebP image.' }
  }

  if (actual !== raw.mime) {
    return { ok: false, message: 'The image does not match the type it claims to be.' }
  }

  return { ok: true, image: { mime: actual, data: raw.data, bytes: bytes.length } }
}
