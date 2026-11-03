# Handoff — 2026-11-03 — M1 repository foundation

**Branch:** `main` (local only; no remote)
**Session:** Bob, the current OpenCode session. No specialist sub-agents were used for M1.
**State:** M1 complete and verified. Awaiting owner approval for M2.

---

## Context for a new session

Read `AGENTS.md`, `MASTER_PROMPT.md`, `docs/MVP_SPECIFICATION.md` and `.flowquery/state/NEXT_ACTION.md` first. The product is a flat board model — no organisations or projects. Zero recurring cost is a hard constraint.

M1 built the foundation only. There are **no product features**: no boards, no tasks, no authentication, no database binding.

## What exists now

| Area | State |
|---|---|
| Git | Initialised on `main`; 3 commits; no remote |
| Worker | Hono app with `GET /api/v1/health` and a JSON 404 fallback |
| SPA | Placeholder screen that calls the health endpoint (removed in M2) |
| Database | Designed in `docs/DATABASE_DESIGN.md`; **not bound, no migration** |
| Auth | Designed, decided (GitHub OAuth); **not implemented** |
| OpenCode | `opencode.jsonc` + 16 agents at `.opencode/agents/`, discovery verified |
| Tests | 2 passing (health 200, unknown API 404) |

## Commands that work

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run typecheck
npm run lint
npm run build
npm run format:check
```

## Verification recorded

All of the following were run and produced the stated results: typecheck pass, lint pass, 2 tests pass, build pass (worker 57.83 kB / client 220.80 kB), format check pass, dev server serving `/` 200 HTML, `/boards/brd_example` 200 HTML, `/api/v1/health` 200 JSON, `/api/v1/does-not-exist` 404 JSON, and `opencode api get /api/agent` listing Bob plus 15 specialists.

## Decisions made during M1 (all in the register)

- `run_worker_first` scoped to `/api/*` only, so page views never consume the request quota (DEC-016).
- Page-route redirects are client-side, because a server redirect would make navigation billable (DEC-017).
- `db:migrate:local` deferred to M2, since a migration without a binding cannot be applied or verified.
- Health endpoint placed in M1 as infrastructure; removed from M2's scope accordingly.
- `opencode/` directory removed after the agents moved; the invalid example config was deleted.

## Known gaps

1. No D1 binding yet — M2 starts here.
2. `design/DESIGN_DIRECTION.md` still describes a richer product than the MVP.
3. `repository/SETUP_QUESTIONS.md` predates the current plan.
4. `memory/` is neutralised but still present.
5. `npm audit` shows 11 moderate findings in the ESLint/minimatch dev chain; production dependencies are clean.

## Next action

Owner review of M1, then approval for M2 only (D1 binding, schema migration, seeds, read-only board, CPU measurement).

Nothing beyond M1 is authorised. No remote repository, deployment or cost has been created.
