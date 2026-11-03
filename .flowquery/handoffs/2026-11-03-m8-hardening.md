# Handoff — 2026-11-03 — M8 hardening

**Branch:** `main` (local only; no remote)
**Session:** Bob, the current OpenCode session.
**State:** M8 complete. The build is finished. Deployment is the only milestone left.

---

## Context for a new session

Read `AGENTS.md`, `MASTER_PROMPT.md`, `docs/MVP_SPECIFICATION.md` and `.flowquery/state/NEXT_ACTION.md` first. Flat board model; zero recurring cost; two doors; nothing deployed.

## What was done in M8

| Area | Change |
|---|---|
| Headers | Security middleware for API responses; `public/_headers` for the static document |
| Drift guard | A test that compares the two policies |
| Traceability | `X-Request-Id` on every response; echoed in 404 and 500 bodies |
| Errors | `onError` logs the detail and returns a generic 500 |
| Rate limiting | Callback checks the limit before contacting GitHub |
| Performance | Agent task list added to the benchmark |
| Documentation | `docs/SECURITY_REVIEW.md`, `docs/RUNBOOK.md` |

## The finding worth carrying forward

**Static assets never invoke the Worker.** With `run_worker_first` scoped to `/api/*` (a deliberate choice to keep page views free), the HTML document is served by Cloudflare's asset layer. Middleware in `app.ts` therefore cannot set headers on it. Without `public/_headers`, the SPA would have shipped with no CSP while the code looked correct.

Any future header or redirect for page routes has the same constraint: it must live in `_headers` or `_redirects`, not in Worker middleware.

## Verification recorded

149 tests. Headers asserted on API responses; the `_headers` policy compared to the Worker constant; strict CSP verified not to break the dev app (9 cards, zero console errors); restore drill repeated on the final schema with an agent token surviving; error bodies checked for leakage; benchmarks recorded.

## Security review summary

20 checks, all passing. Four issues found and fixed during the build: the deletion event erased by its own cascade, a double-submit window, the callback rate limit not being checked, and the duplicated CSP. Eight risks accepted with reasons, listed in `docs/SECURITY_REVIEW.md` §5.

It is a self-review, not an independent audit, and the document says so.

## Known gaps (unchanged)

1. Live GitHub sign-in unverified.
2. Drag gesture unverified by automation.
3. Real Workers CPU figures require a deployment.
4. Activity writes are best-effort by design.

## Next action

Owner reviews M8, closes the two manual gaps, and decides on deployment (M9). The checklist is in `docs/RUNBOOK.md` §8; the cost is $0 on the Free plan.

No remote repository, deployment, cloud resource or cost exists.
