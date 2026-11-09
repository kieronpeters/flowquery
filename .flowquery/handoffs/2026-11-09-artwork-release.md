# Handoff — 2026-11-09 — Corrected AI team artwork released

## Repository

- Branch: `main`
- Merge: `86a0b65` (PR #7, `artwork-final` → `main`)
- Remote: `origin/main` matches `main`; release branch deleted
- Working tree: clean after the follow-up docs commit

## Completed

- Corrected 1536×655 AI Development Team banner at
  `public/brand/flowquery-ai-development-team-overview.png`, shown whole above
  the real directory.
- All 16 canonical agent portraits at
  `public/brand/agents/defaults/prf_<name>.png` (512×512), mapped by
  `src/shared/agent-portraits.ts`. No fictional names, no Rex, no human avatars.
- Human defaults unchanged: Kieron and Abdul, keyed by GitHub id.
- Replace/restore unchanged; uploads in D1, defaults immutable.
- Cleanup: removed the integrated pack ZIP, the superseded fictional poster and
  banner, and added `*.zip` to `.gitignore`. Kept `team/portraits/`, `design/`,
  the logo source, documentation and `.flowquery/` history.

## Verification

- typecheck, lint, format check, tests (**370**), build: pass.
- Built banner and 16 portraits hash-match the supplied pack.
- Local DOM: 16 correct portraits, banner 1536×655.
- Auth and agent-token boundaries covered by the existing suite.

## Deployment

**Pending.** Production is on version `08fffc21`. No CI is configured; merging
does not deploy. From `main`, run:

```
npm run deploy
```

No migration is required for this release.

## Outstanding

- Deploy the corrected artwork when the owner approves.
- Phone layout for the banner and avatar flows is not visually verified.
- The separate documentation consolidation task has not been started.

## Next action

Await the owner's deployment approval, then run `npm run deploy` from `main`
and verify `/agents`, the banner and the portrait assets.
