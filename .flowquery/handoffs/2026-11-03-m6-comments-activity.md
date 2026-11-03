# Handoff — 2026-11-03 — M6 comments and activity

**Branch:** `main` (local only; no remote)
**Session:** Bob, the current OpenCode session.
**State:** M6 complete. The human-facing product is feature-complete apart from Bob's API.

---

## Context for a new session

Read `AGENTS.md`, `MASTER_PROMPT.md`, `docs/MVP_SPECIFICATION.md` and `.flowquery/state/NEXT_ACTION.md` first. Flat board model; zero recurring cost; GitHub OAuth; boards, tasks, ordering, comments and activity all work for humans.

## What exists now

| Area | State |
|---|---|
| Boards | List, create, rename, permanent delete with cascade |
| Tasks | CRUD, priority, assignee, due date, detail drawer |
| Ordering | Drag-and-drop, keyboard moves, optimistic updates |
| Comments | Append-only, text-only, attributed |
| Activity | Append-only board feed, newest first, paginated |
| Auth | GitHub OAuth, session-gated |

## Code map for M6

```text
src/worker/repositories/activity.ts   event builder + keyset-paginated feed
src/worker/repositories/comments.ts   insert (batched with activity), board-scoped list
src/worker/services/comments.ts       validation, text-only storage
src/worker/services/activity.ts       limit/before validation, board check
src/worker/services/tasks.ts          activity on create / edit / move / delete
src/worker/routes/comments.ts         GET/POST comments
src/worker/routes/activity.ts         GET activity
src/app/ActivityFeed.tsx              feed with "Load older"
src/app/TaskDrawer.tsx                comments section
```

## Two decisions worth keeping

1. **Activity records what changed, not what it contained.** `task.description_changed` carries an empty payload on purpose. A feed that pastes 20,000 characters is unreadable, and detail is easier to add than noise is to remove.
2. **`task.deleted` is written with `task_id = NULL`.** Referencing the task meant the cascade removed the record of the deletion itself. The board now remembers that a task existed even though the task is gone.

## Trade-off recorded, not hidden

Activity writes are best-effort: a failed insert logs a warning and does not fail the user's action. The alternative — returning 500 after a successful write — would make a working edit look broken and invite a duplicate retry. One missing history row is the lesser harm, and it is stated here rather than discovered later.

## Verification recorded

113 tests. Comment validation and scoping; markup stored and returned verbatim; activity per event type; no event for intra-column reorder; cursor pagination with explicit timestamps; deletion event survival. Browser: a comment containing `<script>` and `<b>` rendered as text with nothing executed, and the feed showed created/commented/moved newest-first.

## Known gaps

1. Live GitHub sign-in unverified (since M3).
2. Drag gesture unverified by automation (since M5b).
3. No agent API or tokens (M7).
4. No task list endpoint with filters (needed for M7).
5. Seeded placeholder user remains until real users exist.

## Next action

Owner approves M7. The agent API is where a forgotten `board_id` becomes a data leak, so the isolation tests run on the real schema against a second board, and the agent namespace never accepts a board id from the client.

No remote repository, deployment or cost exists.
