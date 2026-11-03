# Agent Activity Log

Significant actions and their verified outcomes. Newest first. Facts only — no hidden reasoning, no secrets.

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
