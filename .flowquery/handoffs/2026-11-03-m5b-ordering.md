# Handoff — 2026-11-03 — M5b ordering and drag-and-drop

**Branch:** `main` (local only; no remote)
**Session:** Bob, the current OpenCode session.
**State:** M5 complete (M5a task CRUD + M5b ordering). One unverified gesture: an actual drag.

---

## Context for a new session

Read `AGENTS.md`, `MASTER_PROMPT.md`, `docs/MVP_SPECIFICATION.md` and `.flowquery/state/NEXT_ACTION.md` first. Flat board model; zero recurring cost; GitHub OAuth; boards and tasks fully editable with drag-and-drop.

## What exists now

| Area | State |
|---|---|
| Boards | List, create, rename, permanent delete with cascade |
| Tasks | Create, read, update, delete; priority, assignee, due date, detail drawer |
| Ordering | Drag-and-drop between and within columns; keyboard alternative; optimistic updates |
| Concurrency | `expectedVersion` on edit and move → `409` |
| Auth | GitHub OAuth, session-gated |

## Code map for ordering

```text
src/shared/ordering.ts        moveWithin, positionsFor, isContiguous (pure, shared)
src/worker/repositories/tasks.ts  listColumnTaskIds, guardedMove, renumberColumn
src/worker/services/tasks.ts  moveTask: guarded update first, then renumber
src/worker/routes/tasks.ts    POST .../move
src/app/board-state.ts        applyMove (optimistic), locate
src/app/BoardPage.tsx         DndContext, sortable columns and cards
src/app/TaskDrawer.tsx        ← → ↑ ↓ move controls
tests/ordering.test.ts        13 pure cases
tests/move.test.ts            10 API cases against real SQL
```

## The ordering rule, stated once

`position` is the final index in the target column. `moveWithin(ids, id, index)` removes the item, clamps the index, and reinserts — used by both the server and the optimistic client so they cannot disagree about the arithmetic.

Server sequence: version-guarded update **first** (so a stale client changes nothing), then a full idempotent renumber of both affected columns.

## Verification recorded

92 tests. Ordering unit tests cover clamping, round-trips, no duplication and invariants across a move sequence. API tests cover reorder, cross-column, append-beyond-end, six-move contiguity, stale version, invalid index, wrong board, unauthenticated. Browser: drawer ↓ reordered a column (API-confirmed positions 0/1/2); drawer → moved a task to the end of To Do and the drawer reloaded with the new status and version.

## What is NOT verified

**The drag gesture itself.** Synthetic pointer events cannot drive dnd-kit (it uses pointer capture), and automated key events announced a pickup but never completed a drop. The sortable attributes (`aria-roledescription="sortable"`, `DndDescribedBy`) and the `DndLiveRegion` are present, so the wiring is mounted — but a human click-drag is required. Recorded in `NEXT_ACTION.md`, the README and `PHASE_STATUS.md`.

Do not quietly mark this verified in a later session. Either a human confirms it, or it stays open.

## Known gaps

1. Live GitHub sign-in unverified (since M3).
2. Drag gesture unverified (above).
3. No comments or activity UI (M6).
4. No task list endpoint with filters (M7).
5. Seeded placeholder user remains until real users exist.

## Next action

Owner approves M6 (comments and activity). The plan: record what changed and by whom with a small structured payload, not a field-by-field diff — adding detail later is easy, removing it is not.

No remote repository, deployment or cost exists.
