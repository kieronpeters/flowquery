# Phase Status

**Current phase:** M5 complete — Kanban board, tasks, ordering and drag-and-drop.
**Next gate:** owner approval for M6 (comments and activity).
**Last updated:** 2026-11-03.

## Phase history

| Phase | Status | Outcome |
|---|---|---|
| Initial package assembly | Complete | Project pack, team roster, concept images, early research |
| Requirements consolidation (v1) | Complete — superseded | Organisation → project → board hierarchy; never implemented |
| Access-control investigation | Complete — resolved by scope change | Hierarchy removed; authenticated-humans-only chosen |
| Specification consolidation (v2) | Complete 2026-11-03 | Flat board model; single decisions register |
| Owner review and approval | Complete 2026-11-03 | AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030 |
| M1 Repository foundation | Complete | Git, toolchain, structure, OpenCode agents, smoke test |
| M2 Walking skeleton | Complete | D1 schema, seeds, read-only board, CPU measurement, restore drill |
| M3 Human authentication | Complete | GitHub OAuth + PKCE, allowlist, sessions, CSRF, rate limiting |
| M4 Boards and dashboard | Complete | Board list, create, rename, permanent delete with cascade |
| M5a Task management | Complete | Task CRUD, detail drawer, validation, concurrency |
| **M5b Ordering and drag-and-drop** | **Complete 2026-11-03** | Move endpoint, pure ordering, dnd-kit, keyboard alternative |
| M6 Comments and activity | Not started | Requires owner approval |
| M7–M8 | Not started | — |
| M9 Deployment | Not started | Requires explicit deployment approval |

## M5b completion evidence

| Check | Result |
|---|---|
| `npm run typecheck` / `lint` / `build` | Pass |
| `npm test` | **92 tests passed**, 7 files |
| Ordering unit tests | 13 cases: move up/down/start/end, clamping, no-op, empty column, no duplication, round-trip, invariants over a move sequence |
| Reorder within a column | Positions become the expected order; both DOM and API agree |
| Cross-column move | Lands at the requested index; source column closes the gap |
| Move beyond the end | Appends |
| Sequence of six moves | Positions stay unique and contiguous; task count unchanged at 9 |
| Stale `expectedVersion` on move | `409`, nothing moved |
| Invalid status or index | `400` |
| Wrong board | `404`, task unmoved |
| Unauthenticated move | `401` |
| Browser: drawer move down | Order changed, positions 0/1/2 contiguous, confirmed via API |
| Browser: drawer move to next column | Landed at the end of To Do, drawer reloaded to the new status, version incremented |
| Browser: drag-and-drop gesture | **Not completed by automation** — sortable attributes and live region present, but synthetic pointer events cannot drive dnd-kit's pointer capture, and automated key events announced a pickup without a completed drop |

## Design note

The move applies a version-guarded update **first**, then renumbers both affected columns. If the guard fails, nothing else is touched. The renumber writes explicit positions for the whole column and is idempotent, so a retry repairs rather than compounds an inconsistency.

## Explicitly not done

No comments or activity UI. No agent API or tokens. No notifications. No remote repository, deployment or cost.
