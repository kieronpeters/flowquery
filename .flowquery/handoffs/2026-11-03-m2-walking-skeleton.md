# Handoff — 2026-11-03 — M2 walking skeleton

**Branch:** `main` (local only; no remote)
**Session:** Bob, the current OpenCode session.
**State:** M2 complete and verified. Awaiting owner approval for M3.

---

## Context for a new session

Read `AGENTS.md`, `MASTER_PROMPT.md`, `docs/MVP_SPECIFICATION.md` and `.flowquery/state/NEXT_ACTION.md` first. Flat board model; zero recurring cost; GitHub OAuth decided but not implemented.

M2 made the application read real data. There is still **no authentication and no way to change anything**.

## What exists now

| Area | State |
|---|---|
| Worker | `/api/v1/health`, `/api/v1/columns`, `/api/v1/boards/:boardId` (read-only) |
| Database | Bound locally, migrated, seeded. 9 tables, 9 indexes |
| Data | 18 profiles, 1 board, 9 tasks, 1 placeholder dev user |
| UI | Router, landing page, board view with five columns. Read-only |
| Auth | **Not implemented.** Board endpoint is temporarily unauthenticated |
| Tests | 11 passing across 2 files |
| Tooling | `db:reset`, `db:seed:local`, `db:migrate:local`, `bench` |

## Commands

```bash
npm install
npm run db:reset   # required before first run
npm run dev        # http://localhost:5173
npm test
npm run typecheck
npm run lint
npm run build
npm run bench
```

## Architecture as built

```text
src/shared/       columns constant + wire types (used by both sides)
src/worker/
  app.ts          routes only: parse, validate, call a service, map to HTTP
  services/       board-view.ts — pure assembleBoardView + thin I/O wrapper
  repositories/   boards.ts — all SQL; every function takes boardId first
  domain/         row types
src/app/          React: App, HomePage, BoardPage
migrations/       0001_init.sql
seeds/            dev.sql
benchmarks/       board-view.ts
```

The layer boundary is real, not aspirational: there is no SQL in `app.ts`, and no business rule in `repositories/`.

## Verification recorded

`db:reset` clean; 18/1/9/1 row counts; board endpoint 200 with correct per-column distribution; 404 for unknown board and unknown API path; SPA deep link 200; export → delete all local state → import restored identical data with an empty `PRAGMA foreign_key_check`; 11 tests; bench 0.032 ms at 9 tasks and 1.443 ms at 500.

## Decisions made during M2

- Status stays an enum on `tasks`; `/columns` is served from a shared constant (DEC-019 confirmed in practice).
- Shared wire types live in `src/shared/` so a contract change breaks both sides at build time.
- Description truncation implemented at 500 characters with an explicit `descriptionTruncated` flag (DEC-025).
- `tsx` added as a dev dependency because Vitest 5 removed its benchmark API.
- `GET /boards/:boardId` returns columns with their tasks inline; the separate `/tasks` endpoints remain for M5.

## Known gaps

1. **No authentication.** The board endpoint is open. M3 must land before any deployment.
2. No mutations — tasks cannot be created, edited, moved or deleted.
3. `/boards` and `/login` do not exist; `/` is a temporary landing page.
4. Seeded placeholder user (`usr_dev_owner`, `.invalid` email) must be removed once real OAuth users exist.
5. Placeholder D1 `database_id` must be replaced at deployment.
6. `design/DESIGN_DIRECTION.md` and `repository/SETUP_QUESTIONS.md` remain stale; `memory/` mirror still present.

## Next action

Owner reviews M2, then approves M3 only. M3 needs the owner to create a GitHub OAuth app and supply two numeric GitHub user IDs — see `NEXT_ACTION.md`.

No remote repository, deployment or cost exists.
