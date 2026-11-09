# Handoff — 2026-11-10 — Board auto-refresh

## Repository

- Branch: `feature/board-auto-refresh` (deleted after merge)
- Base: `main` at `cdef1e4`
- Released: PR #12 merged as `5fe208e`
- `main` and `origin/main` match
- **Not deployed**

## Completed

- Added `useBoardPolling`, a transport-agnostic polling hook. The board's existing `/api/v1/boards/:id` fetch is unchanged; the hook decides when to call it.
- Polls every five seconds while the board is open and the tab is visible.
- Pauses while the tab is hidden, while dragging a card, during the undoable-delete window, while a write is in flight, and while the ticket drawer is open.
- One request at a time; the next cycle is scheduled after the previous settles. In-flight requests are aborted when polling pauses or the board unmounts.
- On failure, keeps the last good board, shows `Offline — retrying`, and retries on the next cycle.
- Ignores identical board views (`boardSignature`), so an unchanged poll does not re-render the board.
- Added `BoardLiveStatus`, a subtle Live / Updated indicator next to the **Colours** button.
- Documented the behaviour in `docs/user/BOARDS_AND_TASKS.md`.

## SSE readiness

`useBoardPolling` takes a `refresh(signal)` callback. The board does not know whether data is polled or pushed, so a later SSE implementation replaces the transport, not the board.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (**405 tests**, 37 files) and `npm run build` all pass.
- Browser-verified locally on `Agent Bob Test Board`:
  - a ticket created through the API appeared in 3.5 s;
  - an update appeared in 4 s and a delete disappeared in 5 s;
  - `window.__pollMarker` survived, proving no full page reload;
  - the board's horizontal scroll position was preserved;
  - an unsaved drawer draft survived two polling intervals;
  - a hidden tab stopped polling and caught up immediately when visible again.

## Outstanding

- **Deployment is deliberately deferred.** Someone is working on a production board; deploy only when the owner approves and the board is free.
- No migrations are required for this feature.
- The browser check used a local session and the local D1 test board; the test ticket was deleted afterwards.

## Next action

Owner approval to deploy when the production board is free. Run `npm run deploy` from `main`; no migration step is needed.
