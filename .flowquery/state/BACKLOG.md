# FlowQuery Backlog

Ordered by priority. M3 onward requires owner approval per milestone.

## Complete

### M0 — Specification
- [x] Audit the package; catalogue contradictions
- [x] Consolidate the product specification to the flat board model
- [x] Requirements, architecture, database, API, security and research documents
- [x] Single decisions register
- [x] Owner approved AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030

### M1 — Repository foundation
- [x] Local Git on `main`; no remote
- [x] Toolchain: TypeScript 6, Vite 8, React 19, Hono 4, Vitest 5, Wrangler 4, ESLint, Prettier
- [x] `wrangler.jsonc` with SPA fallback and `run_worker_first: ["/api/*"]`
- [x] OpenCode agents at `.opencode/agents/`, verified discoverable
- [x] 2 tests; README verified from a clean clone

### M2 — Walking skeleton
- [x] D1 binding (local only, placeholder id)
- [x] `migrations/0001_init.sql` — 9 tables, 9 indexes, foreign keys enforced
- [x] `seeds/dev.sql` — 18 profiles, 1 board, 9 tasks, 1 placeholder user
- [x] `db:migrate:local`, `db:seed:local`, `db:reset` scripts
- [x] `GET /api/v1/columns`
- [x] `GET /api/v1/boards/:boardId` with repository → service → route layering
- [x] Read-only board UI replacing the M1 placeholder
- [x] CPU measurement of the board read path (`npm run bench`)
- [x] Export → total loss → restore drill verified

## Awaiting approval

### M3 — Human authentication
- [ ] `AuthProvider` seam with GitHub OAuth implementation
- [ ] `/auth/start`, `/auth/callback`, `/auth/logout`, `/auth/me`
- [ ] `AUTH_ALLOWLIST` keyed on immutable GitHub numeric IDs
- [ ] Sessions: SHA-256 at rest, `__Host-` cookie, expiry, sign-out invalidation
- [ ] Origin check on mutating requests; rate limiting
- [ ] `/login` and `/signup` pages
- [ ] Authenticate the board read endpoint; remove the temporary open access
- [ ] Tests for AUTH-001…011
- [ ] Measured CPU cost of the callback
- [ ] **Owner prerequisite:** create the GitHub OAuth app and supply the two numeric user IDs

## Not yet authorised

### M4 — Boards
- [ ] Board CRUD with typed-name delete confirmation and cascade
- [ ] Dashboard at `/boards` replacing the temporary landing page
- [ ] Landing page and redirects

### M5 — Kanban and tasks
- [ ] Task CRUD, priority, assignee, due date
- [ ] Drag-and-drop plus explicit keyboard move
- [ ] Optimistic updates with 409 reconciliation
- [ ] Task detail with full description

### M6 — Comments and activity
### M7 — Agent API and tokens (isolation tests, OpenAPI)
### M8 — Hardening, final restore drill, performance pass
### M9 — Deployment (separate approval; `workers.dev`; replace placeholder database id)

## Technical debt

- [ ] Trim `design/DESIGN_DIRECTION.md` to the MVP shell
- [ ] Reconcile or mark historical `repository/SETUP_QUESTIONS.md`
- [ ] Delete the neutralised `memory/` mirror
- [ ] Replace the placeholder D1 `database_id` at deployment
- [ ] Remove the seeded placeholder user when real OAuth users exist
- [ ] Consider Vitest workers-pool integration tests once authentication adds real request context
