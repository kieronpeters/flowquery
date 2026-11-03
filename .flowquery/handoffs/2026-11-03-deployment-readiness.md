# Handoff — 2026-11-03 — Deployment readiness

**Branch:** `main` (local only; no remote)
**Session:** Bob, the current OpenCode session.
**State:** M8 complete. M9 planned, blocked, not started.

---

## Context for a new session

Read `AGENTS.md`, `MASTER_PROMPT.md`, `docs/DEPLOYMENT_PLAN.md` and `.flowquery/state/NEXT_ACTION.md` first. Nothing is deployed and no cloud resource exists.

## Why deployment did not happen

The owner said "continue", which is not approval to create cloud resources. Independently, `wrangler whoami` reports **not authenticated**, so it could not have happened anyway.

Three prerequisites, all owner-side:

1. `npx wrangler login` (interactive, browser).
2. A production GitHub OAuth app whose callback matches the deployed hostname.
3. An explicit "yes" for M9.

## What was done instead

- Dry-run validation of the deployment artefact: 151.18 KiB, 6 static files, `env.DB` binding, no upload.
- `docs/DEPLOYMENT_PLAN.md`: creation list, command order, verification table, rollback, and the explicit list of things that would not be done.
- Found and fixed a **structural** bug in `public/_headers` (see below).

## The `_headers` bug — worth remembering

M8 added `public/_headers` to give the SPA document a CSP, because static assets bypass Worker middleware. The first version used `/* … */` comments. In that file format `/*` is a **URL pattern**, not a comment: `#` is the comment character. So the policy was attached to the wrong block, or to none.

The M8 drift test passed anyway, because it searched for the policy string rather than checking that the file was a valid rule.

Now fixed: `#` comments, one `/*` rule, and three tests that assert structure — first meaningful line is `/*`, every header line is indented, and the file contains no `*/`.

**Lesson to carry:** a test that checks content but not structure gives false confidence. The same failure mode as a fake database that answers any query.

## Remaining verification gaps

1. Live GitHub sign-in (owner credentials).
2. Drag gesture (human).
3. `_headers` behaviour in a real deployment (only exists once deployed).

## Next action

Owner logs in to Cloudflare and approves M9; then follow `docs/DEPLOYMENT_PLAN.md` step by step.

No remote repository, deployment, cloud resource or cost exists.
