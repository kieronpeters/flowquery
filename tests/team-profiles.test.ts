import { describe, expect, it } from 'vitest'

import { createD1AuthStore } from '../src/worker/repositories/auth-store'
import { createSqliteD1 } from './helpers/sqlite-d1'

/**
 * The agent roster must exist in a database that has only ever been migrated.
 *
 * This is the production case: it was never seeded, so for a while the live app
 * had assignable humans and no agents at all. A migration carries the roster
 * now, and this fails if somebody deletes that migration or edits the list.
 */
describe('agent roster in a migrated-only database', () => {
  it('contains the AI team and the contractor', async () => {
    const db = createSqliteD1() // migrations only, no seed

    const { results } = await db
      .prepare('SELECT display_name, kind FROM team_profiles ORDER BY kind, display_name')
      .all<{ display_name: string; kind: string }>()

    const rows = results ?? []
    const ai = rows.filter((row) => row.kind === 'ai')
    const contractor = rows.filter((row) => row.kind === 'contractor')

    expect(ai).toHaveLength(15)
    expect(contractor).toHaveLength(1)

    // Spot-check the roster rather than trusting the count alone.
    const names = ai.map((row) => row.display_name)
    for (const name of ['Bob', 'Alex', 'Sarah', 'Victoria', 'Chris']) {
      expect(names).toContain(name)
    }

    // Agents are profiles, never logins: a migration must not create accounts.
    const users = await db.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>()
    expect(users?.total).toBe(0)
  })

  it('names exactly one pre-created human, Abdul, and no placeholders', async () => {
    const db = createSqliteD1()

    const { results } = await db
      .prepare("SELECT display_name FROM team_profiles WHERE kind = 'human' ORDER BY display_name")
      .all<{ display_name: string }>()

    // Kieron is created from users on sign-in; Abdul is pre-created so he can
    // be assigned work before his first login. "Owner" and "Friend" are gone.
    expect((results ?? []).map((row) => row.display_name)).toEqual(['Abdul'])
  })

  it('adopts a pre-created human profile instead of duplicating it', async () => {
    const db = createSqliteD1()
    const store = createD1AuthStore(db)

    // Abdul signs in for the first time. His profile already exists, so the
    // account should attach to it, not create "Abdul" twice.
    await store.ensureHumanProfile({ userId: 'usr_abdul', displayName: 'Abdul' })

    const { results } = await db
      .prepare("SELECT id FROM team_profiles WHERE kind = 'human'")
      .all<{ id: string }>()

    expect(results).toHaveLength(1)
    expect(results?.[0]?.id).toBe('prf_abdul')
  })

  it('does not steal a name an AI profile already uses', async () => {
    const db = createSqliteD1()
    const store = createD1AuthStore(db)

    // A person called Bob must not take prf_bob from the agent.
    await store.ensureHumanProfile({ userId: 'usr_bob', displayName: 'Bob' })

    const row = await db
      .prepare("SELECT display_name FROM team_profiles WHERE id = 'prf_user_usr_bob'")
      .first<{ display_name: string }>()

    expect(row?.display_name).toBe('Bob (human)')
  })
})
