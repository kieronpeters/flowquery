# Phase Status

**Current phase:** M2 complete — walking skeleton.
**Next gate:** owner approval for M3.
**Last updated:** 2026-11-03.

## Phase history

| Phase | Status | Outcome |
|---|---|---|
| Initial package assembly | Complete | Project pack, team roster, concept images, early research |
| Requirements consolidation (v1) | Complete — superseded | Organisation → project → board hierarchy; never implemented |
| Access-control investigation | Complete — resolved by scope change | Hierarchy removed; authenticated-humans-only chosen |
| Specification consolidation (v2) | Complete 2026-11-03 | Flat board model documented end to end; single decisions register |
| Owner review and approval | Complete 2026-11-03 | AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030 |
| M1 Repository foundation | Complete 2026-11-03 | Git, toolchain, structure, OpenCode agents, smoke test |
| **M2 Walking skeleton** | **Complete 2026-11-03** | D1 schema, seeds, read-only board, CPU measurement, restore drill |
| M3 Human authentication | Not started | Requires owner approval |
| M4–M8 | Not started | — |
| M9 Deployment | Not started | Requires explicit deployment approval |

## M2 completion evidence

| Check | Result |
|---|---|
| `npm run typecheck` | Pass (app + worker projects) |
| `npm run lint` | Pass, no findings |
| `npm test` | **11 tests passed**, 2 files |
| `npm run build` | Pass — worker 69 kB, client 262 kB |
| `npm run format:check` | All files match |
| `npm run db:reset` | Migrated 4 statements, seeded 4 statements |
| D1 row counts | 18 profiles, 1 board, 9 tasks, 1 user |
| `GET /api/v1/boards/brd_demo` | 200, 4.4 KB, five columns, tasks in position order |
| `GET /api/v1/boards/does-not-exist` | 404 JSON |
| `GET /boards/brd_demo` (deep link) | 200 HTML via SPA fallback |
| Export → delete state → import | Data identical; `PRAGMA foreign_key_check` empty |
| `npm run bench` | 0.032 ms at 9 tasks, 1.443 ms at 500 (CPU-bound portion) |

## Explicitly not done

No authentication. No mutations (create/edit/move/delete). No board dashboard. No agent API or tokens. No comments or activity UI. No remote repository. No push. No Cloudflare resource. No deployment. No domain. No paid service.

## Security note carried forward

`GET /api/v1/boards/:boardId` is unauthenticated until M3. Nothing is deployed, and **M3 must complete before any deployment discussion**.
