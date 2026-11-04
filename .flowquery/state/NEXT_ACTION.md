# Next Action

**Improvements v2 is live.** https://flowquery.workstack.workers.dev — version `8bdda078`, PR #3 merged as `0841b3f`. Free plans, $0 recurring.

**Improvements v3 is built and verified, not yet deployed.** Branch `improvements-v3`: uploaded profile pictures and agent tokens chosen by agent. Migration `0009` is applied locally only.

---

## What is running

| | |
|---|---|
| Worker | `flowquery`, Free plan |
| Database | D1 `flowquery-db`, APAC — 2 humans (Kieron, Abdul), 15 AI agents, 1 contractor |
| Agent access | one live token per agent per board; `Bob` active |
| Cost | $0. No payment method, no paid plan, no domain |

## Verified after the v2 deploy

- Health `200`; CSP present on the document; the manifest serves as `application/manifest+json` with three icons; `/about` `200`; `/auth/start` `302`; unauthenticated API `401`.
- Every new UI marker present in the deployed bundle (checked by marker — the UI is client-rendered).
- Migrations 0007 and 0008 applied; `boards.description` and `users.avatar_url` confirmed with `pragma_table_info`.

## Verified for v3, locally

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` — all pass, **332 tests**.
- In a browser against `npm run dev`: an upload resized a 400×300 PNG to 256×256 and stored it; the picture appeared on `/agents` and in the header; Remove picture fell back to initials; the token dropdown listed the 16 agents and omitted the one that already held a token; rotating showed a new plaintext, and the old row moved to "Revoked tokens".
- The rotated token was then used against `/api/v1/agent/board` and `/api/v1/agent/tasks` — both `200`.
- Migration `0009` applied locally: 5 commands, `profile_avatars` created, `agent_tokens.profile_id` backfilled, partial unique index created.

**Not verified:** the OS file-picker itself (the dialog was suppressed so the app's own resize and upload code could run), and the same flows on a phone.

## Worth doing next, none urgent

1. **Deploy v3.** `npx wrangler d1 migrations apply flowquery-db --remote`, then `npm run deploy`. Note that the deploy does not run migrations.
2. **Try the board on your phone.** The touch gestures are the one thing no tool here can verify.
3. **Add Abdul to `AUTH_ALLOWLIST`** — `github-id:Abdul`, spelled exactly, so his sign-in adopts the pre-created profile instead of creating a second one.
4. **A real backup.** `docs/RUNBOOK.md` has the export procedure; production has no backup beyond Cloudflare's Time Travel window.
5. **The product name.** "FlowQuery" is still a working title, and it is in the URL.

## Rules that have not changed
