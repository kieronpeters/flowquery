import { AVATAR_MAX_BYTES, AVATAR_MAX_EDGE, type AvatarImageMime } from '../shared/avatars'

/**
 * Prepares an uploaded picture in the browser, before it is sent.
 *
 * Resizing here rather than on the Worker is deliberate: the request body stays
 * small, the free tier's CPU budget is untouched, and a 12-megapixel phone photo
 * never reaches the server at all.
 *
 * The output is a plain base64 string plus its MIME type — no multipart, no
 * temporary file, nothing to parse on the other side.
 */

export type PreparedImage = { mime: AvatarImageMime; data: string }

export type PrepareResult = { ok: true; image: PreparedImage } | { ok: false; message: string }

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

/** Roughly how many bytes a base64 string decodes to. */
function decodedSize(data: string): number {
  return Math.floor((data.length * 3) / 4)
}

function splitDataUrl(dataUrl: string): PreparedImage | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null

  const header = dataUrl.slice(5, comma) // strip "data:"
  const mime = header.split(';')[0] ?? ''
  const base64 = header.includes('base64') ? dataUrl.slice(comma + 1) : ''

  if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp') return null
  if (!base64) return null

  return { mime, data: base64 }
}

/**
 * Encodes the canvas, preferring WebP: it keeps transparency and is far smaller
 * than PNG for a photograph. Browsers that cannot encode WebP silently return a
 * PNG data URL, which `splitDataUrl` reports honestly rather than mislabelling.
 */
function encode(canvas: HTMLCanvasElement, quality: number): PreparedImage | null {
  for (const type of ['image/webp', 'image/jpeg', 'image/png']) {
    const encoded = splitDataUrl(canvas.toDataURL(type, quality))
    if (encoded) return encoded
  }
  return null
}

export async function prepareAvatarFile(file: File): Promise<PrepareResult> {
  if (!ACCEPTED.includes(file.type)) {
    return { ok: false, message: 'Choose a PNG, JPEG or WebP image.' }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { ok: false, message: 'That file could not be read as an image.' }
  }

  try {
    let edge = AVATAR_MAX_EDGE
    let image: PreparedImage | null = null

    // Shrink, then squeeze quality, until it fits. Two rounds of each is enough
    // for any real picture; beyond that the file is not a picture.
    for (const attempt of [0, 1, 2, 3]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) return { ok: false, message: 'This browser cannot resize images.' }

      context.drawImage(bitmap, 0, 0, width, height)

      const quality = attempt < 2 ? 0.9 : 0.6
      const candidate = encode(canvas, quality)
      if (candidate && decodedSize(candidate.data) <= AVATAR_MAX_BYTES) {
        image = candidate
        break
      }

      // Still too large: halve the longest edge and try again.
      edge = Math.round(edge / 2)
      if (edge < 32) break
    }

    if (!image) {
      return {
        ok: false,
        message: 'That image is too detailed to shrink under 64 KB. Try another.',
      }
    }

    return { ok: true, image }
  } finally {
    bitmap.close?.()
  }
}
