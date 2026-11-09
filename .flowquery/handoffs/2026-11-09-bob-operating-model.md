# Handoff — 2026-11-09 — Bob operating model and ticket links

## Repository

- Branch: `feature/bob-manager-operating-model` (deleted after merge)
- Base: `main` at `2354cd4`
- Released: PR #10 merged as `10aa71a`; deployed from `main` as version `d3d09443`
- `main` and `origin/main` match

## Completed

- **Bob operating model:** the universal prompt, `docs/agents/AI_AGENT_ENTRYPOINT.md`, `docs/agents/AGENT_OPERATING_MODEL.md`, `docs/agents/TEAM_DIRECTORY.md`, `.opencode/agents/bob.md`, `AGENTS.md`, project brief, MVP specification, decisions and implementation guide now describe Bob as the running AI manager, independent of OpenCode or any other tool.
- **Token model:** one board-scoped token for Bob is the recommended default; multiple tokens and configurable permissions remain supported. Specialists are delegated through Bob and hold no credentials. Labels are descriptive, never identity.
- **Ticket links:** `/boards/:boardId/tickets/:ticketId` opens the task drawer. The URL is the source of truth; refresh and back/forward work; an unknown id shows a not-found message. Board and ticket ids were already opaque `brd_`/`tsk_` values from 16 random bytes, so no migration was needed.
- **Card and drawer links:** board card titles are real links to the ticket URL, so they can be copied or opened in a new tab. The drawer header is a `Task › title` breadcrumb; the title links to the ticket, updates live as the title is edited, and stays linked after save. Saving an existing ticket keeps the drawer open; creating one still closes it. A Copy ticket link button with a clipboard-denied fallback was added.
- **Drawer cleanup:** the four move arrows were removed; dragging, in-column ordering and the Status selector remain. The footer's private-instance note was removed.
- **Tests:** added direct-URL, invalid-ticket, unauthenticated direct-link, prompt, opaque-id, card-link, copy-link and breadcrumb tests.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` all pass — **393 tests**, 35 files.
- Manual browser test on `Agent Bob Test Board` (`brd_WJX7KBV7YMD26548FS790KSZE0`): five tasks across all columns; direct ticket URL; refresh; back/forward; invalid route; comment; move; activity.
- Bob's token added a comment and moved a ticket; activity showed Bob as the actor; the token was revoked.

## Test board left for review

`Agent Bob Test Board` remains in local D1 with five sample tickets. Do not delete it automatically.

## Outstanding

- Mobile-width visual verification was limited to the responsive CSS; no physical phone test.
- Post-deploy checks passed: health `200`, `/boards`, `/people`, `/docs/...` and a direct ticket route `200`, anonymous docs API `401`, and the deployed bundle carries the breadcrumb and copy-link markers with no footer note.

## Next action

Owner review of the test board. The release is complete; no further action is required for this phase.
