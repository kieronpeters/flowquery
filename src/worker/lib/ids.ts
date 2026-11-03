/**
 * Opaque identifier generation.
 *
 * Crockford base32: no I, L, O or U, so identifiers survive being read aloud or
 * copied by hand. Identifiers are never parsed by clients; the prefix exists
 * only to make logs and errors readable.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function randomId(prefix: string, bytes = 16): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return `${prefix}_${base32(buffer)}`
}

export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return base32(buffer)
}

function base32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

/** Hex SHA-256. Used for session tokens and any other high-entropy secret. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Base64url, unpadded. Used for PKCE values. */
export function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
