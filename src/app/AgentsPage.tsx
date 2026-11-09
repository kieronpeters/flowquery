import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { ProfileDto } from '../shared/api-types'
import { ProfileAvatar } from './ProfileAvatar'

/**
 * The agents, as a directory.
 *
 * Appearance is not edited here any more. A picture or a colour belongs on the
 * agent's own profile page, next to the picture it changes, so this page
 * answers one question — who is available — and opens the page that answers
 * the rest.
 */
export function AgentsPage() {
  const [profiles, setProfiles] = useState<ProfileDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/profiles')
      .then(async (response) => {
        // The list is administration: without a session there is nothing to
        // show, so send them to sign in rather than showing an error.
        if (response.status === 401) {
          navigate('/login?next=/agents', { replace: true })
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = (await response.json()) as { profiles?: ProfileDto[] }
        if (!Array.isArray(body.profiles)) throw new Error('Unexpected payload')
        if (!cancelled) setProfiles(body.profiles.filter((profile) => profile.kind !== 'human'))
      })
      .catch(() => {
        if (!cancelled) setError('The agents could not be loaded.')
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <main className="page page-narrow">
      <h1>Agents</h1>
      <p className="lede">
        The AI specialists you can assign work to. Open a profile to see the picture, what they do
        and what they are for. Pictures and colours are changed on the profile itself.
      </p>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {profiles === null ? (
        <p role="status">Loading agents…</p>
      ) : (
        <ul className="agent-list">
          {profiles.map((profile) => (
            <li key={profile.id}>
              <Link
                className="agent-card"
                to={`/profiles/${encodeURIComponent(profile.id)}`}
                aria-label={`Open ${profile.displayName}'s profile`}
              >
                <ProfileAvatar
                  name={profile.displayName}
                  avatarPath={profile.avatarPath}
                  avatarUrl={profile.avatarUrl}
                  kind={profile.kind}
                  size={48}
                />

                <span className="agent-card-text">
                  <span className="agent-name">{profile.displayName}</span>
                  <span className="agent-role">{profile.roleTitle}</span>
                </span>

                <span className="agent-card-action" aria-hidden="true">
                  View profile
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="note">
        <Link to="/people">See everyone</Link>
      </p>
    </main>
  )
}
