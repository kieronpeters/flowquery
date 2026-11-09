import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import type { ApiError, ProfileDetailDto } from '../shared/api-types'
import { ABOUT_MAX, DEVELOPMENT_MAX, ROLE_TITLE_MAX, SKILLS_MAX } from '../shared/profile-limits'
import { prepareAvatarFile } from './image-resize'
import { ProfileAvatar } from './ProfileAvatar'

/**
 * One profile page.
 *
 * The picture is the point: until now a face existed only as a 32px circle in
 * the header. Here it is large enough to recognise, next to the optional prose
 * a person chose to write.
 *
 * Viewing is open to every signed-in human. Editing is not: `canEdit` comes
 * from the server, and the write endpoint enforces the same rule again.
 */

const KIND_LABEL: Record<ProfileDetailDto['kind'], string> = {
  human: 'Person',
  ai: 'AI agent',
  contractor: 'Contractor',
}

type FormState = {
  roleTitle: string
  about: string
  skills: string
  development: string
}

function formFrom(profile: ProfileDetailDto): FormState {
  return {
    roleTitle: profile.roleTitle,
    about: profile.about ?? '',
    skills: profile.skills ?? '',
    development: profile.development ?? '',
  }
}

export function ProfilePage() {
  const { profileId = '' } = useParams<{ profileId: string }>()
  const [profile, setProfile] = useState<ProfileDetailDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pictureBusy, setPictureBusy] = useState(false)
  const [pictureError, setPictureError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const previewTrigger = useRef<HTMLButtonElement | null>(null)
  const previewClose = useRef<HTMLButtonElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    fetch(`/api/v1/profiles/${encodeURIComponent(profileId)}`)
      .then(async (response) => {
        if (response.status === 401) {
          navigate(`/login?next=${encodeURIComponent(`/profiles/${profileId}`)}`, { replace: true })
          return
        }
        if (response.status === 404) {
          if (!cancelled) setError('That profile does not exist.')
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const body = (await response.json()) as { profile?: ProfileDetailDto }
        if (!body.profile) throw new Error('Unexpected payload')

        if (!cancelled) {
          setProfile(body.profile)
          setForm(formFrom(body.profile))
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('The profile could not be loaded.')
      })

    return () => {
      cancelled = true
    }
  }, [navigate, profileId, reloadKey])

  // The preview is a small modal, so it has to behave like one: Escape closes
  // it, focus moves to the close button, and closing returns focus to the
  // picture that opened it. Without the last part a keyboard user is dropped
  // at the top of the document.
  useEffect(() => {
    if (!previewOpen) return

    previewClose.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPreviewOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previewTrigger.current?.focus()
    }
  }, [previewOpen])

  function startEditing() {
    if (!profile) return
    setForm(formFrom(profile))
    setSaveError(null)
    setEditing(true)
  }

  function cancelEditing() {
    if (profile) setForm(formFrom(profile))
    setSaveError(null)
    setEditing(false)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !form || saving) return

    setSaving(true)
    setSaveError(null)

    try {
      const response = await fetch(`/api/v1/profiles/${encodeURIComponent(profile.id)}/details`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setSaveError(body?.error.message ?? 'Those changes could not be saved.')
        return
      }

      // Re-read rather than echoing the form: the server trims, normalises line
      // endings and decides what an empty field means, and the page should show
      // what was actually stored.
      setEditing(false)
      setReloadKey((key) => key + 1)
    } catch {
      setSaveError('The request failed. Check the connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadPicture(file: File) {
    if (!profile || pictureBusy) return

    setPictureBusy(true)
    setPictureError(null)

    try {
      const prepared = await prepareAvatarFile(file)
      if (!prepared.ok) {
        setPictureError(prepared.message)
        return
      }

      const response = await fetch(`/api/v1/profiles/${encodeURIComponent(profile.id)}/image`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prepared.image),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiError | null
        setPictureError(body?.error.message ?? 'That picture could not be saved.')
        return
      }

      const body = (await response.json()) as { avatarUrl: string | null }
      setProfile({ ...profile, avatarUrl: body.avatarUrl, hasUploadedImage: true })
    } catch {
      setPictureError('The upload failed. Check the connection and try again.')
    } finally {
      setPictureBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function removePicture() {
    if (!profile || pictureBusy) return

    setPictureBusy(true)
    setPictureError(null)

    try {
      const response = await fetch(`/api/v1/profiles/${encodeURIComponent(profile.id)}/image`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setPictureError('That picture could not be removed.')
        return
      }

      // Re-read: for a human, removing the upload reveals the GitHub avatar
      // underneath, which the browser does not know about.
      setReloadKey((key) => key + 1)
    } finally {
      setPictureBusy(false)
    }
  }

  if (error) {
    return (
      <main className="page page-narrow">
        <h1>Profile</h1>
        <p className="alert" role="alert">
          {error}
        </p>
        <p className="note">
          <Link to="/people">Back to people</Link>
        </p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="page page-narrow">
        <p role="status">Loading profile…</p>
      </main>
    )
  }

  const developmentLabel =
    profile.kind === 'human'
      ? 'What I want to develop using agents'
      : 'What this agent should help develop'

  const sections = [
    { key: 'about', label: 'About me', value: profile.about },
    { key: 'skills', label: 'Skills', value: profile.skills },
    { key: 'development', label: developmentLabel, value: profile.development },
  ] as const

  // Big enough to recognise a face, small enough to leave the page behind it
  // visible. Recomputed on each render; the preview is opened rarely enough
  // that a resize listener would be more machinery than it is worth.
  const previewSize = Math.max(
    220,
    Math.round(Math.min(560, Math.min(window.innerWidth, window.innerHeight) * 0.72)),
  )

  // Initials scale, but they are not a picture: only a real image (an upload or
  // a GitHub avatar) or a drawn agent avatar is worth opening full size.
  const canPreview = Boolean(profile.avatarUrl) || profile.kind !== 'human'

  return (
    <main className="page profile-page">
      <header className="profile-hero">
        {canPreview ? (
          <button
            ref={previewTrigger}
            className="profile-picture-button"
            type="button"
            aria-haspopup="dialog"
            aria-label={`View ${profile.displayName}’s picture larger`}
            onClick={() => setPreviewOpen(true)}
          >
            <ProfileAvatar
              name={profile.displayName}
              avatarPath={profile.avatarPath}
              avatarUrl={profile.avatarUrl}
              kind={profile.kind}
              size={240}
            />
            <span className="profile-picture-hint">View larger</span>
          </button>
        ) : (
          <ProfileAvatar
            name={profile.displayName}
            avatarPath={profile.avatarPath}
            avatarUrl={profile.avatarUrl}
            kind={profile.kind}
            size={240}
          />
        )}

        <div className="profile-hero-text">
          <p className="profile-eyebrow">
            {KIND_LABEL[profile.kind]}
            {profile.kind === 'human' && profile.canEdit ? ' · your profile' : ''}
          </p>

          <h1>{profile.displayName}</h1>
          <p className="profile-role">{profile.roleTitle}</p>

          {profile.canEdit ? (
            !editing && (
              <button className="button button-primary" type="button" onClick={startEditing}>
                Edit profile
              </button>
            )
          ) : (
            <p className="profile-readonly">
              Only {profile.displayName} can edit this profile. You can still view it.
            </p>
          )}

          {profile.canEdit && (
            <div className="profile-picture-actions">
              <button
                className="button button-quiet inline"
                type="button"
                disabled={pictureBusy}
                onClick={() => fileInput.current?.click()}
              >
                {pictureBusy ? 'Working…' : 'Upload a new picture'}
              </button>

              {profile.hasUploadedImage && (
                <button
                  className="button button-quiet inline"
                  type="button"
                  disabled={pictureBusy}
                  onClick={() => void removePicture()}
                >
                  Remove picture
                </button>
              )}
            </div>
          )}

          {pictureError && (
            <p className="alert" role="alert">
              {pictureError}
            </p>
          )}
        </div>
      </header>

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        aria-label="Choose a profile picture"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadPicture(file)
        }}
      />

      {previewOpen && (
        <div
          className="picture-preview"
          role="dialog"
          aria-modal="true"
          aria-label={`${profile.displayName}’s profile picture`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreviewOpen(false)
          }}
        >
          <div className="picture-preview-panel">
            <ProfileAvatar
              name={profile.displayName}
              avatarPath={profile.avatarPath}
              avatarUrl={profile.avatarUrl}
              kind={profile.kind}
              size={previewSize}
            />

            <div className="picture-preview-caption">
              <span>{profile.displayName}</span>
              <button
                ref={previewClose}
                className="button button-quiet inline"
                type="button"
                onClick={() => setPreviewOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && form ? (
        <form className="profile-edit" onSubmit={save}>
          <label className="field">
            <span className="field-label">Job title</span>
            <input
              className="input"
              type="text"
              value={form.roleTitle}
              maxLength={ROLE_TITLE_MAX}
              onChange={(event) => setForm({ ...form, roleTitle: event.target.value })}
              required
            />
          </label>

          <label className="field">
            <span className="field-label">About me</span>
            <textarea
              className="input textarea"
              rows={5}
              value={form.about}
              maxLength={ABOUT_MAX}
              onChange={(event) => setForm({ ...form, about: event.target.value })}
              placeholder="A sentence or two about who you are and what you work on."
            />
            <span className="field-hint">{ABOUT_MAX - form.about.length} characters left</span>
          </label>

          <label className="field">
            <span className="field-label">Skills</span>
            <textarea
              className="input textarea"
              rows={4}
              value={form.skills}
              maxLength={SKILLS_MAX}
              onChange={(event) => setForm({ ...form, skills: event.target.value })}
              placeholder="Languages, tools, domains — whatever is worth knowing."
            />
            <span className="field-hint">{SKILLS_MAX - form.skills.length} characters left</span>
          </label>

          <label className="field">
            <span className="field-label">{developmentLabel}</span>
            <textarea
              className="input textarea"
              rows={4}
              value={form.development}
              maxLength={DEVELOPMENT_MAX}
              onChange={(event) => setForm({ ...form, development: event.target.value })}
              placeholder="What you would like the agents to take on, or help you learn."
            />
            <span className="field-hint">
              {DEVELOPMENT_MAX - form.development.length} characters left
            </span>
          </label>

          {saveError && (
            <p className="alert" role="alert">
              {saveError}
            </p>
          )}

          <div className="profile-edit-actions">
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <button
              className="button button-quiet"
              type="button"
              disabled={saving}
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-sections">
          {sections.map((section) => (
            <section className="profile-section" key={section.key}>
              <h2 className="section-heading">{section.label}</h2>
              {section.value ? (
                <p className="profile-text">{section.value}</p>
              ) : (
                <p className="profile-empty">Not filled in yet.</p>
              )}
            </section>
          ))}
        </div>
      )}

      <p className="note">
        <Link to="/people">Back to people</Link>
      </p>
    </main>
  )
}
