# Phase Status

**Current phase:** M9 complete and deployed. Repository simplification released. Board auto-refresh released and deployed.
**Next gate:** none; the next change requires its own owner approval.
**Last updated:** 2026-11-09.

## Phase history

| Phase | Status | Outcome |
|---|---|---|
| Specification consolidation | Complete | Flat board model; single decisions register |
| Owner review and approval | Complete | AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030 |
| M1 Repository foundation | Complete | Git, toolchain, structure, OpenCode agents, smoke test |
| M2 Walking skeleton | Complete | D1 schema, seeds, read-only board, CPU measurement |
| M3 Human authentication | Complete | GitHub OAuth + PKCE, allowlist, sessions, CSRF, rate limiting |
| M4 Boards and dashboard | Complete | Board list, create, rename, permanent delete with cascade |
| M5 Kanban and tasks | Complete | Task CRUD, ordering, drag-and-drop, keyboard moves |
| M6 Comments and activity | Complete | Append-only comments and a board activity feed |
| M7 Agent API and tokens | Complete | Board-scoped tokens, `/agent` namespace, OpenAPI, isolation suite |
| **M8 Hardening** | **Complete 2026-11-03** | Headers, request ids, restore drill, perf pass, review, runbook |
| M9 Deployment | **Complete 2026-11-03** | Worker and D1 live at `flowquery.workstack.workers.dev`; sign-in verified end to end |
| Post-M9 releases | Complete | Onboarding and docs, People directory, Bob operating model, direct ticket links |
| Repository simplification | **Complete 2026-11-09** | PR #11 merged as `4bddf82`; deployed as version `7677ce03`; migrations `0012` and `0013` applied |
| Board auto-refresh | **Complete 2026-11-10** | PR #12 merged as `5fe208e`; deployed as version `bfff39d4` |

## M8 completion evidence

| Check | Result |
|---|---|
| `npm run typecheck` / `lint` / `build` | Pass |
| `npm test` | **149 tests passed**, 12 files |
| Security headers on API responses | CSP, nosniff, referrer, frame, COOP, permissions — all asserted |
| Security headers on the SPA document | `public/_headers`, compared to the Worker policy **by a test** |
| Inline script allowed? | No — `script-src 'self'`; the app still runs in dev with zero console errors |
| Request id | `X-Request-Id` on every response, unique per request; echoed in 404 and 500 bodies |
| Error leakage | 404 body contains no SQL, stack or path fragments |
| Callback rate limit | Now checked **before** contacting GitHub |
| Restore drill (final schema) | Export 12.7 KB → delete all state → import → 1 board / 9 tasks / 1 token / 18 profiles, zero FK violations |
| Agent token after restore | **Still authenticates** — the board returned 9 tasks with the correct distribution |
| Performance | Board view 0.033 ms @ 9 tasks, 0.578 ms @ 200; agent task list 50 tasks 0.137 ms; auth path ~0.04 ms |
| Security review | `docs/internal/SECURITY_REVIEW.md` — 20 checks, 4 fixes, 8 accepted risks |
| Runbook | `docs/internal/RUNBOOK.md` — setup, backup, restore, incidents, deployment checklist |

## Notable finding this milestone

The SPA document is served by Cloudflare's asset layer, so Worker middleware never sees it. Without `public/_headers`, the HTML that hosts the app would have had **no** Content-Security-Policy at all — the opposite of what the code suggested. A test now keeps the two policies identical.

## Explicitly not done

No deployment. No remote repository. No Cloudflare resource. No domain. No cost.
