# FlowQuery — Implementation Roadmap

**Status:** 3 November 2026. No milestone below is authorised to start. M0 is the current activity; M1 requires the owner's explicit approval.

Sizes are relative effort (S ≈ a session, M ≈ two to three sessions, L ≈ a week of sessions), not calendar promises.

---

## M0 — Consolidate specification and obtain approval

**Goal:** one authoritative direction that the owner has read and approved.

- [x] Audit the existing package; identify contradictions
- [x] Consolidate the product specification to the flat board model
- [x] Rewrite requirements, architecture, database, API, security documents
- [x] Reconcile the decisions register into a single source
- [x] Update `.flowquery/` memory and the Bob role
- [ ] **Owner reviews and approves the consolidated specification**
- [ ] Owner resolves AUTH-01, SCOPE-01, AUTH-02

**Exit criteria:** the owner states that the documentation reflects the intended product and authorises the next phase. Nothing else counts as approval.

## M1 — Repository foundation — S

**Goal:** a safe, reproducible place to build, with version control protecting the documentation.

- Local `git init` on `main`; `.gitignore` covering `node_modules/`, `dist/`, `.wrangler/`, `.dev.vars`, `.env*`
- First commit: documentation only
- Project structure: `src/worker/` (routes, services, repositories, db), `src/app/` (React), `migrations/`, `tests/`
- Toolchain: TypeScript strict, Vite, Hono, Vitest, ESLint, Prettier
- Scripts: `dev`, `build`, `test`, `typecheck`, `lint`, `format` (`db:migrate:local` arrives in M2 with the D1 binding)
- OpenCode agents activated (`.opencode/agents/` + valid `opencode.jsonc`), verified discoverable
- `GET /api/v1/health` as the infrastructure smoke endpoint, with tests for it and for the JSON-404 fallback
- `README.md` with setup instructions verified from a clean clone

**Exit criteria:** `npm run dev` serves a placeholder page with no Cloudflare account; `npm test` passes; first commit contains no secrets; documented commands have been run and their output recorded.

## M2 — Walking skeleton — M

**Status: complete 2026-11-03.**

**Goal:** prove React + Worker + D1 + local dev + tests work together before any product logic exists.

- D1 schema migration `0001_init.sql` for the full designed schema
- `db:migrate:local` and `db:reset` scripts against the new D1 binding
- Seed: team profiles, one demo board
- `GET /api/v1/columns` (constant)
- Static assets configured with `not_found_handling: "single-page-application"` and `run_worker_first: ["/api/*"]`
- SPA shell, router, hard-refresh on `/boards/:boardId` returns the SPA
- Three tests: board ID generation unit test, health integration test, unknown-route behaviour

**Exit criteria:** a hard refresh on a deep link works; API calls reach the Worker; asset requests do not; CPU for each endpoint measured and recorded.

## M3 — Human authentication — M

**Status: complete 2026-11-03** (pending the owner's real GitHub credentials for a live sign-in test).

**Goal:** the two humans can sign in securely inside the CPU budget.

- Implement the owner's AUTH-01 choice behind the `AuthProvider` seam
- Allowlist enforcement at the callback/registration step
- Session table, hashed tokens, cookie flags per `AUTH-003`–`AUTH-006`
- `/login`, `/signup`, sign-out, `/auth/me`
- Origin check on mutating requests
- Tests: allowlisted success, non-allowlisted rejection, session expiry, sign-out invalidation, cookie flags
- Recorded measurement of sign-in CPU cost against the 10 ms budget

**Exit criteria:** AUTH-001…010 pass; a non-allow-listed identity provably cannot obtain a session; CPU measurement recorded.

## M4 — Board lifecycle and dashboard — M

**Status: complete 2026-11-03.**

**Goal:** boards exist and can be managed.

- `POST/GET/PATCH/DELETE /api/v1/boards`
- Deletion with typed-name confirmation and cascade
- Dashboard list, create dialog, rename inline, delete confirmation flow
- `/` landing and redirect behaviour
- Tests: create/rename/delete, cascade completeness, `404` for unknown board, deletion requires exact name

**Exit criteria:** BOARD-001…007 pass; deleting a board removes tasks, comments, activity and tokens; renaming does not change the URL.

## M5 — Kanban board and task CRUD — L

**Status: complete 2026-11-03** (delivered as M5a task CRUD, then M5b ordering).

**Goal:** FlowQuery is usable for real work.

- Board view: five fixed columns, tasks in position order, counts
- Task create/edit/delete, priority, assignee, due date
- Drag-and-drop with dnd-kit plus the explicit "move to column" keyboard path
- Optimistic updates with `409` reconciliation
- Task detail drawer: full description, comments entry point
- Tests: TASK-001…013 including concurrency conflict and keyboard move

**Exit criteria:** the owner can run a real week of work on the board without touching the database.

## M6 — Comments and activity — M

**Status: complete 2026-11-03.**

**Goal:** the board explains its own history.

- Comment add/list with author attribution
- Activity recording for every task event
- Activity feed per board and per task, paginated
- Tests: COM-*, ACT-*, actor attribution for both human and agent actions

**Exit criteria:** every task mutation produces exactly one activity event with the correct actor.

## M7 — Agent API and tokens — M

**Status: complete 2026-11-03.**

**Goal:** Bob can work a board safely.

- Token create/list/revoke with show-once plaintext
- `/api/v1/agent/*` namespace, board derived from token
- Full task operations for agents; no board administration
- OpenAPI 3.1 document served by the app
- Isolation test suite: board A token cannot read or write board B; revoked token rejected; agent cannot reach human endpoints
- Bob's usage guide (env var `FLOWQUERY_API_TOKEN`, poll only while active)

**Exit criteria:** AGT-001…012 and API-001…008 pass; the isolation suite is green; a real session of Bob reading the backlog, refining a task and reporting progress succeeds.

## M8 — Hardening and release preparation — M

**Goal:** it can be trusted, backed up and explained.

- Security headers, error handling, request IDs
- Rate limiting per §11 of the API spec
- Export/restore drill using `wrangler d1 export` and an actual restore into a scratch database
- Performance pass with measured CPU per endpoint
- Documentation: runbook, backup procedure, known limitations
- Full regression run

**Exit criteria:** restore from export verified; all MUST requirements traced to passing tests; documentation complete.

## M9 — Deployment — S, approval gated

**Goal:** live at a `*.workers.dev` address.

- Create D1 database and Worker (free plan, no paid features)
- Apply migrations, seed profiles only
- `wrangler secret put` for signing keys and any OAuth secret
- Verify the allowlist denies everyone else
- Post-deploy smoke test; usage dashboard check
- Rollback procedure documented before deployment, not after

**Exit criteria:** owner has explicitly approved deployment; the app is reachable; a stranger cannot register; no paid resource exists.

---

## Sequenced backlog

| Priority | Item | Milestone |
|---|---|---|
| 1 | Owner approval of specification | M0 |
| 2 | AUTH-01 decision | M0 |
| 3 | SCOPE-01 decision (notifications) | M0 |
| 4 | Repository initialisation + first commit | M1 |
| 5 | OpenCode agent activation | M1 |
| 6 | Schema migration + seeds | M2 |
| 7 | SPA + asset routing proof | M2 |
| 8 | Authentication | M3 |
| 9 | Board CRUD + dashboard | M4 |
| 10 | Kanban + tasks | M5 |
| 11 | Comments + activity | M6 |
| 12 | Agent API + tokens | M7 |
| 13 | Hardening + restore drill | M8 |
| 14 | Deployment | M9 |

## Deferred — not scheduled

Notifications (SCOPE-01), per-user preferences, email/push, board sharing or public view links, custom columns, archive/restore, labels, attachments, checklists, sub-tasks, search beyond title substring, realtime updates, MCP, webhooks, mobile app, theming, i18n.

Each would need a decision entry and an owner conversation before it enters the roadmap.

## Risk-adjusted ordering note

M3 (authentication) is placed before M4/M5 deliberately. The only genuinely uncertain technical element in this project is whether authentication can be delivered securely at zero cost inside 10 ms of CPU. Discovering that after building the board would be expensive. If M3 proves impossible under the constraint, the fallback is a design change to AUTH-01 — not a paid plan, and not a weaker password scheme. That conversation happens at the M3 gate, before further features are built on top.
