import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

import type { D1Database } from '@cloudflare/workers-types'

/**
 * A D1-compatible facade over Node's built-in SQLite, for tests.
 *
 * Why this exists: route-level fakes prove wiring, but they cannot prove SQL.
 * This runs the *actual* migration files against a real SQLite engine with
 * foreign keys enabled, so cascade deletes, CHECK constraints and indexes are
 * exercised rather than assumed.
 *
 * It implements only the subset of D1 this project uses: prepare/bind/first/
 * all/run. Anything else should be added deliberately, not guessed.
 */

function readSql(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
}

const MIGRATIONS = new URL('../../migrations/', import.meta.url)

/**
 * Applies every migration in order.
 *
 * Reads the directory rather than listing files by hand: a new migration that
 * the helper does not know about would leave the test schema behind the real
 * one, and the failures would look like application bugs.
 */
export function applyMigrations(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys = ON')

  const files = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  for (const file of files) {
    db.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'))
  }
}

export function applySeed(db: DatabaseSync): void {
  db.exec(readSql('seeds/dev.sql'))
}

export function createSqliteD1(options: { seed?: boolean } = {}): D1Database {
  const db = new DatabaseSync(':memory:')
  applyMigrations(db)
  if (options.seed) applySeed(db)

  const facade = {
    prepare(query: string) {
      let params: unknown[] = []

      const statement = {
        bind(...values: unknown[]) {
          params = values
          return statement
        },
        async first<T>() {
          const row = db.prepare(query).get(...(params as never[]))
          return (row ?? null) as T | null
        },
        async all<T>() {
          const rows = db.prepare(query).all(...(params as never[]))
          return { results: rows as T[], success: true, meta: {} }
        },
        async run() {
          const result = db.prepare(query).run(...(params as never[]))
          return { success: true, meta: { changes: Number(result.changes) } }
        },
      }

      return statement
    },

    /**
     * Sequential execution, not transactional. Real D1 wraps a batch in a
     * transaction; this does not, so do not write a test that claims to prove
     * batch atomicity — it would be testing this helper.
     */
    async batch(statements: { run: () => Promise<unknown> }[]) {
      const results = []
      for (const statement of statements) results.push(await statement.run())
      return results
    },
  }

  return facade as unknown as D1Database
}

/** Direct inspection helpers for assertions. */
export function countRows(db: D1Database, table: string): Promise<number> {
  return db
    .prepare(`SELECT COUNT(*) AS total FROM ${table}`)
    .first<{ total: number }>()
    .then((row) => row?.total ?? 0)
}
