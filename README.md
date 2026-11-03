# FlowQuery

A small, private Kanban board for managing development work by two humans and an AI-assisted team.

**Status:** M1 complete — repository foundation and project configuration. **No product features exist yet.** Board and task implementation begins only after the owner approves M2.

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

Open decisions: none. The next gate is the owner's review of M1.

## Development

Requires Node 22 or newer (developed on Node 24). No Cloudflare account is needed for any command below.

```bash
npm install        # install dependencies
npm run dev        # Vite + Worker on http://localhost:5173
npm test           # Vitest
npm run typecheck  # tsc, app and worker projects
npm run lint       # ESLint
npm run build      # production build into dist/
```

Verified behaviour at `npm run dev` (recorded from actual runs on Windows):

| Request | Result |
|---|---|
| `GET /` | `200 text/html` — SPA shell |
| `GET /boards/brd_example` | `200 text/html` — deep link served by the SPA fallback |
| `GET /api/v1/health` | `200 application/json` |
| `GET /api/v1/does-not-exist` | `404 application/json` |

A fresh clone was verified end to end: `npm ci`, `typecheck`, `lint`, `test` and `build` all completed successfully with zero failures.

> **Note on npm output:** npm 11 may warn that the `workerd` and `esbuild` install scripts "are not yet covered by allowScripts". This is expected on this machine and does not affect the build, test or lint commands above. No action is required.

`run_worker_first` is scoped to `/api/*`, so page navigation never invokes the Worker and therefore never consumes the free request quota. See `docs/ARCHITECTURE.md` §2.

## Repository layout

```text
AGENTS.md                 repository rules
MASTER_PROMPT.md          Bob's operating prompt
opencode.jsonc            OpenCode project configuration
.opencode/agents/         Bob (primary) and 15 specialist subagents
docs/                     authoritative specification, design and research
src/worker/               Worker application (Hono)
src/app/                  React application (placeholder at M1)
tests/                    Vitest tests
migrations/               D1 migrations — empty until M2
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

`npm audit` reports 11 moderate findings, all in the ESLint/minimatch developer chain; `npm audit --omit=dev` reports **0 vulnerabilities**. Nothing vulnerable ships in the Worker bundle.

## Safety

No deployment, cloud resource, paid plan, domain purchase, remote repository or destructive operation without explicit owner approval. Never commit secrets. Never treat a board URL as authentication.
