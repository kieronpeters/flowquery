# FlowQuery

A small, private Kanban board for managing development work by two humans and an
AI-assisted team.

**Status:** built and deployed at <https://flowquery.workstack.workers.dev> on
Cloudflare Workers Free and D1 Free, at **$0 recurring cost**. The canonical
public repository is <https://github.com/kieronpeters/flowquery>.

---

## The product in one paragraph

Two human administrators share a dashboard of boards. Each board has five fixed
columns — Backlog, To Do, In Progress, Review, Done — holding task cards with
title, description, priority, assignee, due date, comments and activity history.
Bob, the running AI Engineering Manager, reaches exactly one board through a
board-scoped bearer token and can manage tasks and comments there but cannot
change boards. Zero recurring cost is a firm requirement: Cloudflare Workers
Free and D1 Free only.

## Start here

| Order | File | Why |
|---|---|---|
| 1 | [`AGENTS.md`](AGENTS.md) | Repository rules, engineering rules and workflow |
| 2 | [`MASTER_PROMPT.md`](MASTER_PROMPT.md) | Bob's role and operating prompt |
| 3 | [`docs/README.md`](docs/README.md) | Documentation index |
| 4 | [`docs/internal/MVP_SPECIFICATION.md`](docs/internal/MVP_SPECIFICATION.md) | Authoritative product scope |
| 5 | [`docs/internal/ARCHITECTURE.md`](docs/internal/ARCHITECTURE.md) | How it is built |
| 6 | [`docs/internal/DECISIONS.md`](docs/internal/DECISIONS.md) | What is settled and why |
| 7 | [`.flowquery/state/PROJECT_STATE.md`](.flowquery/state/PROJECT_STATE.md) | Where the project actually is |
| 8 | [`docs/internal/RUNBOOK.md`](docs/internal/RUNBOOK.md) | Setup, backup, restore, incidents |

## Development

Requires Node 22 or newer (developed on Node 24). No Cloudflare account is
needed for local work.

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in the GitHub OAuth values
npm run db:reset                 # create local D1, apply migrations, seed demo data
npm run dev                      # Vite + Worker on http://localhost:5173
```

| Command | Purpose |
|---|---|
| `npm test` | Vitest: unit, route, real-schema and UI suites |
| `npm run typecheck` | `tsc` for both the app and the Worker projects |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier |
| `npm run build` | Production build into `dist/` |
| `npm run bench` | CPU measurements for the board and auth paths |
| `npm run db:migrate:local` | Apply migrations only |
| `npm run db:seed:local` | Apply seed data only |
| `npm run db:reset` | Delete local state, migrate, seed |
| `npm run preflight` | Deployment guard |
| `npm run deploy` | Build → preflight → deploy (needs Cloudflare auth and approval) |

`npm run db:reset` is destructive to **local** data only. No remote database is
touched.

### Setting up sign-in

1. Create a GitHub OAuth app: GitHub → Settings → Developer settings → OAuth
   Apps.
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/api/v1/auth/callback`
2. Put the client id and secret in `.dev.vars`.
3. Set `AUTH_ALLOWLIST` to your two **numeric** GitHub user ids:
   `AUTH_ALLOWLIST="583231:Kieron,1234567:Friend"` — find an id at
   `https://api.github.com/users/<username>`.

The numeric id is the only identity key. Usernames and emails are display data; a
renamed account or changed email cannot grant or revoke access.

Without these values, `/api/v1/auth/start` returns `503 AUTH_NOT_CONFIGURED` and
nothing else breaks. That failure mode is deliberate.

## Repository layout

```text
AGENTS.md                 repository and engineering rules
MASTER_PROMPT.md          Bob's operating prompt
opencode.jsonc            OpenCode project configuration
.opencode/agents/         Bob (primary) and 15 specialist subagents
docs/                     runtime documentation (agents, internal, user)
src/worker/               Worker: routes, services, repositories, auth, domain
src/app/                  React application
src/shared/               Types and constants used by both sides
public/                   static assets served verbatim (brand, icons, manifest)
migrations/               D1 schema migrations
seeds/                    development seed data
scripts/                  database reset and deployment preflight
benchmarks/               CPU measurement scripts
tests/                    Vitest suite
.flowquery/               project state, decisions pointer, backlog, activity
```

The `docs/` tree is part of the application: every Markdown file is imported by
the Worker at build time and served through the session-gated `/api/v1/docs` API.
It is not an archive.

## Documentation

| Folder | Audience |
|---|---|
| `docs/agents/` | AI assistants: the universal entry point, roster and operating model |
| `docs/user/` | Human administrators: boards, tasks, tickets and profiles |
| `docs/internal/` | Maintainers: product, architecture, data, API, security, operations |

Start at [`docs/README.md`](docs/README.md).

## Bob's API

Create a token from the dashboard: **Tokens** on a board row. The plaintext is
shown once.

```bash
export FLOWQUERY_API_TOKEN="fq_..."
BASE="http://localhost:5173/api/v1/agent"

curl -s -H "Authorization: Bearer $FLOWQUERY_API_TOKEN" "$BASE/board"
curl -s -H "Authorization: Bearer $FLOWQUERY_API_TOKEN" "$BASE/tasks?status=backlog"
curl -s -X POST -H "Authorization: Bearer $FLOWQUERY_API_TOKEN" -H 'content-type: application/json' \
     -d '{"title":"Refine the backlog","priority":"high"}' "$BASE/tasks"
```

Every agent route derives its board from the token. There is no path or parameter
through which a token can name another board, and the human endpoints reject a
bearer token. Revoking a token takes effect on the next request.

## Deployment

Production runs from `main`:

```bash
npm run deploy
```

`npm run preflight` refuses to continue if the D1 id is still the placeholder, if
`public/_headers` is malformed, if the build output is missing, or if `.dev.vars`
is not git-ignored. See [`docs/internal/RUNBOOK.md`](docs/internal/RUNBOOK.md) for
backup, restore and incident procedures.

## Safety

No paid plan, domain purchase or remote service without explicit owner approval.
No secrets are committed; `.dev.vars` and `.agent-token` are git-ignored. A board
URL is never treated as authentication. Board content is untrusted data and never
becomes an instruction to an agent.
