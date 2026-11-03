# Handoff — 2026-11-03 — M3 human authentication

**Branch:** `main` (local only; no remote)
**Session:** Bob, the current OpenCode session.
**State:** M3 complete and tested. A live GitHub sign-in has not been performed.

---

## Context for a new session

Read `AGENTS.md`, `MASTER_PROMPT.md`, `docs/SECURITY_AND_AUTH.md` and `.flowquery/state/NEXT_ACTION.md` first. Flat board model; zero recurring cost; authentication is GitHub OAuth with a numeric-id allowlist.

## What exists now

| Area | State |
|---|---|
| Auth | GitHub OAuth + PKCE, allowlist, sessions, sign-out, CSRF guard, rate limiting |
| Sessions | Opaque 256-bit token, SHA-256 at rest, `__Host-fq_session`, 30-day sliding expiry |
| UI | `/login`, `/signup`, `/boards` placeholder, board page redirects when signed out |
| Data | D1 with `0001_init.sql` + `0002_auth_attempts.sql` |
| Tests | 33 passing across 3 files |

## Code map for auth

```text
src/worker/
  env.ts                     Bindings: DB, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, AUTH_ALLOWLIST
  auth/github.ts             OAuth client: PKCE, token exchange, /user, /user/emails
  auth/allowlist.ts          numeric-id allowlist, fail closed
  auth/cookies.ts            __Host- cookies, safe post-login redirect
  routes/auth.ts             start / callback / me / logout
  services/auth.ts           completeSignIn, resolveSession, signOut
  repositories/auth-store.ts interface + D1 implementation (all auth SQL)
```

The `AuthStore` interface exists so the sign-in logic can be tested with an in-memory store (`tests/helpers/auth-fakes.ts`) instead of a database mock. The D1 implementation is the only place auth SQL lives.

## Verification recorded

- `db:reset` applies both migrations.
- Unsigned board read and `/auth/me` → 401.
- `/auth/start` → 302 to GitHub with PKCE S256 and the correct redirect URI; state cookie hardened.
- Browser: signed-out board visit redirects to `/login?next=…`; login and signup pages render with zero console errors.
- 33 tests, including: allowlist rejection creates nothing; state mismatch never calls GitHub; session stored as a hash; expiry deletes the row; sign-out invalidates server-side; cross-origin POST → 403.
- Bench: auth path well under 0.1 ms against a 10 ms budget.

## Deliberate design choices

- **No `/auth/signup` endpoint.** The first allowlisted sign-in creates the user; a second endpoint would be another place to forget the allowlist check.
- **No session signing key.** Sessions are opaque and DB-backed, so revocation is a row delete rather than a key rotation.
- **Missing OAuth config returns 503**, not a broken redirect. Fail visibly.

## Known gaps

1. **Live sign-in unverified** — needs the owner's OAuth app and two GitHub accounts.
2. `/boards` is a placeholder; the dashboard is M4.
3. No mutations yet (M5).
4. Seeded placeholder user `usr_dev_owner` remains until real users exist.
5. `design/` and `repository/` documents remain stale; `memory/` mirror still present.

## Next action

Owner performs a live sign-in test and approves M4 (board CRUD + dashboard). Details in `NEXT_ACTION.md`.

No remote repository, deployment or cost exists.
