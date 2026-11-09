import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { ProfileListItemDto } from '../shared/api-types'
import { ProfileAvatar } from './ProfileAvatar'

/**
 * The directory.
 *
 * Everyone who can be assigned work, human and agent, in one place. The model
 * is deliberately familiar: you can open anyone's page, but you only get an
 * edit button on your own — and on the agents, which have no account of their
 * own.
 */

const KIND_LABEL: Record<ProfileListItemDto['kind'], string> = {
  human: 'Person',
  ai: 'AI agent',
  contractor: 'Contractor',
}

function PersonRow({ profile }: { profile: ProfileListItemDto }) {
  return (
    <li>
      <Link className="person-row" to={`/profiles/${encodeURIComponent(profile.id)}`}>
        <ProfileAvatar
          name={profile.displayName}
          avatarPath={profile.avatarPath}
          avatarUrl={profile.avatarUrl}
          kind={profile.kind}
          size={44}
        />

        <span className="person-identity">
          <span className="person-name">
            {profile.displayName}
            {profile.isSelf && <span className="person-you">You</span>}
          </span>
          <span className="person-role">{profile.roleTitle}</span>
        </span>

        <span className="person-kind">{KIND_LABEL[profile.kind]}</span>
      </Link>
    </li>
  )
}

export function PeoplePage() {
  const [profiles, setProfiles] = useState<ProfileListItemDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    fetch('/api/v1/profiles')
      .then(async (response) => {
        if (response.status === 401) {
          navigate('/login?next=/people', { replace: true })
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const body = (await response.json()) as { profiles?: ProfileListItemDto[] }
        if (!Array.isArray(body.profiles)) throw new Error('Unexpected payload')
        if (!cancelled) setProfiles(body.profiles)
      })
      .catch(() => {
        if (!cancelled) setError('The people list could not be loaded.')
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  const humans = (profiles ?? []).filter((profile) => profile.kind === 'human')
  const agents = (profiles ?? []).filter((profile) => profile.kind !== 'human')

  return (
    <main className="page">
      <h1>People</h1>
      <p className="lede">
        Everyone you can assign work to. Open a profile to see their picture, what they do, and what
        they want to develop. You can edit your own profile and any agent’s — another person’s is
        view-only.
      </p>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {profiles === null ? (
        <p role="status">Loading people…</p>
      ) : (
        <>
          <section className="people-group" aria-labelledby="people-humans">
            <h2 className="section-heading" id="people-humans">
              People
            </h2>
            {humans.length === 0 ? (
              <p className="note">Nobody has signed in yet.</p>
            ) : (
              <ul className="people-list">
                {humans.map((profile) => (
                  <PersonRow key={profile.id} profile={profile} />
                ))}
              </ul>
            )}
          </section>

          <section className="people-group" aria-labelledby="people-agents">
            <h2 className="section-heading" id="people-agents">
              Agents
            </h2>
            <ul className="people-list">
              {agents.map((profile) => (
                <PersonRow key={profile.id} profile={profile} />
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="note">
        <Link to="/boards">Back to boards</Link>
      </p>
    </main>
  )
}
