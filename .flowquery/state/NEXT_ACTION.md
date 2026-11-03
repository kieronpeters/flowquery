# Next Action

**M9 is complete. FlowQuery is live at https://flowquery.workstack.workers.dev, on Free plans, costing $0.**

---

## What is running

| | |
|---|---|
| Worker | `flowquery`, Free plan, `6e50f85b` → `41cb7410` after the health fix |
| Database | D1 `flowquery-db`, APAC, empty at migration, now holding the owner's first board |
| Auth | GitHub OAuth app "FlowQuery", allowlist on numeric ids |
| Cost | $0. No payment method, no paid plan, no domain |

## Verified after deploy

- Health `200` with version `0.0.0-m8`.
- CSP and security headers present on the static document — the check that could not be made locally.
- Unauthenticated API `401`; `/auth/start` redirects to GitHub with PKCE `S256`.
- Callback without a code fails cleanly (`302 /login?error=state`), no 500.
- Real sign-in: 1 user, 1 identity, 1 session (30 days) in the remote database.
- A board, a task, a priority change, three moves and a comment all persisted, with six activity events.
- A redeploy preserved every row.

## Still worth doing, none of it urgent

1. **Confirm the plan in the dashboard.** Workers & Pages → `flowquery`: should read Free, with no billing method attached. Only you can see that.
2. **Second administrator.** They are not yet signed in on production. When they are, `users` should reach 2 — a quick way to confirm the allowlist entry for them is right.
3. **Agent token round trip on production.** Create a token in the UI, call `/api/v1/agent/board` with it, revoke it, confirm `401`. Done locally in M8; not yet against the live Worker.
4. **A real backup.** `docs/RUNBOOK.md` has the export procedure; the production database has no backup beyond Cloudflare's Time Travel window yet.
5. **The product name.** "FlowQuery" is still a working title, and it is now in a URL.

## Rules that have not changed

- Zero recurring cost. No Workers Paid, no paid add-on, no domain, no billing activation without explicit approval.
- No seed against production. The demo data exists only locally.
- Bob reaches one board by token; appearance and board administration stay human-only.
