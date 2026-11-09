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
  agent profile and scoped to that board only. The recommended setup is one
  token for Bob; specialists are delegated work through Bob and do not need
  tokens.

## The five columns

Every board has the same columns, in the same order:

1. Backlog
2. To Do
3. In Progress
4. Review
5. Done

They cannot be renamed, reordered or added to. A task moves within its column or
to another column; positions stay contiguous.

### How the columns are used

- **Backlog** — identified work, not yet prioritised.
- **To Do** — approved and prioritised, ready to start.
- **In Progress** — actively being worked by the assignee.
- **Review** — finished by the assignee and awaiting review or verification.
- **Done** — accepted as complete.

Bob grooms the Backlog, moves approved work into To Do, and checks specialist
workload before assigning. The default is one active task per specialist; this
is an operating guideline, not an application restriction.

## Tasks

A task carries:

- a title and optional description;
- a priority: None, Low, Medium, High or Urgent;
- an assignee profile (human or AI);
- an optional due date;
- comments and an append-only activity history.

### Creating and editing

Use the new-task control in a column, or open an existing card. The card title is
a real link to the ticket URL, so it can be opened in a new tab or copied like
any other link. The task drawer holds the editable fields. Its header shows
**Task › ticket title**, with the title linked to the ticket URL. Saving an
existing ticket keeps the drawer open and updates that title; creating a new
task closes it. Save applies the changes; Cancel discards them.

### Moving

Drag a card, or use the **Status** selector in the drawer to move it between
columns. On a narrow screen the board becomes column tabs; dragging still works
within and between columns.

### Comments and activity

Comments are attributed to the signed-in human. When Bob records a specialist's
report, the actor is Bob; the comment can say that Alex completed the work, but
the history must not pretend Alex authenticated. Activity records task creation,
field changes, moves and comments. Agent activity is attributed to the agent
profile, with `(agent)` beside the name.

### Deleting

Deleting a task is permanent. It removes its comments and activity. The board
itself is not affected.

### Direct ticket links

Every ticket has a stable URL:

```text
/boards/{boardId}/tickets/{ticketId}
```

Opening a card puts that URL in the address bar, so you can copy it into a
comment or another ticket. The ticket sidebar also has a **Copy ticket link**
button; if the browser blocks the clipboard, the URL appears in a read-only
field for manual copying. Refresh and browser back/forward keep the same
ticket. A ticket id that is not on the board shows a not-found message on the
board; the URL is never authentication, so the board still requires your
session.

Board ids (`brd_…`) and ticket ids (`tsk_…`) are opaque and non-sequential.

## Live updates

While a board is open, FlowQuery refreshes it in the background every five
seconds. Cards created, edited, moved or deleted by Bob or another administrator
appear without a browser refresh. The **Live** / **Updated** line next to the
**Colours** button shows the last successful refresh.

- Polling pauses while the tab is in the background, while you are dragging a
  card, during an undoable delete, and while the ticket sidebar is open, so a
  refresh cannot overwrite unsaved edits.
- If a refresh fails, the board stays as it was, the line changes to
  **Offline — retrying**, and the next cycle tries again.
- Scroll position and filters are kept across a refresh.

## Search and filters

The board search matches task titles and descriptions. The assignee and priority
filters narrow the visible cards; clearing them restores the full board.

## Due dates and overdue

A task with a due date in the past is marked overdue. Dates are stored as
calendar dates, not timestamps, so a task does not become overdue because of a
time zone.
