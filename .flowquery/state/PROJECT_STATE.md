# FlowQuery Project State

**Application:** FlowQuery (working name; clearance not pursued)
**Primary coordinator:** Bob — the current OpenCode session
**Current phase:** M0 — specification consolidated, awaiting owner approval
**Implementation authorised:** No
**Git repository:** Not created (local or remote)
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
- **Specialist agents** (Alex, Sarah, Olivia, Daniel, Marcus, James, Victoria, Chris, Emma, Liam, Priya, Ethan, Rebecca, Noah, contractor) are **assignee profiles only** — never accounts, never credentials.
- **Routes:** `/`, `/login`, `/signup`, `/agent`, `/boards`, `/boards/:boardId`.
- **Zero recurring cost is a firm requirement.** Workers Free + D1 Free, `*.workers.dev` address, no domain.

Full scope: `docs/MVP_SPECIFICATION.md`. That document contains the authoritative list of superseded assumptions.

## Architecture status

Proposed and documented, not validated by a running system:

- React 19 + TypeScript (strict), Vite, React Router, TanStack Query, Tailwind, dnd-kit.
- Hono router on a single Cloudflare Worker serving both the SPA and `/api/v1`.
- D1 with plain SQL, no ORM; migrations via `wrangler d1 migrations`.
- Static assets with `not_found_handling: single-page-application` and `run_worker_first: ["/api/*"]` only, so page loads never consume the request budget.
- Two API namespaces: human session routes and `/api/v1/agent/*` token routes, sharing one service layer.

Details: `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/API_SPECIFICATION.md`.

## Decisions in force

Approved by the owner on 2026-11-03 (product direction): flat board model; two equal human administrators; restricted registration; five fixed columns; permanent board deletion; board-scoped revocable tokens with labels; Bob as sole AI writer with task-level permissions only; zero recurring cost; React/TypeScript on Cloudflare Workers + D1 + static assets; GitHub source control; `*.workers.dev` acceptable.

Proposed by Bob, awaiting approval: authentication mechanism, notifications scope, status-as-enum schema, token format, optimistic concurrency, no-ORM, Hono.

Register: `docs/DECISIONS.md`.

## Open decisions

| ID | Question | Blocks |
|---|---|---|
| AUTH-01 | Human authentication mechanism within 10 ms CPU and zero cost | M3 |
| AUTH-02 | Whether requiring a GitHub account for both humans is acceptable | AUTH-01 |
| SCOPE-01 | Whether the in-app notification centre is still wanted | Nothing; affects scope only |

## Verified state

- Documentation consolidated 2026-11-03: the full documentation set in `docs/` rewritten or marked superseded, with a single decisions register.
- `.flowquery/` rewritten to the new direction; Bob's identity corrected to "this session".
- A stale `memory/` mirror exists and is explicitly not authoritative. Candidate for removal once Git exists.
- OpenCode agent definitions remain in `opencode/agents/` and are **not active** — OpenCode V2 discovers `.opencode/agents/`. Activation is deferred to M1 (one directory move) because no Git history exists to protect the originals yet.
- No application code, dependencies, migrations, repositories, cloud resources or deployments exist.

## Platform facts relied on

Verified 2026-11-03 against `developers.cloudflare.com`; see `docs/TECHNICAL_RESEARCH.md` for sources and dates.

- Workers Free: 100,000 requests/day, **10 ms CPU**/request, 50 subrequests, 128 MB.
- Static asset requests are **free and unlimited**.
- D1 Free: 5,000,000 rows read/day, 100,000 rows written/day, 5 GB storage, 10 databases, **500 MB per database**, Time Travel 7 days.
- D1 foreign keys are enforced by default; `batch()` is transactional and counts as one query.
- Cloudflare has **no hard spending cap**; budget alerts are informational only.
- Measured locally: PBKDF2-SHA256 at 100,000 iterations ≈ 26 ms CPU — 2.6× the entire free-tier budget, which is why passwords are excluded.

## Repository

Local path: `C:\Users\Asus\source\repos\FlowQuery` (confirmed in use; the earlier preferred path `C:\repos\flowquery` does not exist).
Git: not initialised. First commit deferred to M1 pending owner approval.
