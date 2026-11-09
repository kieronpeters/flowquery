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

### M5b — Ordering and movement
- [x] `POST /api/v1/boards/:boardId/tasks/:taskId/move`
- [x] Pure ordering functions in `src/shared/ordering.ts`, 13 unit tests
- [x] Version-guarded move, then idempotent full renumber of affected columns
- [x] Drag-and-drop with dnd-kit (sortable columns and cards)
- [x] Keyboard alternative in the drawer: ← → across columns, ↑ ↓ within
- [x] Optimistic update, reconciled with the server's board view
- [x] Tests for TASK-007, TASK-008, TASK-009 (10 cases)
- [ ] Drag gesture verified by a human (automation could not complete a drop)

### M6 — Comments and activity
- [x] `POST/GET /api/v1/boards/:boardId/tasks/:taskId/comments`
- [x] `GET /api/v1/boards/:boardId/activity` (newest first, keyset paginated)
- [x] Activity for create, edit, move, comment, delete
- [x] One event per real change; no event for reordering within a column
- [x] Deletion event written with a null task reference so it survives the cascade
- [x] Comments in the task drawer; board activity feed
- [x] Tests for COM-001…003 and ACT-001…004 (21 cases)

### M7 — Agent API and tokens
- [x] Token create/list/revoke per board, shown once, SHA-256 at rest
- [x] `/api/v1/agent/*`; board derived from the token, never from the request
- [x] Reads: board, filtered tasks, one task, comments, activity, columns, profiles
- [x] Writes: create, edit, move, delete tasks; add comments
- [x] OpenAPI 3.1 at `/api/v1/openapi.json`
- [x] Isolation suite: second board and second token; every cross-board attempt 404
- [x] Door separation: cookie rejected on `/agent`, bearer rejected on human routes
- [x] `FLOWQUERY_API_TOKEN` documented in the README
- [x] Verified end to end from a shell with a UI-created token

### M8 — Hardening and release preparation
- [x] Security headers on API responses and on the static SPA document (`public/_headers`)
- [x] A test that the two policies cannot drift apart
- [x] `X-Request-Id` on every response; request id echoed in 404 and 500 bodies
- [x] Error handler that logs detail and returns none of it
- [x] Callback rate limit checked before contacting GitHub
- [x] Restore drill on the final schema, including agent tokens
- [x] Performance pass: board view, agent task list and auth path measured
- [x] `docs/internal/SECURITY_REVIEW.md`: 20 checks with results and accepted risks
- [x] `docs/internal/RUNBOOK.md`: setup, backup, restore, incidents, deployment checklist

## Not yet authorised

### M9 — Deployment (separate approval; `workers.dev`; replace placeholder database id)

## Technical debt

- [x] Trimmed `docs/internal/DESIGN_DIRECTION.md`: visual language kept, unbuilt features listed explicitly
- [x] Reconcile the repository setup notes: what is settled vs what still needs the owner
- [x] Task list endpoint with filters — delivered in M7 as `/agent/tasks`
- [x] `memory/` mirror — removed 2026-11-09 (DEC-027); `.flowquery/` is the only project memory
- [ ] Seeded placeholder user (`usr_dev_owner`) must not exist in a production database; the preflight and the no-seed deploy path cover this
- [ ] Replace the placeholder D1 `database_id` at deployment (the preflight refuses to deploy without it)
- [ ] Signed-in user's name in the app header — deliberately not done: the dashboard already says "Signed in as X", and a header fetch would add a request to every page for no functional gain
