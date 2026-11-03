# Next Action

**M5 is complete. Two things from you before M6.**

## 1. Ten seconds of manual checking

Two things automation could not verify:

**Drag-and-drop.** Open a board and drag a card to another column, and drag one within its column. It should move immediately and stay put. The move logic itself is verified — an API call, a pure ordering function with 13 tests, and the drawer's move buttons all pass — but the drag gesture needs a human.

**The live GitHub sign-in.** Carried since M3, and now blocking any realistic use of the app. Five minutes:

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/api/v1/auth/callback`
2. `cp .dev.vars.example .dev.vars`, fill in client id/secret and `AUTH_ALLOWLIST="<your id>:Kieron,<friend id>:Friend"`.
3. `npm run db:reset && npm run dev`.

## 2. Approve M6 — comments and activity

- Comments per task: add, list, attributed to the acting human or Bob
- Append-only activity: created, edited, moved, assigned, reprioritised, commented, deleted
- Board-level activity feed, newest first, paginated
- Comment body rendered as text, never HTML
- Tests for COM-001…003 and ACT-001…004

## A caution about M6

Activity is the one place where "helpful" enrichment becomes a liability: once you start recording diffs of every field, the payload grows and the history becomes noisy. I plan to record **what changed and by whom**, with a small structured payload (`from`/`to`), and nothing else. If the history later feels thin, adding detail is easy; removing it is not.

## Not in M6

The agent API (M7), notifications (dropped), per-user preferences.

**Current gate: owner review of M5.**
