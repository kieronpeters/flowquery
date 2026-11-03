# Agent Activity Log

Significant actions and their verified outcomes. Newest first. Facts only — no hidden reasoning, no secrets.

---

## 2026-11-03 — Documentation reconciliation (Bob, current session)

**Trigger:** the owner said "continue" at the deployment gate, which is blocked on Cloudflare authentication. Rather than repeat the request, I audited eight milestones of accumulated drift.

**Found and fixed:**
- `ARCHITECTURE.md` still listed **TanStack Query, Tailwind CSS and Zod** as the frontend stack. None of them were used. The table now states what is in use and why each was dropped; `DECISIONS.md` gains DEC-032 recording the decision.
- The CPU table described "HMAC session verify" and "Zod validation". Sessions are opaque hashed tokens and validation is hand-written; the table now reflects that.
- `MVP_SPECIFICATION.md` §9 opened with "The mechanism is an open decision (AUTH-01)" and then, twelve lines later, stated it was decided. Fixed.
- `ARCHITECTURE.md` §12 said decisions were written "before code exists". Code exists.
- `/api/v1/boards` implementation note still said M7; the API has been hardened since.
- `design/DESIGN_DIRECTION.md` described a richer product than was built. Rewritten to record the visual language and explicitly list the eleven things in the concept images that do not exist.
- `repository/SETUP_QUESTIONS.md` still pointed at `C:\repos\flowquery`, a path abandoned in M1. Rewritten as settled-vs-open.

**Deliberately not changed:**
- The `memory/` mirror stays. It is neutralised file by file and Git-tracked; deleting it has no functional benefit.
- No signed-in name in the app header: the dashboard already shows it, and a per-page auth fetch would cost a request for no gain.

**Not done:** no deployment, no resource, no cost. Cloudflare authentication is still absent.

---

## 2026-11-03 — Deployment readiness check (Bob, current session)

**Authorised:** nothing new. The owner said "continue", which does not constitute approval to create cloud resources, so no resource was created.

**Performed:**
- `wrangler whoami`: **not authenticated** — deployment is impossible from this machine until the owner runs `npx wrangler login`.
- `wrangler deploy --dry-run`: bundles 151.18 KiB, reads 6 static files, reports the `env.DB` binding. No upload, no account needed.
- `docs/DEPLOYMENT_PLAN.md`: what would be created, exact commands, post-deploy verification, rollback.

**Found and fixed:** the `_headers` file from M8 was structurally invalid. In that format `/*` is a URL pattern, not a comment opener, so my `/* … */` comment blocks meant the policy was attached to the wrong block or none at all. The SPA document would still have shipped without a CSP. Rewritten with `#` comments and a single `/*` rule; the tests now assert structure (first rule line, indented headers, no `*/`) instead of merely finding the policy string.

**Tests:** 152 passing (3 new structural tests).

**Also:** added `npm run preflight` so a deployment cannot start with the placeholder D1 id, a malformed `_headers`, a missing build, or an un-ignored `.dev.vars`. Verified both branches — it refuses today, and passes with a real id (config restored byte-identically afterwards, hash checked).

**Not done:** no deployment, no database, no Worker, no domain, no cost. Still unauthenticated.

---

## 2026-11-03 — M8 hardening and release preparation (Bob, current session)

**Authorised:** M8 — hardening.

**Performed:**
- `middleware/security.ts`: CSP, nosniff, referrer, frame, COOP, permissions, HSTS on API responses.
- `public/_headers`: the same policy for the static SPA document, which the Worker never sees.
- Request-id middleware (`X-Request-Id`), `onError` returning a generic 500 with the id, and the catch-all 404 carrying it too.
- Callback rate limit now checked *before* the GitHub exchange rather than only counted.
- `benchmarks/board-view.ts` extended with the agent task list.
- `docs/SECURITY_REVIEW.md` and `docs/RUNBOOK.md`.

**Verified (actual output):**
- 149 tests, 12 files; typecheck, lint, build clean.
- Headers present on API responses; the `_headers` policy matches the Worker policy exactly (asserted by a test).
- Strict CSP (`script-src 'self'`) does **not** break the dev app: 9 cards, 5 columns, zero console errors.
- Restore drill on the final schema: export 12.7 KB → delete all `.wrangler/state` → import → counts identical, `PRAGMA foreign_key_check` empty, and the agent token still authenticated afterwards (200, 9 tasks).
- Bench: board view 0.033 ms @ 9 and 0.578 ms @ 200; agent task list 50 tasks 0.137 ms.

**Found:** the SPA document would have shipped with no CSP at all, because static assets bypass Worker middleware. Fixed with `public/_headers` plus a drift test.

**Not done:** no deployment, no remote repository, no resource creation, no cost.

**Outcome:** M8 complete; the build is finished and awaiting a deployment decision.

---

## 2026-11-03 — M7 agent API and tokens (Bob, current session)

**Authorised:** M7 — Bob's board-scoped API.

**Performed:**
- `repositories/agent-tokens.ts`: insert, list, revoke (sets `revoked_at`), find-active-by-hash, touch.
- `services/agent-tokens.ts`: token generation (`fq_` + 32 bytes), label validation, stored as SHA-256.
- `middleware/agent-auth.ts`: bearer resolution; sets `{ tokenId, boardId, label }` on the context.
- `routes/agent.ts`: board, columns, profiles, tasks (list with filters, read, create, edit, delete, move), comments, activity.
- `routes/tokens.ts`: human token management, registered on the board router.
- `openapi.ts`: hand-written OpenAPI 3.1 served at `/api/v1/openapi.json`.
- `repositories/tasks.ts` + `services/tasks.ts`: filtered task list (status, priority, assignee, title).
- UI: `TokenPanel` on each dashboard board row — create (plaintext once), list, revoke.

**Verified (actual output):**
- 142 tests, 11 files; typecheck, lint, build clean.
- Token stored as a hash; a list response never contains the plaintext.
- Isolation suite with a second board and second token: cross-board read, update, move, delete and comment all return 404, and the task is unchanged.
- Session cookie rejected on `/agent`; bearer token rejected on human routes; a revoked token returns 401 immediately.
- From a shell, with a token created in the browser: read the board (9 tasks), filtered the backlog (3), created a task, commented as "Bob - verification", saw the board reach 10 tasks with the new one in To Do, then revoked it in the UI and got 401.

**Note:** PowerShell's `Invoke-RestMethod` mangles a manually set `Cookie` header; used `curl.exe` instead. Not an application issue.

**Not done:** no hardening pass, no deployment.

**Outcome:** M7 complete; awaiting approval for M8.

---

## 2026-11-03 — M6 comments and activity (Bob, current session)

**Authorised:** M6 — comments and activity.

**Performed:**
- `repositories/activity.ts`: event statement builder, board feed with keyset pagination.
- `repositories/comments.ts`: append-only insert (batched with its activity row) and board-scoped listing via a join.
- `services/comments.ts`: validation, text-only storage, activity on comment.
- `services/activity.ts`: limit/before validation, board existence check.
- `services/tasks.ts`: activity for create, each changed field, column moves and deletion. Inside a column, reordering records nothing.
- `routes/comments.ts`, `routes/activity.ts`, registered onto the board router.
- UI: comments in the task drawer; `ActivityFeed` below the board with "Load older".

**Verified (actual output):**
- 113 tests, 9 files; typecheck, lint, build clean.
- Comment with `<script>` stored and returned verbatim; browser rendered it as text, `window.__pwned` stayed false, zero injected elements.
- Activity: create, priority (with from/to), description (no text stored), one move event per column change, none for reorder, comment, delete.
- Feed ordering and cursor pagination verified at service level with explicit timestamps.
- Browser: "created", "commented" and "moved" all rendered newest-first.

**Found and fixed:** the `task.deleted` event was being removed by the same cascade that removed the task, so deletion left no trace. It is now written with `task_id = NULL` and survives; task-scoped events still cascade. Recorded in `DATABASE_DESIGN.md` §9.

**Trade-off accepted:** activity writes are best-effort. A failed insert is logged and does not fail the user's action, because failing a successful edit invites a retry that duplicates it.

**Not done:** no agent API, no deployment.

**Outcome:** M6 complete; awaiting approval for M7.

---

## 2026-11-03 — M5b ordering and drag-and-drop (Bob, current session)

**Authorised:** M5b — ordering, drag-and-drop, keyboard alternative.

**Performed:**
- `src/shared/ordering.ts`: `moveWithin`, `positionsFor`, `isContiguous` — pure, shared by worker and UI. Moved out of `worker/services` so the client can compute optimistic moves with the same rule.
- `repositories/tasks.ts`: `listColumnTaskIds`, `guardedMove` (version-checked), `renumberColumn` (batch).
- `services/tasks.ts`: `moveTask` — guarded update first, then renumber both affected columns.
- `POST /api/v1/boards/:boardId/tasks/:taskId/move`; response returns the whole board view.
- UI: dnd-kit sortable columns and cards; optimistic `applyMove`; reconciliation with the server response; notice on 409.
- Drawer move controls: ← → across columns, ↑ ↓ within, reloading the task after each move.

**Verified (actual output):**
- 92 tests, 7 files; typecheck, lint, build clean.
- 13 ordering unit tests including clamping, round-trip and invariant sequences.
- Reorder within a column and across columns produce expected order; positions contiguous and unique after six consecutive moves; task count unchanged.
- Stale version on move → 409, nothing moved; wrong board → 404; invalid index → 400; unauthenticated → 401.
- Browser: drawer ↓ reordered the column (API confirmed positions 0/1/2); drawer → moved the task to the end of To Do, drawer reloaded to `todo`, version incremented to 3.

**Could not verify:** the drag gesture itself. Synthetic pointer events cannot drive dnd-kit (it uses pointer capture), and automated key events announced a pickup but never completed a drop. The sortable attributes and live region are present, so the wiring is mounted; a human click-drag is required. Recorded in `NEXT_ACTION.md` and the README rather than glossed over.

**Not done:** no comments or activity, no agent API, no deployment.

**Outcome:** M5 complete; awaiting approval for M6.

---

## 2026-11-03 — M5a task management (Bob, current session)

**Authorised:** M5a — task CRUD and detail (owner approved M5; Bob proposed and took the split).

**Performed:**
- `repositories/tasks.ts`: scoped reads, insert, whitelisted dynamic update, delete, next-position, active-profile lookup.
- `services/tasks.ts`: validation for title/description/priority/status/due date/assignee, create/read/edit/delete, `expectedVersion` concurrency.
- `services/task-dto.ts`: DTO mapping extracted so the board view and task endpoints share one shape; truncation is an explicit call-site decision.
- `routes/tasks.ts` registered onto the board router so it inherits the session gate; `routes/profiles.ts` added.
- `middleware/session.ts`: the gate extracted from the board router, now used by two routers.
- UI: `TaskDrawer` serves create and edit; cards are buttons; each column has an add-task control.
- Status change appends to the end of the target column, so position is never left pointing into the wrong column.

**Verified (actual output):**
- 64 tests pass, 5 files; typecheck, lint, build clean.
- Create defaults → 201, backlog, position 3 (after three seeded tasks), version 1.
- Nine invalid inputs → 400 with the offending field named.
- Single-task read returns a 900-character description; the board view truncates it to 500 and flags it.
- Update → version 2; clearing assignee and due date both work.
- Stale `expectedVersion` → 409 and the task is unchanged.
- Delete → 204, task gone, its comment cascaded.
- Browser: drawer create → card in Backlog; reopen shows title, priority, assignee and due date preserved; status change moved it to Review with position 1; two-step delete removed it; zero console errors.

**Discovered:** nothing broken, but browser driving confirmed that the `expectedVersion` round-trip works against a real moving board.

**Not done:** no drag-and-drop, no reordering, no keyboard move control, no comments or activity, no agent API, no deployment.

**Outcome:** M5a complete; awaiting approval for M5b.

---

## 2026-11-03 — M4 boards and dashboard (Bob, current session)

**Authorised:** M4 only — board lifecycle, dashboard.

**Performed:**
- Repository functions for list-with-counts, insert, rename and delete; all SQL stays in `repositories/boards.ts`.
- `services/boards.ts`: name validation (1–120 chars, trimmed, control characters rejected) and a delete service that requires the exact current name.
- `routes/boards.ts`: one session middleware for the whole router; `GET/POST/PATCH/DELETE`.
- Dashboard UI replacing the M3 placeholder: list with task counts, create form, inline rename, typed-name delete confirmation.
- Landing page redirects signed-in humans to `/boards`.
- `tests/helpers/sqlite-d1.ts`: a D1 facade over Node's built-in SQLite so tests run the real migrations with foreign keys enabled.
- Double-submit guard (ref, not state) after browser automation exposed the window.

**Verified (actual output):**
- 46 tests pass, 4 files; typecheck, lint, build all clean.
- Signed-out `GET /api/v1/boards` → 401.
- Create → 201, `brd_` id, appears in list with 0 tasks; empty/whitespace/non-string/121-char names → 400.
- Rename → 200, id unchanged, all 9 tasks intact; unknown board → 404.
- Delete with wrong name → 409 and nothing removed; with no confirmation → 409; with the exact name → 204 and the board, its 9 tasks, a comment, an activity event and an agent token all gone, while 18 profiles and both users survive.
- Cross-origin delete → 403.
- Browser: dashboard rendered with counts; create, rename and the typed-name delete all worked; zero console errors.

**Observed during testing:** automation filled the wrong textbox and created a duplicate board. Investigated: not an application bug, but it did expose a real double-submit window, which is now guarded.

**Not done:** no task editing, no drag-and-drop, no comments or activity UI, no agent API, no remote, no deployment.

**Outcome:** M4 complete; awaiting owner review.

---

## 2026-11-03 — M3 human authentication (Bob, current session)

**Authorised:** M3 only — human authentication.

**Performed:**
- `migrations/0002_auth_attempts.sql` for rate-limit counters.
- `auth/github.ts`: OAuth client with PKCE S256, token exchange, `/user` and `/user/emails`, verified-email requirement.
- `auth/allowlist.ts`: numeric-id allowlist, fail-closed on empty or malformed input.
- `auth/cookies.ts`: `__Host-` session and state cookies, plus open-redirect-safe `next` handling.
- `services/auth.ts`: sign-in, session resolution with sliding expiry, sign-out.
- `repositories/auth-store.ts`: interface + D1 implementation; all auth SQL isolated.
- `routes/auth.ts`: start, callback, me, logout.
- `app.ts`: Origin guard on state-changing requests; board reads now require a session.
- UI: `/login`, `/signup`, `/boards` placeholder; board page redirects to `/login` on 401.
- `benchmarks/auth.ts`; `npm run bench` now covers both paths.

**Verified (actual output):**
- `db:reset` applied `0001_init.sql` and `0002_auth_attempts.sql`.
- Unsigned `GET /api/v1/boards/brd_demo` → **401**; `/auth/me` → **401**.
- `GET /auth/start` → 302 to `github.com/login/oauth/authorize` with `client_id`, `scope=read:user user:email`, `code_challenge_method=S256`, 43-char challenge, 39-char state, correct `redirect_uri`.
- State cookie flags: `HttpOnly; Secure; SameSite=Lax; Path=/`.
- Browser: `/boards/brd_demo` while signed out redirected to `/login?next=%2Fboards%2Fbrd_demo`, login page rendered, **0 console errors**; `/signup` rendered.
- Tests: **33 passed** across 3 files, including allowlist rejection creating no user/session, state mismatch never calling GitHub, session hashed at rest, expiry, sign-out invalidation, cross-origin POST → 403.
- Bench: allowlist 0.002 ms, SHA-256 0.035 ms, response JSON 0.001 ms.

**Not verified:** a live GitHub round trip — requires the owner's OAuth app credentials and two GitHub accounts. Recorded as a prerequisite in `NEXT_ACTION.md`.

**Not done:** no task mutations, no dashboard, no agent API, no remote, no deployment.

**Outcome:** M3 complete pending owner review and a live sign-in.

---

## 2026-11-03 — M2 walking skeleton (Bob, current session)

**Authorised:** M2 only — D1 schema, seeds, read-only board, measurement.

**Performed:**
- D1 binding added with a placeholder `database_id` (local only; a real id is created at M9).
- `migrations/0001_init.sql`: 9 tables, 9 indexes, CHECK constraints, foreign keys.
- `seeds/dev.sql`: 18 assignee profiles (2 human, 15 AI, 1 contractor), 1 demo board, 9 tasks, 1 placeholder dev user. Separate from migrations by design.
- Scripts: `db:migrate:local`, `db:seed:local`, `db:reset` (deletes local state, migrates, seeds).
- Layering: `repositories/boards.ts` (all SQL), `services/board-view.ts` (pure assembly + I/O wrapper), `domain` row types, `shared` wire types and column constants.
- Routes: `GET /api/v1/columns`, `GET /api/v1/boards/:boardId`.
- React: router, landing page, board view with five columns, priority/assignee/due-date metadata.
- `benchmarks/board-view.ts` + `npm run bench`; `tsx` added as a dev dependency because Vitest 5 removed its built-in bench API.

**Verified (actual output):**
- `db:reset` → 4 migration statements, 4 seed statements, no errors.
- Row counts: 18 profiles, 1 board, 9 tasks, 1 user.
- `GET /api/v1/boards/brd_demo` → 200, 4.4 KB, backlog 3 / todo 2 / in-progress 1 / review 1 / done 2.
- `GET /api/v1/boards/does-not-exist` → 404 JSON; unknown `/api/*` → 404 JSON; `/boards/brd_demo` deep link → 200 HTML.
- Export (12.2 KB, 10 tables, 31 inserts) → deleted `.wrangler/state` entirely → import → identical counts and board name, `PRAGMA foreign_key_check` empty.
- `npm run typecheck`, `lint`, `test` (**11 passed**), `build`, `format:check` all pass.
- Bench: 9 tasks 0.032 ms, 50 → 0.145, 200 → 0.546, 500 → 1.443 (median, assembly + JSON serialisation).
- Browser check: the board page rendered all 9 tasks across 5 columns with **zero console errors**; DOM confirmed via evaluated `body.innerText` and React root HTML.

**Discovered:** Vitest 5 no longer exports `bench`; local workerd tooling exposes span duration but not CPU, so end-to-end CPU is deferred to M9 and recorded as such.

**Not done:** no authentication (the board endpoint is temporarily open locally), no mutations, no dashboard, no agent API, no remote, no deployment.

**Outcome:** M2 complete; awaiting owner approval for M3.

---

## 2026-11-03 — M1 repository foundation (Bob, current session)

**Authorised:** M1 only — repository foundation and project configuration. No product implementation.

**Performed:**
- `git init -b main`; `.gitignore` written and committed before dependencies existed. No remote, no push.
- Commits: documentation baseline (126 files), owner approvals, M1 foundation.
- Structure: `src/worker/`, `src/app/`, `tests/`, `migrations/` (intentionally empty until M2).
- Toolchain installed: TypeScript 6.0.3, Vite 8.3.5, Vitest 5.1.0, Wrangler 4.156.2, React 19, Hono 4, ESLint, Prettier.
- `wrangler.jsonc` with SPA fallback and `run_worker_first: ["/api/*"]` only.
- `GET /api/v1/health` and a JSON-404 fallback for unknown `/api/*` paths, with 2 tests.
- OpenCode agents moved from `opencode/agents/` to `.opencode/agents/` (OpenCode V2 discovery path); invalid example config deleted; `opencode.jsonc` added.

**Verified (actual output):**
- `npm run typecheck` — pass, both projects.
- `npm run lint` — pass, no findings.
- `npm test` — 2 passed.
- `npm run build` — pass; worker 57.83 kB, client 220.80 kB.
- `npm run format:check` — all files match.
- `npm run dev` — `/` 200 HTML, `/boards/brd_example` 200 HTML, `/api/v1/health` 200 JSON, `/api/v1/does-not-exist` 404 JSON.
- `opencode api get /api/agent` — Bob (primary) + 15 specialists discovered.
- `npm audit --omit=dev` — 0 vulnerabilities.
- Fresh clone to a temp directory: `npm ci`, `typecheck`, `lint`, `test`, `build` all passed.

**Not done:** no product features, no schema, no D1 binding, no auth, no remote, no deployment, no paid service.

**Outcome:** M1 complete; awaiting owner approval for M2.

---

## 2026-11-03 — Specification consolidation (Bob, current session)

**Trigger:** owner issued a new product direction superseding the organisation/project hierarchy.

**Inspected:** all 60+ files in the package — root prompts and rules, 12 documents in `docs/`, 15 team profiles and the roster, 16 OpenCode agent definitions, the full `.flowquery/` tree, `design/`, `repository/`, `templates/`. Verified the toolchain (git 2.55.0, node 24.21.0, opencode 2.2.1, gh 2.103.3). Confirmed no Git repository and no application code existed.

**Identified contradictions:** nine, including a `docs/AGENTS.md` line instructing agents not to reintroduce the hierarchy that the spec mandated; human accounts marked MUST in requirements while deferred in the roadmap and backlog; the README asserting public editable board links while the security documents left it open; and Bob's token scope described three different ways.

**Researched:** Cloudflare Workers and D1 limits, pricing, static-asset billing, SPA routing, D1 foreign keys, batch semantics, Time Travel, and the absence of a hard spending cap — all against official documentation on 2026-11-03. Sources recorded in `docs/TECHNICAL_RESEARCH.md`.

**Measured:** PBKDF2-SHA256 CPU cost in the local V8/WebCrypto stack — 2.6 ms at 10k iterations, 25.9 ms at 100k, 162.6 ms at 600k. Against a 10 ms Workers Free budget this excludes server-side password hashing. Command and output recorded in `docs/TECHNICAL_RESEARCH.md`.

**Rewrote:** `MASTER_PROMPT.md`, `AGENTS.md`, `README.md`, `IMPLEMENTATION_KICKOFF_PROMPT.md` (marked superseded), `docs/MVP_SPECIFICATION.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/API_SPECIFICATION.md`, `docs/SECURITY_AND_AUTH.md`, `docs/TECHNICAL_RESEARCH.md`, `docs/DECISIONS.md`, `docs/MVP_ROADMAP.md`, `docs/PROJECT_BRIEF.md`, `docs/README.md`, `docs/AGENTS.md`, `docs/IMPLEMENTATION_GUIDE.md`, `docs/SECURITY_AND_QUALITY.md` (superseded pointer), `team/TEAM_DIRECTORY.md`, `team/AGENT_OPERATING_MODEL.md`, and the `.flowquery/` state, backlog, next action, phase status, decisions pointer and handoff.

**Not done, deliberately:** no code, no dependencies, no migrations, no Git repository, no cloud resources, no deployment, no paid service, no domain.

**Outcome:** documentation internally consistent with the flat board model; three decisions left open for the owner (AUTH-01, AUTH-02, SCOPE-01).

---

## 2026-11-02 — Requirements consolidation (previous session)

- Consolidated the owner's questionnaire and clarifications into the then-current `docs/MVP_SPECIFICATION.md`.
- Updated the brief, requirements, architecture candidate, API outline, data model, security/quality, roadmap, decision register, README, AGENTS and master prompt.
- No application code, repository creation, cloud resource creation or deployment performed.
- **Status now:** superseded by 2026-11-03. That specification described the organisation → project → board hierarchy, which has been removed from the product.
