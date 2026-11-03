# Next Action

**M6 is complete. Three things from you.**

## 1. Two quick manual checks (still outstanding)

**Drag-and-drop.** Open a board and drag a card to another column, and within a column. Automation could not complete a drag gesture; the movement *behaviour* is proven through the keyboard buttons and 113 tests, but the gesture needs a human.

**The live GitHub sign-in.** Carried since M3 and still the biggest gap. Five minutes:

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/api/v1/auth/callback`
2. `cp .dev.vars.example .dev.vars`, fill in client id/secret and `AUTH_ALLOWLIST="<your id>:Kieron,<friend id>:Friend"`.
3. `npm run db:reset && npm run dev`.

## 2. Approve M7 — Bob's agent API

This is the milestone that makes the product do what it was built for: Bob working the backlog through an API instead of a browser.

- `AgentCredential` flow: create a labelled token for a board, shown once, revocable
- Token stored as a SHA-256 hash; `last_used_at`; revocation effective immediately
- `/api/v1/agent/*` namespace: board derived from the token, never from the request
- Reads: board, tasks (with filters), one task, comments, activity
- Writes: create, edit, move, delete tasks; add comments
- OpenAPI 3.1 document served by the app
- Isolation suite: board A's token cannot read or write board B; agent cannot reach human endpoints or board administration
- `FLOWQUERY_API_TOKEN` convention documented for OpenCode

## The security work that matters here

M7 is where two doors meet the same data. The risk is not a clever attacker; it is a forgotten `WHERE board_id = ?` or a route that trusts a board id from the body. So:

1. The agent namespace **cannot** accept a board id from the client — the token *is* the scope.
2. Every agent route is tested against a second board, not just the happy path.
3. The isolation tests run on the real schema, not a fake.

## Not in M7

Notifications (dropped). Deployment (M9, separate approval).

**Current gate: owner review of M6.**
