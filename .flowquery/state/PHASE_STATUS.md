# Phase Status

**Current phase:** M5a complete — task management (CRUD, detail panel, concurrency).
**Next gate:** owner approval for M5b (ordering, drag-and-drop, keyboard move).
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
| **M5a Task management** | **Complete 2026-11-03** | Task CRUD, detail drawer, validation, optimistic concurrency |
| M5b Ordering and drag-and-drop | Not started | Requires owner approval |
| M6–M8 | Not started | — |
| M9 Deployment | Not started | Requires explicit deployment approval |

## M5a completion evidence

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, no findings |
| `npm test` | **64 tests passed**, 5 files |
| `npm run build` | Pass — worker 78 kB, client 278 kB |
| Create with defaults | `201`, status backlog, position appended, version 1 |
| Create into a chosen column | `201`, lands in that column |
| Title/description/priority/status/date/assignee validation | 9 invalid cases → `400` with the offending field identified |
| Full description | Single-task read returns 900 characters; board view truncates to 500 and flags it |
| Cross-board task read | `404` |
| Update | Fields applied, version incremented to 2 |
| Clear assignee/due date | Both accept `null` |
| Status change | Moves to the end of the target column (position recomputed) |
| Stale `expectedVersion` | `409`, and the task is unchanged |
| Delete | `204`, task gone, its comments cascade |
| `GET /profiles` | 18 profiles; `401` without a session |
| Browser | Drawer create → card appears; reopen shows every saved field; column change moves the card; two-step delete removes it; zero console errors |

## Design note

The task drawer is one component for both create and edit, so the fields and validation cannot drift apart. A status change is treated as "status + position" together, which is why a move can never leave a position pointing into a column the task no longer occupies.

## Explicitly not done

No drag-and-drop, no intra-column reordering, no keyboard move control. No comments or activity UI. No agent API or tokens. No remote repository, deployment or cost.
