# FlowQuery Project State

**Application:** FlowQuery (working name; clearance not pursued)
**Primary coordinator:** Bob — the current OpenCode session
**Current phase:** M8 complete — hardened and release-ready. M9 (deployment) is planned but **not authorised**, and currently impossible: wrangler is not authenticated.
**Implementation authorised:** M1–M8 (complete). M9: not authorised.
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
- `typecheck`, `lint`, `test` (**167 tests**), `build`, `format:check` all pass.
- D1 bound locally; `0001_init.sql` + `0002_auth_attempts.sql` applied; seed loads 18 profiles, 1 board, 9 tasks, 1 placeholder user.
- Authentication implemented: GitHub OAuth + PKCE, numeric-id allowlist, opaque sessions stored as SHA-256, `__Host-` cookie, sign-out invalidation, Origin check, rate limiting.
- Board management implemented: list, create, rename, permanent delete with typed-name confirmation; cascade verified against the real schema.
- Task management implemented: create, read, partial update, delete; validation; optimistic concurrency via `expectedVersion`.
- Ordering implemented: `move` endpoint, atomic guarded update then idempotent full renumber, drag-and-drop with dnd-kit, and a keyboard alternative in the drawer.
- Comments implemented: append-only, text-only, attributed to the acting human.
- Activity implemented: append-only board feed, newest first, keyset paginated; one event per real change (no event for reordering within a column).
- The `task.deleted` event is written with a null task reference so it survives the cascade — otherwise deleting a task would erase the record that it existed.
- Agent API implemented: board-scoped tokens (`fq_` + 32 bytes, SHA-256 at rest, shown once, revoked via `revoked_at`), `/api/v1/agent/*` with reads, writes, comments and activity, and an OpenAPI 3.1 document at `/api/v1/openapi.json`.
- **The agent namespace has no board parameter at all** — scope comes from the token row. Isolation is structural, not a check.
- Isolation suite: a second board plus a second token proves read, update, move, delete and comment attempts across boards all return 404, and that a session cookie and a bearer token cannot cross doors.
- Verified end to end outside the test suite: created a token in the dashboard, used it from a shell to read the board, filter the backlog, create a task and comment, then revoked it and confirmed 401.
- Hardened (M8): CSP and security headers on API responses *and* on the static SPA document via `public/_headers`, with a test that the two policies cannot drift; `X-Request-Id` on every response; an error handler that logs detail and returns none.
- Restore drill repeated on the final schema: export → delete all local state → import → identical counts, no FK violations, and **an existing agent token still authenticated**.
- `npm run bench` now covers the agent task list: 50 tasks map + serialise in 0.137 ms.
- `docs/SECURITY_REVIEW.md` records 20 checks, the four issues fixed during the build, and the accepted risks.
- `docs/RUNBOOK.md` covers setup, backup, restore, incidents and the deployment checklist.
- **Documentation reconciled against the build (M8+ pass):** `ARCHITECTURE.md` no longer claims TanStack Query, Tailwind or Zod; `MVP_SPECIFICATION.md` no longer calls AUTH-01 open; `DESIGN_DIRECTION.md` lists the eleven unbuilt features from the concept images; `repository/SETUP_QUESTIONS.md` no longer points at a path that does not exist.
- **Accessibility audited (M8+ pass):** Lighthouse scores 100 for accessibility and best practices on the board, dashboard and task dialog. A real defect was found by testing rather than by the audit: the `aria-modal` drawer let Tab escape into the page and did not return focus on close. Both fixed and verified (20 Tab presses, zero escapes; Escape returns focus to the card).
- **UI component tests added (M8+ pass):** jsdom + Testing Library cover the task dialog, the dashboard and the board page — 15 tests. The board page tests exercise the keyboard move path end to end (same endpoint, optimistic update, server reconciliation) and the `409` refetch.
- **Defensive parsing at the UI boundary:** the activity feed and the comment list previously crashed the whole page on an unexpected payload. Both now degrade to an error message instead. Found by the board-page test, not by hand.
- **Per-board appearance (DEC-033, owner-requested):** `boards.theme` JSON document with `background`, `columns`, `tickets` and `activity`, `PUT /api/v1/boards/:boardId/theme`, human-only. Colours restricted to six-digit hex; ink chosen by highest WCAG contrast, so pale colours stay readable. Twelve presets per surface; the custom picker is behind a per-row button. Cards tint with their column unless a board ticket colour overrides it. Verified in a browser: dark and pale surfaces, both ink directions, persisted across reload, reset to defaults.

- **Activity filters (owner-requested):** the activity box takes a period (`today`, `week`, `month`, `year`, all history) and a multi-select of everyone who has acted. Filtering is server-side (`since`, `actors`) because the feed is paginated; the period boundary is computed in the browser and sent as an instant, since the Worker only knows UTC. Default order is newest first. The roster comes back with every page, unaffected by the filter.
- **First-run experience fixed:** clicking "Continue with GitHub" with no OAuth credentials used to dump raw JSON on screen. `/auth/start` now redirects to `/login?error=configuration`, and the sign-in page explains exactly what to put in `.dev.vars`.
- **Privacy:** `public/robots.txt` disallows all crawlers; `/robots.txt` previously returned the SPA's HTML.
- Deployment artefact validated without an account: `wrangler deploy --dry-run` bundles 151.18 KiB, reads 6 static files and reports the D1 binding.
- `npm run preflight` added as a deployment guard: it refuses the placeholder D1 id, a malformed `_headers`, a missing build, or an un-ignored `.dev.vars`. Verified to fail on the placeholder and pass with a real id.
- **Deployment is blocked on three things only the owner can provide:** `wrangler login`, a production GitHub OAuth app, and explicit approval. Plan: `docs/DEPLOYMENT_PLAN.md`.
- Ordering logic lives in `src/shared/ordering.ts` and is unit tested in isolation (13 cases including clamps, round-trips and invariant sequences).
- Tests run the actual migration SQL through `node:sqlite`, so cascades and constraints are exercised rather than assumed.
- Browser-verified: board rendering, task create/reopen/move/delete; drawer move buttons moved a task within a column and across columns with positions staying contiguous.
- Browser-verified comments: a body containing `<script>` and `<b>` rendered as literal text, nothing executed (COM-003).
- Browser-verified activity: "created", "commented" and "moved" events render newest-first.
- **Not verified by automation:** the drag gesture itself (see gaps).
- Export → total state loss → import restored identical data with foreign keys intact (M2).
- Measured: board view 0.032 ms at 9 tasks, 1.457 ms at 500; auth path ~0.04 ms.
- OpenCode discovers Bob as primary and 15 specialists as subagents.
- `npm audit --omit=dev` reports 0 vulnerabilities.

## Architecture status

Proven running locally:

- Single Worker serving the SPA and `/api/v1`; static assets with `not_found_handling: single-page-application` and `run_worker_first: ["/api/*"]` only.
- Hono router; React 19 + TypeScript strict; Vitest; shared types in `src/shared/`.
- D1 bound and migrated; repository → service → route layering in place. Board administration and task routes share one session middleware (`middleware/session.ts`).
- Human authentication in place behind an `AuthProvider`-style seam: GitHub client, allowlist, session service, auth store interface with a D1 implementation.
- Agent API namespace (M7) still to come; it will reuse the same service layer with the board taken from the token.
- **Not yet verified:** a live GitHub round trip — needs the owner's OAuth app credentials and two GitHub accounts.

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
Remote: `https://github.com/kieronpeters/flowquery` — **private**, branch `main`, pushed. Created 2026-11-03 with the owner's approval. No CI workflow, by the owner's choice (they did not want to consume Actions minutes).

## Known gaps carried to deployment

- **Live sign-in is now verified.** The owner signed in with a real GitHub account on localhost through the full OAuth round trip. This closes the gap that had been open since M3; previously the callback was only exercised with a stubbed provider.
- **Drag-and-drop gesture untested by automation.** Sortable wiring present, behaviour verified through the keyboard move buttons and API tests. Needs a human click-drag.
- **The static `_headers` file is now verified in a production build**: `npm run preview` reports "Parsed 1 valid header rule", and the HTML document returns the full CSP and hardening headers from the asset layer. Not yet exercised on Cloudflare's own network — that is a deployment-time check.
- Real Workers CPU figures only come from a deployed Worker; local tooling exposes duration only.
- Activity writes are best-effort by design.
- Seeded placeholder user (`usr_dev_owner`) must not exist in a production database.
- `design/DESIGN_DIRECTION.md` describes the visual language and lists what was **not** built, so it cannot be mistaken for scope.
- `repository/SETUP_QUESTIONS.md` records what is settled and what still needs the owner.
- `memory/` mirror is neutralised but still present; kept deliberately (Git-tracked, costs nothing, deletion has no functional benefit).
