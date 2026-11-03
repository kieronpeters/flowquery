# FlowQuery Backlog

Ordered by priority. M5 onward requires owner approval per milestone.

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
- [x] GitHub OAuth with PKCE; allowlist on immutable numeric id
- [x] Opaque sessions, `__Host-` cookie, sign-out invalidation, CSRF guard, rate limiting
- [x] Board reads require a session
- [x] Tests for AUTH-001…011; auth CPU measured
- [ ] **Live GitHub round trip** — needs owner credentials (see NEXT_ACTION)

### M4 — Boards and dashboard
- [x] `GET/POST/PATCH/DELETE /api/v1/boards`
- [x] Permanent delete with typed-name confirmation; `409` on mismatch
- [x] Cascade to tasks, comments, activity and tokens — verified against the real schema
- [x] Dashboard replacing the placeholder: list, create, rename, delete
- [x] Landing page redirects signed-in humans to `/boards`
- [x] Double-submit guard on the create form
- [x] Real-schema test harness (`node:sqlite`) for cascades and constraints
- [x] Tests for BOARD-001…007; browser verification of all three flows

## Awaiting approval

### M5 — Kanban and tasks
Recommended split into two reviewable halves:

**M5a — task CRUD and detail**
- [ ] Task create, edit, delete; title, description, priority, assignee, due date
- [ ] Task detail panel with full description
- [ ] Validation limits (`TASK-002`, `TASK-003`, `TASK-013`)
- [ ] Tests for TASK-001…006, TASK-010, TASK-011

**M5b — ordering and movement**
- [ ] Move between the five fixed columns; reorder within a column
- [ ] Atomic position renumbering in one `batch()`
- [ ] Drag-and-drop with dnd-kit plus an explicit keyboard move control
- [ ] Optimistic updates with `409` reconciliation and `expectedVersion`
- [ ] Tests for TASK-007, TASK-008, TASK-009, TASK-012

## Not yet authorised

### M6 — Comments and activity
### M7 — Agent API and tokens (isolation tests, OpenAPI)
### M8 — Hardening, final restore drill, performance pass
### M9 — Deployment (separate approval; `workers.dev`; replace placeholder database id)

## Technical debt

- [ ] Remove the seeded placeholder user once real OAuth users exist
- [ ] Show the signed-in user's name in the app header (currently only on `/boards`)
- [ ] Trim `design/DESIGN_DIRECTION.md` to the MVP shell
- [ ] Reconcile or mark historical `repository/SETUP_QUESTIONS.md`
- [ ] Delete the neutralised `memory/` mirror
- [ ] Replace the placeholder D1 `database_id` at deployment
- [ ] Consider `node:sqlite` for the remaining route-level fakes where SQL behaviour matters
