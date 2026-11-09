# Next Action

**Repository simplification is on branch `refactor/repository-simplification`, awaiting owner review.** It is not pushed, merged or deployed.

The live release is the Bob operating model and direct ticket links: PR #10 merged as `10aa71a`, deployed from `main` as version `d3d09443`. Production: <https://flowquery.workstack.workers.dev>. Free plans, $0 recurring.

The cleanup branch removes obsolete and duplicated material, moves the engineering documents into `docs/internal/`, moves the team roster and operating model into `docs/agents/`, and consolidates development instructions into root `AGENTS.md`. It adds migrations `0012` (clear legacy avatar paths) and `0013` (correct Bob's profile text); neither has been applied to production.

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

1. **Review the cleanup branch** and decide whether to merge and deploy it.
2. **Apply migrations `0012` and `0013`** to production before or with the next deploy.
3. **Sign in as Abdul** to confirm the allowlist entry works end to end.
4. **A real backup.** `docs/internal/RUNBOOK.md` has the export procedure; production has no backup beyond Cloudflare's Time Travel window.
5. **The product name.** "FlowQuery" is still a working title, and it is in the URL.

## Rules that have not changed

- Zero recurring cost: Workers Free and D1 Free only.
- Authenticated humans only; no public board links.
- Boards are the only container; five fixed columns.
- Bob is the only AI writer, using one board-scoped token.
- No secrets in the repository, logs, URLs or browser code.
- Do not merge, push or deploy without the owner's explicit approval.
