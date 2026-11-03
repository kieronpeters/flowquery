import { readFileSync } from 'node:fs'
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

export function applyMigrations(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(readSql('migrations/0001_init.sql'))
  db.exec(readSql('migrations/0002_auth_attempts.sql'))
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
