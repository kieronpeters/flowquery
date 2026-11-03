/**
 * Reset the local D1 database: delete local state, apply migrations, seed.
 *
 * Local only. Touches `.wrangler/state`, never a remote database. Safe to run
 * repeatedly.
 */
import { spawnSync } from 'node:child_process'
import { rm } from 'node:fs/promises'

const step = (command) => {
  process.stdout.write(`\n> ${command}\n`)
  const result = spawnSync(command, { shell: true, stdio: 'inherit' })
  if (result.status !== 0) {
    process.stderr.write(`\nCommand failed: ${command}\n`)
    process.exit(result.status ?? 1)
  }
}

await rm('.wrangler/state', { recursive: true, force: true })
step('npx wrangler d1 migrations apply flowquery-db --local')
step('npx wrangler d1 execute flowquery-db --local --file=./seeds/dev.sql')

process.stdout.write('\nLocal database reset, migrated and seeded.\n')
