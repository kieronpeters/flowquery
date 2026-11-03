import { describe, expect, it } from 'vitest'

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

  it('seeds no placeholder humans', async () => {
    const db = createSqliteD1()

    const { results } = await db
      .prepare("SELECT display_name FROM team_profiles WHERE kind = 'human'")
      .all<{ display_name: string }>()

    // Humans come from signing in. A seeded "Owner"/"Friend" here would appear
    // in the assignee list beside the real account.
    expect(results ?? []).toHaveLength(0)
  })
})
