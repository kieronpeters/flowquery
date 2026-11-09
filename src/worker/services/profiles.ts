import type { D1Database } from '@cloudflare/workers-types'

import { AVATAR_PREFIX, isAvatarVariant } from '../../shared/avatars'
import { ABOUT_MAX, DEVELOPMENT_MAX, ROLE_TITLE_MAX, SKILLS_MAX } from '../../shared/profile-limits'
import type { UserRecord } from '../repositories/auth-store'
import {
  getProfileById,
  getProfileDetailById,
  updateProfileAvatar,
  updateProfileDetails as writeProfileDetails,
} from '../repositories/boards'
import { deleteProfileAvatar } from '../repositories/profile-avatars'
import { canEditProfile } from './profile-access'

export type AvatarResult =
  { kind: 'ok' } | { kind: 'invalid'; message: string } | { kind: 'not_found' }

/**
 * Changes an agent's avatar.
 *
 * Humans are refused: their picture comes from GitHub, and letting it be
 * overwritten here would be a second, worse source of truth. The value is
 * restricted to a known variant rather than free text, so the database cannot
 * accumulate paths that the UI has no way to draw.
 */
export async function setProfileAvatar(
  db: D1Database,
  input: { profileId: string; avatarPath: unknown },
): Promise<AvatarResult> {
  const raw = input.avatarPath

  if (typeof raw !== 'string' || !raw.startsWith(AVATAR_PREFIX)) {
    return { kind: 'invalid', message: `avatarPath must look like "${AVATAR_PREFIX}teal".` }
  }

  const variant = raw.slice(AVATAR_PREFIX.length)
  if (!isAvatarVariant(variant)) {
    return { kind: 'invalid', message: `Unknown avatar variant: ${variant}.` }
  }

  const profile = await getProfileById(db, input.profileId)
  if (!profile) return { kind: 'not_found' }

  if (profile.kind === 'human') {
    return {
      kind: 'invalid',
      message: 'Human pictures come from GitHub and cannot be set here.',
    }
  }

  const updated = await updateProfileAvatar(db, input.profileId, raw)

  if (!updated) return { kind: 'not_found' }

  // Choosing a drawn avatar is a decision about how this agent looks, so it
  // also clears an uploaded picture. Otherwise the upload would keep winning
  // and the click would appear to do nothing.
  await deleteProfileAvatar(db, input.profileId)

  return { kind: 'ok' }
}

/* -------------------------------------------------------------------------- */
/* Optional profile text                                                      */
/* -------------------------------------------------------------------------- */

const TEXT_FIELDS = ['roleTitle', 'about', 'skills', 'development'] as const
type TextField = (typeof TEXT_FIELDS)[number]

export type DetailsResult =
  | { kind: 'ok' }
  | { kind: 'invalid'; field: TextField | null; message: string }
  | { kind: 'forbidden' }
  | { kind: 'not_found' }

/**
 * Newlines and tabs are legitimate in prose; the rest of C0 and DEL are not.
 * A control character in a textarea is almost always a paste accident, and it
 * makes the surrounding page behave in ways the author did not intend.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

type Normalised = { ok: true; value: string | null } | { ok: false; message: string }

function normaliseText(raw: unknown, max: number, label: string): Normalised {
  if (raw === null || raw === undefined) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, message: `${label} must be text.` }

  // Stored as \n only. A textarea treats CRLF as one break, so keeping the CR
  // would silently add a second blank line each time somebody edited the field.
  const text = raw.replace(/\r\n?/g, '\n').trim()

  if (text === '') return { ok: true, value: null }
  if (text.length > max)
    return { ok: false, message: `${label} must be ${max} characters or fewer.` }
  if (CONTROL_CHARS.test(text)) {
    return { ok: false, message: `${label} cannot contain control characters.` }
  }

  return { ok: true, value: text }
}

function normaliseOptional(
  raw: unknown,
  current: string | null,
  max: number,
  label: string,
): Normalised {
  // A field the caller did not mention is left alone, so a form that only
  // changes the About box does not wipe Skills and Development.
  if (raw === undefined) return { ok: true, value: current }
  return normaliseText(raw, max, label)
}

/**
 * Updates the text a person may write about themselves, or about an agent.
 *
 * `role_title` is NOT NULL in the schema, so it cannot be cleared the way the
 * optional sections can. An empty job title is refused rather than quietly
 * replaced with a default that nobody chose.
 */
export async function updateProfileDetails(
  db: D1Database,
  input: { profileId: string; actor: UserRecord; body: unknown },
): Promise<DetailsResult> {
  const permission = await canEditProfile(db, { profileId: input.profileId, actor: input.actor })
  if (permission.kind !== 'allowed') return permission

  const body = input.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { kind: 'invalid', field: null, message: 'Expected a JSON object.' }
  }

  const record = body as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!(TEXT_FIELDS as readonly string[]).includes(key)) {
      return { kind: 'invalid', field: null, message: `Unknown field: ${key}.` }
    }
  }

  const current = await getProfileDetailById(db, input.profileId)
  if (!current) return { kind: 'not_found' }

  let roleTitle = current.role_title
  if (record.roleTitle !== undefined) {
    const role = normaliseText(record.roleTitle, ROLE_TITLE_MAX, 'Job title')
    if (!role.ok) return { kind: 'invalid', field: 'roleTitle', message: role.message }
    if (role.value === null) {
      return { kind: 'invalid', field: 'roleTitle', message: 'Job title cannot be empty.' }
    }
    roleTitle = role.value
  }

  const about = normaliseOptional(record.about, current.about, ABOUT_MAX, 'About')
  if (!about.ok) return { kind: 'invalid', field: 'about', message: about.message }

  const skills = normaliseOptional(record.skills, current.skills, SKILLS_MAX, 'Skills')
  if (!skills.ok) return { kind: 'invalid', field: 'skills', message: skills.message }

  const development = normaliseOptional(
    record.development,
    current.development,
    DEVELOPMENT_MAX,
    'Development goals',
  )
  if (!development.ok) {
    return { kind: 'invalid', field: 'development', message: development.message }
  }

  const updated = await writeProfileDetails(db, {
    profileId: input.profileId,
    roleTitle,
    about: about.value,
    skills: skills.value,
    development: development.value,
  })

  return updated ? { kind: 'ok' } : { kind: 'not_found' }
}
