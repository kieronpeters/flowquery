# Next Action

**M3 is complete. Two things are needed from you before M4.**

## 1. Perform a live sign-in test

This is the only part of M3 that could not be verified without your credentials. It takes about five minutes:

1. Create a GitHub OAuth app (Settings → Developer settings → OAuth Apps):
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/api/v1/auth/callback`
2. `cp .dev.vars.example .dev.vars`, then fill in:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `AUTH_ALLOWLIST="<your numeric id>:Kieron,<friend numeric id>:Friend"`
3. `npm run db:reset && npm run dev`
4. Open `http://localhost:5173/boards/brd_demo` → you should be redirected to `/login` → "Continue with GitHub" → back to the board.

Expected: you land on the board, `/api/v1/auth/me` shows your name, sign-out returns you to `/`. If anything fails, the URL will contain `/login?error=…` and I will know exactly which stage rejected it.

## 2. Approve M4

M4 turns `/boards` into a real dashboard:

- `GET /api/v1/boards` (list, newest first)
- `POST /api/v1/boards` (create)
- `PATCH /api/v1/boards/:id` (rename)
- `DELETE /api/v1/boards/:id` with typed-name confirmation and full cascade
- Dashboard UI replacing the placeholder, with create, rename and delete flows
- Landing page behaviour for signed-in users
- Tests for `BOARD-001`…`BOARD-007`, including cascade completeness

## Not in M4

Task editing, drag-and-drop (M5), comments and activity (M6), the agent API (M7).

**Current gate: owner review of M3 and a live sign-in.**
