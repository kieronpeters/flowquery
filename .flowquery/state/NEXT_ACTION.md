# Next Action

**Improvements v1 is live.** https://flowquery.workstack.workers.dev — version `153bd20f`, PR #2 merged as `e7cefa0`. Free plans, $0 recurring.

---

## What is running

| | |
|---|---|
| Worker | `flowquery`, Free plan |
| Database | D1 `flowquery-db`, APAC — 2 humans (Kieron, Abdul), 15 AI agents, 1 contractor |
| Agent access | token `Bob` active; `/agent` page for testing a token |
| Cost | $0. No payment method, no paid plan, no domain |

## Verified after this deploy

- Health `200`; CSP present on the document; `/agent` renders; `/auth/start` still redirects to GitHub with the right callback; unauthenticated API `401`.
- The deployed bundle contains the new UI (checked by marker — the UI is client-rendered).
- Migrations 0004–0006 applied; Bob's test task removed through the agent API, its deletion event kept.

## Worth doing next, none urgent

1. **Try the board on your phone.** The touch gestures are the one thing no tool here can verify. Tabs switch columns; a short hold starts a drag; a swipe scrolls.
2. **Add Abdul to `AUTH_ALLOWLIST`** — `github-id:Abdul`, spelled exactly, so his sign-in adopts the pre-created profile instead of creating a second one.
3. **A real backup.** `docs/RUNBOOK.md` has the export procedure; production has no backup beyond Cloudflare's Time Travel window.
4. **The product name.** "FlowQuery" is still a working title, and it is in the URL.

## Rules that have not changed

- Zero recurring cost. No Workers Paid, no paid add-on, no domain, no billing activation without explicit approval.
- No seed against production.
- Bob reaches one board by token; appearance and board administration stay human-only.
