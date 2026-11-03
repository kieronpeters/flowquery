# FlowQuery Project State

**Application:** FlowQuery (working name; clearance not pursued)
**Primary coordinator:** Bob — the current OpenCode session
**Current phase:** M2 complete — walking skeleton. Awaiting owner approval for M3.
**Implementation authorised:** M1–M2 (complete). M3 onward: no.
**Git repository:** Local only, branch `main`. No remote.
**Cloud resources:** None
**Deployment:** None
**Last updated:** 2026-11-03

---

## Current product direction

A small, private Kanban application for managing development work by the owner and an AI-assisted team.

- **Flat structure.** Boards only. No organisations, projects, workspaces or folders.
- **Two human administrators** — the owner and their friend — with identical full access to every board.
- **Five fixed columns** per board, in fixed order: Backlog, To Do, In Progress, Review, Done. Not configurable.
- **Tasks** carry title, description, priority (None/Low/Medium/High/Urgent), assignee profile, due date, comments and append-only activity history.
- **Board deletion is permanent** with explicit typed confirmation; no archive, no recycle bin.
- **Bob** is the current OpenCode session, using a **board-scoped bearer token** to manage tasks and comments on exactly one board. Bob cannot create, rename or delete boards.
- **Specialist agents** are **assignee profiles only** — never accounts, never credentials.
- **Routes:** `/`, `/login`, `/signup`, `/agent`, `/boards`, `/boards/:boardId`.
- **Zero recurring cost is a firm requirement.** Workers Free + D1 Free, `*.workers.dev` address, no domain.

Full scope: `docs/MVP_SPECIFICATION.md`. That document contains the authoritative list of superseded assumptions.

## Decisions in force

**Approved (owner, 2026-11-03):** flat board model; two equal human administrators; restricted registration; five fixed columns; permanent board deletion; board-scoped labelled revocable tokens; Bob as sole AI writer with task-level permissions only; zero recurring cost; React/TypeScript on Workers + D1 + static assets; GitHub source control; `*.workers.dev` acceptable; GitHub OAuth with a server-side allowlist (AUTH-01); both administrators use GitHub accounts (AUTH-02); identity keyed on immutable GitHub numeric user ID (DEC-031); notifications dropped (SCOPE-01); local path confirmed (DEC-029); local git init authorised, no remote (DEC-030).

**Proposed by Bob:** status-as-enum schema (DEC-019), integer positions (DEC-020), optimistic concurrency (DEC-021), SHA-256 token hashing (DEC-022), no ORM (DEC-023), Hono (DEC-024), description truncation (DEC-025), `apac` hint (DEC-026), remove `memory/` mirror (DEC-027).

**Open:** none.

Register: `docs/DECISIONS.md`.

## Current repository state (verified 2026-11-03)

- Git on `main`; local only, no remote.
- Toolchain verified: TypeScript 6.0.3, Vite 8.3.5, Vitest 5.1.0, Wrangler 4.156.2, React 19, Hono 4.
- `typecheck`, `lint`, `test` (11 tests), `build`, `format:check` all pass.
- D1 bound locally; `0001_init.sql` applied; seed loads 18 profiles, 1 board, 9 tasks, 1 placeholder user.
- Read path proven end to end: SPA → `/api/v1/boards/brd_demo` → service → repository → D1 → rendered board with five columns.
- Export → total state loss → import restored identical data with foreign keys intact.
- Board view CPU-bound work measured at 0.032 ms for 9 tasks, 1.44 ms for 500.
- OpenCode discovers Bob as primary and 15 specialists as subagents.
- `npm audit --omit=dev` reports 0 vulnerabilities.

## Architecture status

Proven running locally:

- Single Worker serving the SPA and `/api/v1`; static assets with `not_found_handling: single-page-application` and `run_worker_first: ["/api/*"]` only.
- Hono router; React 19 + TypeScript strict; Vitest; shared types in `src/shared/`.
- D1 bound and migrated; repository → service → route layering in place.
- Two API namespaces still to come: human session (M3) and agent token (M7), sharing the existing service layer.
- **Known temporary compromise:** `GET /api/v1/boards/:boardId` is unauthenticated until M3. No deployment may happen before M3.

Details: `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/API_SPECIFICATION.md`.

## Open decisions

None.

## Platform facts relied on

Verified 2026-11-03; sources and dates in `docs/TECHNICAL_RESEARCH.md`.

- Workers Free: 100,000 requests/day, **10 ms CPU**/request, 50 subrequests, 128 MB.
- Static asset requests are **free and unlimited**; only `/api/*` invokes the Worker.
- D1 Free: 5,000,000 rows read/day, 100,000 rows written/day, 5 GB storage, 500 MB per database, Time Travel 7 days.
- D1 foreign keys enforced by default; `batch()` is transactional and counts as one query.
- No hard spending cap; budget alerts are informational only.
- Measured locally: PBKDF2-SHA256 at 100,000 iterations ≈ 26 ms CPU — hence no passwords.

## Repository

Local path: `C:\Users\Asus\source\repos\FlowQuery` (confirmed, DEC-029).
Remote: none, and none authorised.

## Known gaps carried into M3

- Authentication does not exist; the board read endpoint is temporarily open (local only).
- `/login`, `/signup`, `/agent`, `/boards` routes are not built; `/` is a temporary landing page that will become the dashboard in M4.
- No mutations: tasks cannot be created, edited, moved or deleted yet.
- `design/DESIGN_DIRECTION.md` still describes a richer product; trim it to the MVP shell.
- `repository/SETUP_QUESTIONS.md` predates the current plan; reconcile or mark historical.
- `memory/` mirror is neutralised but still present; delete once history is comfortable.
