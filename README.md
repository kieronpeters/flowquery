# FlowQuery

A small, private Kanban board for managing development work by two humans and an AI-assisted team.

**Status:** M2 complete — walking skeleton. Boards and tasks are read from a real database and rendered; nothing can be edited yet. **No authentication exists**, so this must not be deployed.

---

## The product in one paragraph

Two human administrators share a dashboard listing every board. Each board has five fixed columns — Backlog, To Do, In Progress, Review, Done — holding task cards with title, description, priority, assignee, due date, comments and activity history. Bob, the OpenCode session, reaches exactly one board through a scoped API token and can manage tasks there but cannot change boards. Zero recurring cost: Cloudflare Workers Free and D1 Free only.

## Start here

| Order | File | Why |
|---|---|---|
| 1 | [`MASTER_PROMPT.md`](MASTER_PROMPT.md) | Bob's role and operating rules |
| 2 | [`AGENTS.md`](AGENTS.md) | Repository rules and the current gate |
| 3 | [`docs/MVP_SPECIFICATION.md`](docs/MVP_SPECIFICATION.md) | Authoritative product scope |
| 4 | [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Testable requirements |
| 5 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical design |
| 6 | [`docs/DECISIONS.md`](docs/DECISIONS.md) | What is settled and why |
| 7 | [`.flowquery/state/PROJECT_STATE.md`](.flowquery/state/PROJECT_STATE.md) | Where the project actually is |

## What is settled

- Flat structure: **boards only** — no organisations, projects or workspaces.
- Five fixed columns; no column configuration.
- Permanent board deletion with typed confirmation.
- Two humans with identical full access; registration restricted.
- Authentication: **GitHub OAuth with a server-side allowlist**, keyed on the immutable GitHub numeric user ID.
- Bob is the current OpenCode session, using a board-scoped bearer token.
- Specialist agents are assignee profiles with no accounts and no credentials.
- Zero recurring cost, `*.workers.dev` address, no domain.
- No in-app notifications in the MVP.

Open decisions: none. The next gate is the owner's review of M2.

## Development

Requires Node 22 or newer (developed on Node 24). No Cloudflare account is needed for any command below.

```bash
npm install
npm run db:reset   # create local D1, apply migrations, seed demo data
npm run dev        # Vite + Worker on http://localhost:5173
```

| Command | Purpose |
|---|---|
| `npm test` | Vitest — 11 tests |
| `npm run typecheck` | `tsc` for both the app and the Worker projects |
| `npm run lint` | ESLint |
| `npm run build` | Production build into `dist/` |
| `npm run bench` | Measures the CPU-bound part of a board request |
| `npm run db:migrate:local` | Apply migrations only |
| `npm run db:seed:local` | Apply seed data only |
| `npm run db:reset` | Delete local state, migrate, seed |

`npm run db:reset` is destructive to **local** data only. It never touches a remote database, and no remote database exists.

## What works today

| Request | Result |
|---|---|
| `GET /` | `200 text/html` — landing page linking to the demo board |
| `GET /boards/:boardId` | `200 text/html` — deep link served by the SPA fallback |
| `GET /api/v1/health` | `200 application/json` |
| `GET /api/v1/columns` | `200 application/json` — the five fixed columns |
| `GET /api/v1/boards/brd_demo` | `200 application/json` — board, columns and 9 seeded tasks |
| `GET /api/v1/boards/unknown` | `404 application/json` |
| `GET /api/v1/anything-else` | `404 application/json` — never the SPA shell |

`run_worker_first` is scoped to `/api/*`, so page navigation never invokes the Worker and therefore never consumes the free request quota (`docs/ARCHITECTURE.md` §2).

### Security caveat, stated plainly

`GET /api/v1/boards/:boardId` is **unauthenticated** at this milestone. Human authentication is M3. Nothing is deployed and nothing can be deployed before M3, so no data is exposed — but do not add mutation routes or deploy this build.

## Data

Local D1 lives in `.wrangler/state` (git-ignored). The seed creates:

- 1 development user (placeholder, `.invalid` email — replaced by real OAuth users in M3)
- 18 assignee profiles: 2 human administrators, 15 AI team members, 1 contractor
- 1 demo board with 9 tasks spread across the five columns

`npm run db:reset` recreates all of it from `migrations/0001_init.sql` and `seeds/dev.sql`.

**Backup and restore** were exercised as part of M2: export with `wrangler d1 export`, delete local state, import the dump, and the data returns identically with foreign keys intact. See `docs/SECURITY_AND_AUTH.md` §11.

## Measured performance

Board view assembly plus JSON serialisation, the only CPU-bound part of a board request (D1 query time is I/O and is excluded from the Workers CPU limit):

| Tasks | Payload | Median | p95 |
|---|---|---|---|
| 9 (demo board) | 4.8 KB | 0.032 ms | 0.057 ms |
| 50 | 24.8 KB | 0.145 ms | 0.285 ms |
| 200 | 98.0 KB | 0.546 ms | 0.838 ms |
| 500 | 244.5 KB | 1.443 ms | 2.666 ms |

Against a 10 ms per-request CPU budget, even 500 tasks uses roughly 15% of it. Measured in Node/V8 on this machine, not in workerd — real CPU is confirmed from Workers logs after deployment (`docs/TECHNICAL_RESEARCH.md` §8).

## Repository layout

```text
AGENTS.md                 repository rules
MASTER_PROMPT.md          Bob's operating prompt
opencode.jsonc            OpenCode project configuration
.opencode/agents/         Bob (primary) and 15 specialist subagents
docs/                     authoritative specification, design and research
src/worker/               Worker: routes, services, repositories, domain
src/app/                  React application
src/shared/               Types and constants used by both sides of the API
tests/                    Vitest suite
benchmarks/               CPU measurement script
migrations/               D1 schema migrations
seeds/                    Development seed data
scripts/                  Tooling (database reset)
team/                     specialist roster, profiles, portraits
.flowquery/               project state, decisions, backlog, handoffs, activity log
design/                   visual direction and concept images
templates/                sprint, task and release templates
repository/               earlier GitHub research (historical)
memory/                   deprecated mirror — do not use; .flowquery/ is authoritative
```

## Verified toolchain

| Tool | Version |
|---|---|
| TypeScript | 6.0.3 |
| Vite | 8.3.5 |
| Vitest | 5.1.0 |
| Wrangler | 4.156.2 |
| React | 19 |
| Hono | 4 |

`npm audit` reports moderate findings in the ESLint/minimatch developer chain; `npm audit --omit=dev` reports **0 vulnerabilities**. Nothing vulnerable ships in the Worker bundle.

> **Note on npm output:** npm 11 may warn that the `workerd` and `esbuild` install scripts "are not yet covered by allowScripts". This is expected on this machine and does not affect build, test or lint.

## Safety

No deployment, cloud resource, paid plan, domain purchase, remote repository or destructive operation without explicit owner approval. Never commit secrets. Never treat a board URL as authentication.
