# FlowQuery Backlog

Ordered by priority. M4 onward requires owner approval per milestone.

## Complete

### M0 — Specification
- [x] Audit; consolidate to the flat board model; single decisions register
- [x] Owner approved AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030

### M1 — Repository foundation
- [x] Git, toolchain, structure, OpenCode agents, smoke test, clean-clone verification

### M2 — Walking skeleton
- [x] D1 schema (`0001_init.sql`), seed data, `db:*` scripts
- [x] Repository → service → route layering; `GET /columns`, `GET /boards/:id`
- [x] Read-only board UI; CPU measurement; export → restore drill

### M3 — Human authentication
- [x] GitHub OAuth with PKCE (`/auth/start`, `/auth/callback`, `/auth/me`, `/auth/logout`)
- [x] Allowlist keyed on immutable GitHub numeric id; refreshed display data
- [x] Opaque sessions: SHA-256 at rest, `__Host-` cookie, 30-day sliding expiry
- [x] Sign-out deletes the server-side session
- [x] Origin check on state-changing requests
- [x] Rate limiting (`0002_auth_attempts.sql`)
- [x] Board reads require a session
- [x] 33 tests covering AUTH-001…011
- [x] CPU measurement of the auth path
- [x] Login and access pages; 401 redirects to `/login`
- [ ] **Live GitHub round trip** — needs owner credentials (see NEXT_ACTION)

## Awaiting approval

### M4 — Boards and dashboard
- [ ] `GET /api/v1/boards` (list, newest first)
- [ ] `POST /api/v1/boards`
- [ ] `PATCH /api/v1/boards/:id` (rename, id unchanged)
- [ ] `DELETE /api/v1/boards/:id` with typed-name confirmation
- [ ] Cascade delete of tasks, comments, activity and tokens in one transaction
- [ ] Dashboard replacing the `/boards` placeholder: list, create, rename, delete
- [ ] Landing page behaviour for signed-in humans
- [ ] Tests for BOARD-001…007 including cascade completeness

## Not yet authorised

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

- [ ] Remove the seeded placeholder user once real OAuth users exist
- [ ] Trim `design/DESIGN_DIRECTION.md` to the MVP shell
- [ ] Reconcile or mark historical `repository/SETUP_QUESTIONS.md`
- [ ] Delete the neutralised `memory/` mirror
- [ ] Replace the placeholder D1 `database_id` at deployment
- [ ] Consider Vitest workers-pool tests for real SQL coverage in M5
- [ ] Signed-in user's name in the app header (currently only on `/boards`)
