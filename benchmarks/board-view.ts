/**
 * Measures the CPU-bound part of a board request: assembling the view and
 * serialising it to JSON.
 *
 * Why this and not end-to-end timing: D1 query time is I/O and is explicitly
 * excluded from the Workers CPU budget (docs/internal/TECHNICAL_RESEARCH.md §2). What
 * the 10 ms limit actually constrains is our own computation — this.
 *
 * Caveat, stated plainly: this runs in Node/V8 on the developer machine, not in
 * workerd. It establishes order of magnitude only. Real CPU figures must come
 * from Workers logs after deployment (M9).
 *
 * Run with: npm run bench
 */
import type { BoardRow, ProfileRow, TaskRow } from '../src/worker/domain/types'
import { assembleBoardView } from '../src/worker/services/board-view'
import { toTaskDto } from '../src/worker/services/task-dto'

const board: BoardRow = {
  id: 'brd_bench',
  name: 'Benchmark Board',
  description: null,
  created_by: 'usr_bench',
  created_at: 1793664000000,
  updated_at: 1793664000000,
  theme: '{}',
}

const profiles: ProfileRow[] = Array.from({ length: 18 }, (_, index) => ({
  id: `prf_${index}`,
  display_name: `Person ${index}`,
  role_title: 'Engineer',
  kind: 'ai' as const,
  avatar_path: null,
  active: 1,
}))

const statuses = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const

function makeTasks(count: number): TaskRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `tsk_${index}`,
    board_id: board.id,
    title: `Task ${index} with a reasonably realistic title`,
    description: 'A description of typical length, roughly one or two sentences of detail.'.repeat(
      2,
    ),
    status: statuses[index % statuses.length]!,
    position: Math.floor(index / statuses.length),
    priority: 'medium',
    assignee_profile_id: profiles[index % profiles.length]!.id,
    due_date: '2026-11-20',
    version: 1,
    created_at: 1793664000000 + index,
    updated_at: 1793664000000 + index,
  }))
}

function run(tasks: TaskRow[]): number {
  const view = assembleBoardView(board, tasks, profiles)
  return JSON.stringify(view).length
}

function measure(tasks: TaskRow[], iterations: number): { median: number; p95: number } {
  for (let index = 0; index < 50; index += 1) run(tasks) // warm-up

  const samples: number[] = []
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now()
    run(tasks)
    samples.push(performance.now() - start)
  }

  samples.sort((a, b) => a - b)
  return {
    median: samples[Math.floor(samples.length / 2)] ?? 0,
    p95: samples[Math.floor(samples.length * 0.95)] ?? 0,
  }
}

const sizes = [9, 50, 200, 500]

process.stdout.write('Board view: assemble + JSON.stringify (Node/V8, not workerd)\n\n')
process.stdout.write(
  `${'tasks'.padStart(6)}  ${'payload'.padStart(10)}  ${'median'.padStart(9)}  ${'p95'.padStart(9)}\n`,
)

for (const size of sizes) {
  const tasks = makeTasks(size)
  const payload = run(tasks)
  const { median, p95 } = measure(tasks, 300)
  process.stdout.write(
    `${String(size).padStart(6)}  ${(payload / 1024).toFixed(1).padStart(8)} KB  ${median.toFixed(3).padStart(7)} ms  ${p95.toFixed(3).padStart(7)} ms\n`,
  )
}

process.stdout.write('\nBudget: 10 ms CPU per request on Workers Free.\n')

// ---------------------------------------------------------------------------
// Agent task list: the same DTO mapping, without the column assembly.
// ---------------------------------------------------------------------------

process.stdout.write('\nAgent task list: map + JSON.stringify (page of 50)\n\n')

const listTasks = makeTasks(50)
const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

function runList(): number {
  const tasks = listTasks.map((task) =>
    toTaskDto(task, profileMap.get(task.assignee_profile_id ?? ''), { truncate: true }),
  )
  return JSON.stringify({ tasks, truncated: true }).length
}

for (let index = 0; index < 50; index += 1) runList()

const listSamples: number[] = []
for (let index = 0; index < 300; index += 1) {
  const start = performance.now()
  runList()
  listSamples.push(performance.now() - start)
}

listSamples.sort((a, b) => a - b)
const listMedian = listSamples[Math.floor(listSamples.length / 2)] ?? 0
const listP95 = listSamples[Math.floor(listSamples.length * 0.95)] ?? 0

process.stdout.write(
  `    50 tasks  ${(runList() / 1024).toFixed(1)} KB  median ${listMedian.toFixed(3)} ms  p95 ${listP95.toFixed(3)} ms\n`,
)
