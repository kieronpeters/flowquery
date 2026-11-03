# Next Action

**M2 is complete. Waiting on the owner to review it and approve M3.**

## What I need from you

1. **Look at it.** `npm run db:reset`, then `npm run dev`, then open `http://localhost:5173`. You should see the demo board with nine tasks across five columns.
2. **Confirm M2 is acceptable**, then **approve M3 only** (human authentication).

## Prerequisites for M3 that only you can supply

M3 implements GitHub OAuth, so it needs real credentials and identities:

| Item | What it is | Cost |
|---|---|---|
| GitHub OAuth app | Created by you at GitHub → Settings → Developer settings → OAuth Apps. Callback URL: `http://localhost:5173/api/v1/auth/callback` | Free |
| Client ID and secret | From that app. The secret goes in `.dev.vars`, never in Git | Free |
| Your GitHub numeric user ID | The `id` field from `https://api.github.com/users/<your-username>` | Free |
| Your friend's GitHub numeric user ID | Same method | Free |

I will not ask you for a password, and no payment details are involved anywhere in this milestone.

## If M3 is approved, it will do

- `AuthProvider` seam with a GitHub implementation: `/auth/start`, `/auth/callback`, `/auth/logout`, `/auth/me`.
- Server-side allowlist keyed on immutable numeric IDs (DEC-031); non-listed identities get `403` and no session.
- `sessions` table, `__Host-` cookie, 30-day expiry with idle refresh, sign-out invalidating the row.
- Origin check on mutating requests; login rate limiting.
- `/login` and `/signup` pages; `/boards` requires a session; the board read endpoint becomes authenticated.
- Tests for `AUTH-001`…`AUTH-011`, including a non-allow-listed identity and an expired session.
- Measured CPU cost of the callback against the 10 ms budget.

## Not in M3

Board creation and the dashboard (M4), task mutations (M5), comments and activity (M6), the agent API (M7).

**Current gate: owner review of M2.**
