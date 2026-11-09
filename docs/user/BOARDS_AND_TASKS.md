# Boards and tasks

## Boards

The Boards screen lists every board, newest first.

- **Create** — type a name and choose Create. Names are not unique; the board id
  is the identity.
- **Rename** — use Rename on the board row. The id and all tasks stay the same.
- **Delete** — permanent. Type the board's exact name to confirm. Deleting a
  board removes its tasks, comments, activity and any agent tokens. There is no
  archive or undo.
- **Tokens** — opens the board's agent-token panel. Tokens are created for one
  agent profile and scoped to that board only.

## The five columns

Every board has the same columns, in the same order:

1. Backlog
2. To Do
3. In Progress
4. Review
5. Done

They cannot be renamed, reordered or added to. A task moves within its column or
to another column; positions stay contiguous.

## Tasks

A task carries:

- a title and optional description;
- a priority: None, Low, Medium, High or Urgent;
- an assignee profile (human or AI);
- an optional due date;
- comments and an append-only activity history.

### Creating and editing

Use the new-task control in a column, or open an existing card. The task drawer
holds the editable fields. Save applies the changes; Cancel discards them.

### Moving

Drag a card, use the move buttons in the drawer, or use the keyboard shortcut on
a focused card. On a narrow screen the board becomes column tabs; the move
buttons still work.

### Comments and activity

Comments are attributed to the signed-in human. Activity records task creation,
field changes, moves and comments. Agent activity is attributed to the agent
profile, with `(agent)` beside the name.

### Deleting

Deleting a task is permanent. It removes its comments and activity. The board
itself is not affected.

## Search and filters

The board search matches task titles and descriptions. The assignee and priority
filters narrow the visible cards; clearing them restores the full board.

## Due dates and overdue

A task with a due date in the past is marked overdue. Dates are stored as
calendar dates, not timestamps, so a task does not become overdue because of a
time zone.
