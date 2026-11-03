# FlowQuery Backlog

Ordered by priority. M5b onward requires owner approval per milestone.

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
- [x] Dashboard with create, rename, delete; double-submit guard
- [x] Tests for BOARD-001…007; browser verification

### M5a — Task management
- [x] `POST/GET/PATCH/DELETE /api/v1/boards/:boardId/tasks[/:taskId]`
- [x] Field validation: title, description, priority, status, assignee, due date
- [x] `expectedVersion` optimistic concurrency → `409`
- [x] Status change appends to the end of the target column
- [x] Task detail drawer for create and edit, with two-step delete
- [x] `GET /api/v1/profiles` for the assignee picker
- [x] Shared session middleware extracted; task routes reuse it
- [x] Tests for TASK-001…006, TASK-010…013; browser verification of the drawer

## Awaiting approval

### M5b — Ordering and movement
- [x] `POST /api/v1/boards/:boardId/tasks/:taskId/move`
- [x] Pure ordering functions in `src/shared/ordering.ts`, 13 unit tests
- [x] Version-guarded move, then idempotent full renumber of affected columns
- [x] Drag-and-drop with dnd-kit (sortable columns and cards)
- [x] Keyboard alternative in the drawer: ← → across columns, ↑ ↓ within
- [x] Optimistic update, reconciled with the server's board view
- [x] Tests for TASK-007, TASK-008, TASK-009 (10 cases)
- [ ] Drag gesture verified by a human (automation could not complete a drop)

## Awaiting approval

### M6 — Comments and activity
- [ ] Comment add/list on a task, attributed to the acting human or Bob
- [ ] `GET /api/v1/boards/:boardId/activity`, newest first, paginated
- [ ] Activity recorded for create, edit, move, assign, reprioritise, comment, delete
- [ ] Board UI: comments in the drawer; activity feed
- [ ] Tests for COM-001…003 and ACT-001…004

## Not yet authorised

### M7 — Agent API and tokens (isolation tests, OpenAPI)
### M8 — Hardening, final restore drill, performance pass
### M9 — Deployment (separate approval; `workers.dev`; replace placeholder database id)

## Technical debt

- [ ] Remove the seeded placeholder user once real OAuth users exist
- [ ] Show the signed-in user's name in the app header
- [ ] Task list endpoint with filters (needed by the agent API in M7)
- [ ] Trim `design/DESIGN_DIRECTION.md` to the MVP shell
- [ ] Reconcile or mark historical `repository/SETUP_QUESTIONS.md`
- [ ] Delete the neutralised `memory/` mirror
- [ ] Replace the placeholder D1 `database_id` at deployment
