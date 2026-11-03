/**
 * Deployment preflight.
 *
 * Refuses to deploy while anything in the list below is wrong. The most
 * important check is the first: wrangler.jsonc currently carries a placeholder
 * D1 id for local development. Deploying with it would bind the production
 * Worker to a database that does not exist, and the failure would appear as
 * broken pages rather than an obvious error.
 *
 * Run automatically by `npm run deploy`, or on its own with `npm run preflight`.
 */
import { existsSync, readFileSync } from 'node:fs'

const PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000'
const problems = []

function check(condition, message) {
  if (!condition) problems.push(message)
}

// 1. A real database id.
const config = readFileSync('wrangler.jsonc', 'utf8')
check(
  !config.includes(PLACEHOLDER_ID),
  'wrangler.jsonc still has the placeholder D1 id. Run `npx wrangler d1 create flowquery-db` and paste the real id in.',
)

// 2. The static headers file must be structurally valid.
const headersPath = 'public/_headers'
check(
  existsSync(headersPath),
  `${headersPath} is missing: the SPA document would ship with no CSP.`,
)

if (existsSync(headersPath)) {
  const headers = readFileSync(headersPath, 'utf8')
  const meaningful = headers
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.trim().startsWith('#'))

  check(
    meaningful[0]?.trim() === '/*',
    `${headersPath} must start with a URL rule (/*), not a header line.`,
  )
  check(
    !headers.includes('*/'),
    `${headersPath} contains '*/'. In this format '/*' is a URL pattern and '#' is the comment character.`,
  )
}

// 3. Build output must exist and include the headers file.
check(existsSync('dist/client/index.html'), 'dist/client is missing. Run `npm run build` first.')
check(
  existsSync('dist/client/_headers'),
  'dist/client/_headers is missing: the build did not copy public/_headers.',
)

// 4. Secrets must stay out of the repository.
const gitignore = readFileSync('.gitignore', 'utf8')
check(
  /^\.dev\.vars$/m.test(gitignore),
  '.dev.vars is not git-ignored. Stop and fix that before deploying anything.',
)

// 5. The seed must never reach production by accident.
check(
  !/db:seed/.test(readFileSync('package.json', 'utf8')) ||
    !/deploy.*seed/.test(readFileSync('package.json', 'utf8')),
  'The deploy script appears to run the seed. The seed inserts a placeholder user and a demo board.',
)

if (problems.length > 0) {
  process.stderr.write('\nDeployment preflight failed:\n\n')
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`)
  process.stderr.write('\nNothing was deployed.\n')
  process.exit(1)
}

process.stdout.write('\nDeployment preflight passed.\n')
process.stdout.write('  - D1 id is not the placeholder\n')
process.stdout.write('  - public/_headers is structurally valid and built\n')
process.stdout.write('  - .dev.vars is git-ignored\n')
process.stdout.write('  - the deploy script does not seed\n\n')
