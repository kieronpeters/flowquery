/**
 * Measures the CPU-bound parts of the authentication path.
 *
 * The callback's expensive parts are network I/O (GitHub token exchange, two
 * profile fetches) which is excluded from the Workers CPU budget. What counts
 * against the 10 ms limit is the allowlist parse, the session token hash and
 * the JSON we emit. That is what this measures.
 *
 * Run with: npm run bench
 */
import { parseAllowlist } from '../src/worker/auth/allowlist'
import { randomToken, sha256Hex } from '../src/worker/lib/ids'

const allowlistRaw = '583231:Kieron,1234567:Friend'

function measure(label: string, run: () => void | Promise<void>, iterations = 300) {
  return { label, run, iterations }
}

async function time(entry: ReturnType<typeof measure>): Promise<{ median: number; p95: number }> {
  for (let index = 0; index < 50; index += 1) await entry.run()

  const samples: number[] = []
  for (let index = 0; index < entry.iterations; index += 1) {
    const start = performance.now()
    await entry.run()
    samples.push(performance.now() - start)
  }

  samples.sort((a, b) => a - b)
  return {
    median: samples[Math.floor(samples.length / 2)] ?? 0,
    p95: samples[Math.floor(samples.length * 0.95)] ?? 0,
  }
}

const token = randomToken(32)

const entries = [
  measure('allowlist parse (2 entries)', () => {
    parseAllowlist(allowlistRaw)
  }),
  measure('session token hash (SHA-256)', async () => {
    await sha256Hex(token)
  }),
  measure('sign-in response JSON', () => {
    JSON.stringify({
      user: { id: 'usr_01JB8Q', displayName: 'Kieron', email: 'kieron@example.com' },
    })
  }),
]

process.stdout.write('Authentication path: CPU-bound work (Node/V8, not workerd)\n\n')
process.stdout.write(`${'operation'.padEnd(34)}  ${'median'.padStart(9)}  ${'p95'.padStart(9)}\n`)

for (const entry of entries) {
  const { median, p95 } = await time(entry)
  process.stdout.write(
    `${entry.label.padEnd(34)}  ${median.toFixed(4).padStart(7)} ms  ${p95.toFixed(4).padStart(7)} ms\n`,
  )
}

process.stdout.write('\nBudget: 10 ms CPU per request on Workers Free.\n')
