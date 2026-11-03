# FlowQuery

A small, private Kanban board for managing development work by two humans and an AI-assisted team.

**Status:** M9 complete — **deployed** at https://flowquery.workstack.workers.dev on Cloudflare Workers Free and D1 Free, $0 recurring. 233 tests (server, real-schema and UI), a verified restore drill, security headers on both the API and the static document, and a written runbook. Sign-in verified end to end against the live database.

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
| 5 | [`docs/SECURITY_AND_AUTH.md`](docs/SECURITY_AND_AUTH.md) | Authentication design, including why there are no passwords |
| 6 | [`docs/DECISIONS.md`](docs/DECISIONS.md) | What is settled and why |
| 7 | [`.flowquery/state/PROJECT_STATE.md`](.flowquery/state/PROJECT_STATE.md) | Where the project actually is |
| 8 | [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Setup, backup, restore, incidents |
| 9 | [`docs/SECURITY_REVIEW.md`](docs/SECURITY_REVIEW.md) | What was checked, what was found, what is accepted |
| 10 | [`docs/DEPLOYMENT_PLAN.md`](docs/DEPLOYMENT_PLAN.md) | The M9 plan, and the record of how it actually went |

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

## Development

Requires Node 22 or newer (developed on Node 24). No Cloudflare account is needed.

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in the GitHub OAuth values
npm run db:reset                 # create local D1, apply migrations, seed demo data
npm run dev                      # Vite + Worker on http://localhost:5173
```

| Command | Purpose |
|---|---|
| `npm test` | Vitest: server, real-schema and UI component suites |
| `npm run typecheck` | `tsc` for both the app and the Worker projects |
| `npm run lint` | ESLint |
| `npm run build` | Production build into `dist/` |
| `npm run bench` | CPU measurements for the board and auth paths |
| `npm run db:migrate:local` | Apply migrations only |
| `npm run db:seed:local` | Apply seed data only |
| `npm run db:reset` | Delete local state, migrate, seed |

`npm run db:reset` is destructive to **local** data only. No remote database exists.

### Setting up sign-in

1. Create a GitHub OAuth app: GitHub → Settings → Developer settings → OAuth Apps.
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/api/v1/auth/callback`
2. Put the client id and secret in `.dev.vars`.
3. Set `AUTH_ALLOWLIST` to your two **numeric** GitHub user ids:
   `AUTH_ALLOWLIST="583231:Kieron,1234567:Friend"` — find an id at `https://api.github.com/users/<username>`.

The numeric id is the only identity key. Usernames and emails are display data; a renamed account or changed email cannot grant or revoke access.

Without these values, `/api/v1/auth/start` returns `503 AUTH_NOT_CONFIGURED` and nothing else breaks. That failure mode is deliberate.

## What works today

| Request | Result |
|---|---|
| `GET /` | `200 text/html` — landing page, redirects signed-in humans to `/boards` |
| `GET /login`, `/signup` | `200 text/html` — sign-in and access explanation |
| `GET /boards` | Dashboard: every board with task counts, create, rename, delete |
| `GET /boards/:boardId` | Board view, redirects to `/login` when signed out |
| `GET /api/v1/health` | `200 application/json` |
| `GET /api/v1/columns` | `200 application/json` — the five fixed columns |
| `GET /api/v1/boards` | `200` with `{ boards: [...] }`, `401` without a session |
| `POST /api/v1/boards` | `201` with the new board; `400` on an invalid name |
| `PATCH /api/v1/boards/:id` | `200` on rename; `404` if unknown |
| `DELETE /api/v1/boards/:id` | `204` with the exact name; `409` if it does not match |
| `GET /api/v1/boards/:id` | `200` with the board view, `401`/`404` otherwise |
| `GET /api/v1/boards/:id/tasks/:taskId` | `200` with the **full** description (board view truncates at 500 characters) |
| `POST /api/v1/boards/:id/tasks` | `201` with the task; `400` with field errors |
| `PATCH /api/v1/boards/:id/tasks/:taskId` | `200`; `409` if `expectedVersion` is stale |
| `POST /api/v1/boards/:id/tasks/:taskId/move` | `200` with the whole board view; `409` if stale, `400` on a bad index |
| `DELETE /api/v1/boards/:id/tasks/:taskId` | `204`; cascades to the task's comments |
| `GET /api/v1/boards/:id/tasks/:taskId/comments` | `200` with comments, oldest first |
| `POST /api/v1/boards/:id/tasks/:taskId/comments` | `201`; body stored and returned as literal text |
| `GET /api/v1/boards/:id/activity` | `200` with `{ events, nextBefore }`, newest first, keyset paginated |
| `GET/POST /api/v1/boards/:id/tokens` | List or create agent tokens; the plaintext is returned once |
| `DELETE /api/v1/boards/:id/tokens/:tokenId` | `204`, revocation effective immediately |
| `GET /api/v1/agent/board` | The token's own board — 401 without a valid `Bearer` token |
| `GET /api/v1/agent/tasks` | Filtered task list (`status`, `priority`, `assignee`, `q`, `limit`) |
| `POST/PATCH/DELETE /api/v1/agent/tasks…` | Task writes, scoped to the token's board |
| `GET /api/v1/openapi.json` | The contract as OpenAPI 3.1 |
| `GET /api/v1/profiles` | `200` with the 18 assignable profiles |
| `GET /api/v1/auth/start` | `302` to GitHub with PKCE, or `503` if unconfigured |
| `GET /api/v1/auth/me` | Identity or `401` |
| `POST /api/v1/auth/logout` | `204`, invalidates the session server-side |

`run_worker_first` is scoped to `/api/*`, so page navigation never invokes the Worker and never consumes the free request quota (`docs/ARCHITECTURE.md` §2).

### Not verified yet

The **real GitHub round trip**. The callback is covered by tests with a stubbed GitHub, and the start redirect was verified against a running dev server, but a live sign-in requires the owner's credentials. It must be performed before deployment.

The M4 dashboard was verified in a real browser end to end — create, rename, and the typed-name delete confirmation — but with a locally created session rather than a GitHub sign-in.

M5a was also verified in a browser: creating a task through the drawer, reopening it to confirm every field persisted, changing its column, and deleting it with the two-step confirmation.

**M5b drag-and-drop is not verified by automation.** The sortable wiring is present (dnd-kit attributes and its live region are in the DOM) and the board renders under its context without errors, but automated pointer and keyboard events could not complete a drop gesture in this harness. The *movement behaviour* is verified through the drawer's move buttons, which call the same code path, plus the ordering unit tests and the move API tests. A human click-drag is still worth doing.

M6 was verified in a browser: a comment containing `<script>` and `<b>` rendered as literal text with nothing executed, and the feed showed "created", "commented" and "moved" events newest-first.

## Bob's API

Create a token from the dashboard: **Tokens** on a board row. The plaintext is shown once.

```bash
export FLOWQUERY_API_TOKEN="fq_..."
BASE="http://localhost:5173/api/v1/agent"

curl -s -H "Authorization: Bearer $FLOWQUERY_API_TOKEN" "$BASE/board"
curl -s -H "Authorization: Bearer $FLOWQUERY_API_TOKEN" "$BASE/tasks?status=backlog"
curl -s -X POST -H "Authorization: Bearer $FLOWQUERY_API_TOKEN" -H 'content-type: application/json' \
     -d '{"title":"Refine the backlog","priority":"high"}' "$BASE/tasks"
```

Every agent route derives its board from the token. There is no path or parameter through which a
token can name another board, and the human endpoints reject a bearer token. Revoking a token takes
effect on the next request.

## Data

Local D1 lives in `.wrangler/state` (git-ignored). The seed creates 1 development user, 18 assignee profiles (2 human, 15 AI, 1 contractor) and a demo board with 9 tasks.

Migrations: `0001_init.sql` (schema) and `0002_auth_attempts.sql` (rate limiting).

**Backup and restore** were exercised at M2: export, delete all local state, import, data returns identically with foreign keys intact.

## Measured performance

Board view assembly plus JSON serialisation, the only CPU-bound part of a board request (D1 query time is I/O and excluded):

| Tasks | Payload | Median | p95 |
|---|---|---|---|
| 9 (demo board) | 4.8 KB | 0.032 ms | 0.058 ms |
| 200 | 98.0 KB | 0.553 ms | 0.903 ms |
| 500 | 244.5 KB | 1.457 ms | 2.674 ms |

Authentication path: allowlist parse 0.002 ms, session token SHA-256 0.035 ms, response JSON 0.001 ms.

Against a 10 ms per-request budget this is not close. Measured in Node/V8, not workerd; real CPU is confirmed from Workers logs after deployment.

## Repository layout

```text
AGENTS.md                 repository rules
MASTER_PROMPT.md          Bob's operating prompt
opencode.jsonc            OpenCode project configuration
.opencode/agents/         Bob (primary) and 15 specialist subagents
docs/                     authoritative specification, design, research and decisions
src/worker/               Worker: routes, services, repositories, auth, domain
src/app/                  React application
src/shared/               Types and constants used by both sides
tests/                    Vitest suite (33 tests)
benchmarks/               CPU measurement scripts
migrations/               D1 schema migrations
seeds/                    Development seed data
scripts/                  Tooling (database reset)
team/                     specialist roster, profiles, portraits
.flowquery/               project state, decisions, backlog, handoffs, activity log
design/                   visual direction and concept images
memory/                   deprecated mirror — do not use; .flowquery/ is authoritative
```

## Safety

No deployment, cloud resource, paid plan, domain purchase or remote repository without explicit owner approval. No secrets are committed; `.dev.vars` is git-ignored. A board URL is never treated as authentication.
