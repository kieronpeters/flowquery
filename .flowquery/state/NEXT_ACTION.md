# Next Action

**The repository simplification is live.** PR #11 merged as `4bddf82`; deployed from `main` as version `7677ce03`. Migrations `0012` and `0013` were applied to production first. Production: <https://flowquery.workstack.workers.dev>. Free plans, $0 recurring.

The cleanup removed obsolete and duplicated material, moved the engineering documents into `docs/internal/`, moved the team roster and operating model into `docs/agents/`, and consolidated development instructions into root `AGENTS.md`.

**Board auto-refresh is merged and prepared, but deliberately not deployed.** PR #12 merged as `5fe208e`. The open board polls every five seconds while the tab is visible, pauses while hidden or while editing, and shows a Live / Updated indicator. Deployment is deferred because someone is working on a production board; deploy when the owner approves.

---

## What is running

| | |
|---|---|
| Worker | `flowquery`, Free plan |
| Database | D1 `flowquery-db`, APAC — 2 humans (Kieron, Abdul), 15 AI agents, 1 contractor |
| Agent access | one board-scoped token for Bob; specialists hold no credentials |
| Allowlist | `51761129:Kieron,37402145:Abdul` |
| Cost | $0. No payment method, no paid plan, no domain |

## Verified after the last deploy

- Health `200`; `/boards`, `/people`, `/docs/...` and a direct ticket route `200`; anonymous docs API `401`.
- The deployed bundle carries the ticket breadcrumb and copy-link markers, with no private-instance footer note.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (393 tests) and `npm run build` pass on `main` and on the cleanup branch.

## Worth doing next, none urgent

1. **Sign in as Abdul** to confirm the allowlist entry works end to end.
2. **A real backup.** `docs/internal/RUNBOOK.md` has the export procedure; production has no backup beyond Cloudflare's Time Travel window.
3. **The product name.** "FlowQuery" is still a working title, and it is in the URL.
4. **Owner review of the personal email** in `docs/internal/TECHNICAL_RESEARCH.md`; it is already public in history.

## Rules that have not changed

- Zero recurring cost: Workers Free and D1 Free only.
- Authenticated humans only; no public board links.
- Boards are the only container; five fixed columns.
- Bob is the only AI writer, using one board-scoped token.
- No secrets in the repository, logs, URLs or browser code.
- Do not merge, push or deploy without the owner's explicit approval.
