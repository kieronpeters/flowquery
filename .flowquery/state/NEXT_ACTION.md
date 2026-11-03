# Next Action

**M5a is complete. One approval needed: M5b.**

## 1. Approve M5b — ordering and movement

This is the last piece of the Kanban experience, and the riskiest code in the project.

- Drag-and-drop between the five columns and within a column (dnd-kit)
- Explicit keyboard move control, so drag-and-drop is never the only way (TASK-008)
- Atomic position renumbering in a single `db.batch()`
- Optimistic updates with `409` reconciliation
- Tests for TASK-007, TASK-008, TASK-009, TASK-012

The concurrency half of TASK-012 already works — `expectedVersion` returns `409` today — so M5b adds the ordering rules and the UI.

## 2. Still outstanding: a live GitHub sign-in

Carried from M3. Five minutes:

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/api/v1/auth/callback`
2. `cp .dev.vars.example .dev.vars` and fill in the client id/secret plus `AUTH_ALLOWLIST="<your id>:Kieron,<friend id>:Friend"`.
3. `npm run db:reset && npm run dev`.

## A recommendation about M5b

Position renumbering is the one place where a bug silently corrupts a board: tasks can vanish from view, or two tasks can claim the same slot. I plan to:

1. Compute the new ordering in the service layer as a pure function, tested independently.
2. Apply it with `db.batch()` so a half-applied reorder cannot exist.
3. Assert in tests that positions are contiguous and unique after every operation.

That is more structure than the rest of the code, and it is deliberate.

## Not in M5b

Comments and activity history (M6), agent API (M7), notifications (dropped).

**Current gate: owner review of M5a.**
