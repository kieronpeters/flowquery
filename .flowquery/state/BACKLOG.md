# FlowQuery Backlog

Ordered by priority. Nothing below M0 may start without owner approval.

## Blocking — owner input required

- [ ] Owner reviews `docs/MVP_SPECIFICATION.md` and `docs/REQUIREMENTS.md`
- [ ] Owner resolves **AUTH-01** (authentication mechanism)
- [ ] Owner resolves **AUTH-02** (GitHub account requirement acceptable?)
- [ ] Owner resolves **SCOPE-01** (in-app notifications: keep or drop)
- [ ] Owner authorises M1
- [ ] Owner confirms local repository path `C:\Users\Asus\source\repos\FlowQuery`

## M1 — Repository foundation

- [ ] Initialise local Git repository on `main`
- [ ] `.gitignore` covering `node_modules/`, `dist/`, `.wrangler/`, `.dev.vars`, `.env*` — before the first commit, not after
- [ ] First commit: documentation only; verify no secrets
- [ ] Project structure: `src/worker/{routes,services,repositories,db}`, `src/app`, `migrations/`, `tests/`
- [ ] Toolchain and scripts: `dev`, `build`, `test`, `typecheck`, `lint`, `db:migrate:local`
- [ ] Activate OpenCode agents: move `opencode/agents/` → `.opencode/agents/`, add valid `opencode.jsonc` (V2: `subagent_depth` belongs under `experimental`)
- [ ] Verify the documented setup from a clean directory on Windows

## M2 — Walking skeleton

- [ ] `migrations/0001_init.sql` for the full designed schema
- [ ] Seed: 16 team profiles, one demo board
- [ ] `GET /api/v1/health`, `GET /api/v1/columns`
- [ ] Static asset routing proof: SPA fallback, `run_worker_first: ["/api/*"]`
- [ ] Three tests passing against local D1
- [ ] Recorded CPU measurement per endpoint

## M3 — Human authentication (the real gate)

- [ ] Implement the chosen AUTH-01 mechanism behind the `AuthProvider` seam
- [ ] Allowlist enforcement server-side
- [ ] Sessions: hashed, `__Host-` cookie, expiry, sign-out invalidation
- [ ] Origin check on mutating requests
- [ ] Measured CPU cost of sign-in against the 10 ms budget
- [ ] Tests for AUTH-001…010

## M4 — Boards

- [ ] Board CRUD with typed-name delete confirmation and cascade
- [ ] Dashboard, create dialog, rename, delete flow
- [ ] Landing page and redirects

## M5 — Kanban and tasks

- [ ] Five-column board view with task counts
- [ ] Task CRUD, priority, assignee, due date
- [ ] Drag-and-drop plus explicit keyboard move path
- [ ] Optimistic updates with 409 reconciliation
- [ ] Task detail with full description

## M6 — Comments and activity

- [ ] Comment add/list with attribution
- [ ] Activity recording for every task event
- [ ] Board and task activity feeds, paginated

## M7 — Agent API and tokens

- [ ] Token create/list/revoke, show-once plaintext
- [ ] `/api/v1/agent/*` namespace, board derived from token
- [ ] OpenAPI 3.1 document served by the app
- [ ] Isolation tests: cross-board, revoked, malformed, namespace boundary
- [ ] Bob usage guide and `FLOWQUERY_API_TOKEN` convention

## M8 — Hardening and release preparation

- [ ] Security headers, error handling, request IDs
- [ ] Rate limiting
- [ ] Export/restore drill actually performed
- [ ] Performance pass with measurements
- [ ] Runbook, backup procedure, known limitations

## M9 — Deployment

- [ ] Explicit owner approval
- [ ] D1 database and Worker on the Free plan
- [ ] Migrations applied; profiles seeded only
- [ ] Secrets via `wrangler secret put`
- [ ] Verify a stranger cannot register
- [ ] Smoke test and usage dashboard check

## Deferred — needs a decision before it enters the roadmap

Notifications (SCOPE-01), per-user preferences, email or push, board sharing or public view links, custom columns, archive/restore, labels, attachments, checklists, sub-tasks, richer search, realtime updates, MCP, webhooks, mobile app, theming, i18n.

## Technical debt and clean-up

- [ ] Remove the stale `memory/` mirror once Git protects the history
- [ ] Update `design/DESIGN_DIRECTION.md` to clearly separate visual language from MVP scope
- [ ] Reconcile `repository/SETUP_QUESTIONS.md` with the current repository plan
