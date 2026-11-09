# Handoff — 2026-11-09 — Repository simplification

## Repository

- Branch: `refactor/repository-simplification`
- Base: `main` at `844b43a`
- Working tree: changes for this phase, uncommitted at the time of writing
- Nothing pushed, merged or deployed

## Completed

- Removed the deprecated `memory/` mirror, historical `repository/` setup research, unused root `templates/`, `design/` concept images, `team/profiles/` and `team/portraits/`.
- Moved `team/TEAM_DIRECTORY.md` and `team/AGENT_OPERATING_MODEL.md` into `docs/agents/`; removed the root `team/` directory.
- Moved the engineering documents into `docs/internal/`; `docs/README.md` is the single index; `docs/internal/README.md` (duplicate index) was removed.
- Moved `design/DESIGN_DIRECTION.md` into `docs/internal/`.
- Deleted superseded or stale material: `IMPLEMENTATION_KICKOFF_PROMPT.md`, `PACKAGE_CONTENTS.md`, `docs/SECURITY_AND_QUALITY.md`, `docs/DEPLOYMENT_PLAN.md`.
- Consolidated development instructions into root `AGENTS.md`; removed `docs/AGENTS.md`. `MASTER_PROMPT.md` and `.opencode/agents/bob.md` were updated for the platform-independent Bob and the current authorisation model.
- Updated the Worker catalogue to import only `docs/**/*.md` and the frontend link resolver to drop the `team/` special case.
- Rewrote the root `README.md` for the current structure and state.
- Added migrations `0012` (clear legacy `team/portraits/` avatar paths) and `0013` (correct Bob's About text); updated the seed to stop writing legacy avatar paths.
- Updated project state, next action, phase status, backlog, activity log and this handoff.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (**394 tests**, 35 files) and `npm run build` all pass.
- A Markdown link checker found 0 broken relative links in `docs/`.
- The built worker bundle contains all 22 documents under `docs/` and no `team/` or `docs/AGENTS.md` path.
- The docs API tests assert the consolidated slugs and that every runtime document lives under `docs/`.

## Outstanding

- The two new migrations have **not** been applied to production.
- The repository is already public. `docs/internal/TECHNICAL_RESEARCH.md` records the owner's real email address as the local Git identity. It is already in Git history and on `main`; it was left for owner review rather than silently rewritten.
- No browser check of the `/docs` page was run in this session; discovery and rendering are covered by the API and DocsPage tests.

## Next action

Owner review of the branch. Merging, pushing and deploying require explicit approval.
