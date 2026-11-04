# Next Action

**Improvements v3 is live.** https://flowquery.workstack.workers.dev — version `11046318`, PR #4 merged as `7ebf06a`. Free plans, $0 recurring.

---

## What is running

| | |
|---|---|
| Worker | `flowquery`, Free plan |
| Database | D1 `flowquery-db`, APAC — 2 humans (Kieron, Abdul), 15 AI agents, 1 contractor |
| Agent access | one live token per agent per board; `Bob` active and linked to `prf_bob` |
| Pictures | uploaded ones in `profile_avatars`; drawn avatars for agents |
| Cost | $0. No payment method, no paid plan, no domain |

## Verified after the v3 deploy

- Migration `0009` applied **before** the deploy; `profile_avatars` and `idx_tokens_one_live_per_profile` both present, and Bob's token backfilled to `prf_bob`.
- Health `200`; CSP present; `/about` `200`; `/auth/start` `302`.
- Anonymous `401` on `/avatars/prf_bob`, `/profiles` and `/boards`.
- An agent token gets `401` on a picture and `404` trying to issue a token; `/agent/board` and `/agent/tasks` still `200`.
- Every new UI marker present in the deployed bundle.

**Not verified:** the OS file-picker itself, and any of the picture or token flows on a phone.

## Worth doing next, none urgent

1. **Try the board on your phone.** Touch gestures, plus the new picture upload from a phone camera roll, are the things no tool here can verify.
2. **Add Abdul to `AUTH_ALLOWLIST`** — `github-id:Abdul`, spelled exactly, so his sign-in adopts the pre-created profile instead of creating a second one.
3. **A real backup.** `docs/RUNBOOK.md` has the export procedure; production has no backup beyond Cloudflare's Time Travel window.
4. **The product name.** "FlowQuery" is still a working title, and it is in the URL.

## Rules that have not changed
