import { Hono } from 'hono'

import type { AppEnv } from '../env'
import { requireSession } from '../middleware/session'
import { readProfileImage } from '../services/profile-avatars'

/**
 * Serves an uploaded profile picture.
 *
 * Session-gated like everything else: a picture is not public, and the app is
 * not public either. An `<img>` sends the session cookie, so this works without
 * any signed-URL scheme.
 *
 * The URL carries the row's version (`?v=updated_at`), so the response can be
 * cached hard: replacing a picture changes the URL rather than the content
 * behind it.
 */
export const avatarRoutes = new Hono<AppEnv>()

avatarRoutes.use('*', requireSession)

avatarRoutes.get('/:profileId', async (c) => {
  const record = await readProfileImage(c.env.DB, c.req.param('profileId'))

  if (!record) return c.body(null, 404)

  let binary: string
  try {
    binary = atob(record.data)
  } catch {
    // Stored data that no longer decodes is a bug, not a user error. Say
    // nothing about why: the response is for an <img> tag.
    return c.body(null, 404)
  }

  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return c.body(bytes, 200, {
    'content-type': record.mime,
    // Versioned URL, so the content behind it never changes.
    'cache-control': 'private, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    // An uploaded image is data, never a document.
    'content-disposition': 'inline',
  })
})
