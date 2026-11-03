# Phase Status

**Current phase:** M4 complete — board management and dashboard.
**Next gate:** owner review of M4.
**Last updated:** 2026-11-03.

## Phase history

| Phase | Status | Outcome |
|---|---|---|
| Initial package assembly | Complete | Project pack, team roster, concept images, early research |
| Requirements consolidation (v1) | Complete — superseded | Organisation → project → board hierarchy; never implemented |
| Access-control investigation | Complete — resolved by scope change | Hierarchy removed; authenticated-humans-only chosen |
| Specification consolidation (v2) | Complete 2026-11-03 | Flat board model; single decisions register |
| Owner review and approval | Complete 2026-11-03 | AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030 |
| M1 Repository foundation | Complete 2026-11-03 | Git, toolchain, structure, OpenCode agents, smoke test |
| M2 Walking skeleton | Complete 2026-11-03 | D1 schema, seeds, read-only board, CPU measurement, restore drill |
| M3 Human authentication | Complete 2026-11-03 | GitHub OAuth + PKCE, allowlist, sessions, CSRF, rate limiting |
| **M4 Boards and dashboard** | **Complete 2026-11-03** | Board list, create, rename, permanent delete with cascade; dashboard UI |
| M5 Kanban and tasks | Not started | Requires owner approval |
| M6–M8 | Not started | — |
| M9 Deployment | Not started | Requires explicit deployment approval |

## M4 completion evidence

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, no findings |
| `npm test` | **46 tests passed**, 4 files |
| `npm run build` | Pass — worker 73 kB, client 272 kB |
| `GET /api/v1/boards` signed out | `401` |
| Create | `201`, server-generated `brd_…` id, appears in the list, taskCount 0 |
| Validation | empty, whitespace, non-string and 121-character names all `400` |
| Rename | `200`; id unchanged; all 9 tasks still present |
| Delete, wrong name | `409`, board and all 9 tasks still present |
| Delete, no confirmation | `409`, nothing deleted |
| Delete, exact name | `204`; board, tasks, comments, activity and tokens all removed in the same operation |
| Unrelated data after delete | 18 profiles and both users untouched |
| Cross-origin delete | `403`, nothing deleted |
| Real-schema tests | Run against `node:sqlite` with the actual migrations, foreign keys enabled |
| Browser: dashboard | Renders boards with task counts; create, rename and typed-name delete all worked; zero console errors |

## Design note

The delete test attaches a comment, an activity event and an agent token to the board, deletes it, and asserts every one is gone while the profiles and users survive. That is BOARD-005 proven against a real database rather than assumed from an `ON DELETE CASCADE` clause.

## Explicitly not done

No task mutations, no drag-and-drop, no comments or activity UI, no agent API or tokens, no remote repository, no push, no Cloudflare resource, no deployment, no domain, no paid service.
