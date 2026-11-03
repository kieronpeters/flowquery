# Next Action

**M4 is complete. Two things from you: a live sign-in, and approval for M5.**

## 1. Still outstanding: a live GitHub sign-in

Carried forward from M3. It is the only part of the system that has never talked to a real provider.

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/api/v1/auth/callback`
2. `cp .dev.vars.example .dev.vars`, then fill in `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `AUTH_ALLOWLIST="<your id>:Kieron,<friend id>:Friend"`.
3. `npm run db:reset && npm run dev`, then open `http://localhost:5173/boards`.

You should land on the dashboard, create a board, and see it persist.

## 2. Approve M5 — Kanban and tasks

This is the milestone where FlowQuery becomes a real Kanban tool.

- Task create, edit and delete; priority, assignee profile, due date
- Move between the five fixed columns and reorder within a column
- Drag-and-drop with dnd-kit, plus an explicit keyboard path (TASK-008)
- Optimistic updates with `409` reconciliation and `expectedVersion`
- Task detail panel with the full description
- Tests for `TASK-001`…`TASK-013`, including ordering and concurrency

## A note on M5's size

M5 is the largest milestone so far — it is where most of the product's complexity lives. If you prefer smaller steps, I can split it: **M5a** (task CRUD, priority, assignee, due date, detail panel) and **M5b** (drag-and-drop, reordering, keyboard move, concurrency). I would recommend the split; it keeps each review short and puts the risky ordering logic in its own change.

## Not in M5

Comments and activity history (M6), agent API and tokens (M7), notifications (dropped).

**Current gate: owner review of M4.**
