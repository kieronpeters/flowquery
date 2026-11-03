# FlowQuery — Implementation Guide

**Status:** Process document, 3 November 2026. Describes *how* work will be done once authorised. Nothing here authorises implementation.

## 1. Current gate

The specification has been consolidated. The next gate is the owner's approval of the implementation phase. Until that happens, permitted activity is: documentation, research against official sources, and planning.

Explicitly not permitted: scaffolding, installing dependencies, creating migrations, creating a Git repository or remote, creating Cloudflare resources, purchasing domains, deploying.

## 2. Session routine

Every session that touches this project starts with:

1. Root `AGENTS.md` and `MASTER_PROMPT.md`.
2. `docs/MVP_SPECIFICATION.md` and `docs/REQUIREMENTS.md`.
3. `.flowquery/state/PROJECT_STATE.md`, `PHASE_STATUS.md`, `NEXT_ACTION.md`, `BACKLOG.md`.
4. `docs/DECISIONS.md` — especially anything still Open.
5. The latest handoff in `.flowquery/handoffs/`.

If any of those disagree with each other, report the conflict before doing work. Do not silently pick a winner.

## 3. Milestone workflow

```text
Propose ──► Owner approves ──► Branch ──► Implement ──► Verify ──► Review ──► Close
```

### Propose
A short plan: goal, affected files, requirements addressed, security implications, tests to write, risks. Small enough to review in two minutes.

### Implement
- One branch per milestone slice: `feat/board-list`, `fix/token-revocation`.
- Commits are small and say *why*, not *what the diff already shows*.
- No dependency is added without stating what it replaces or why the platform cannot do it.

### Verify
The exact commands are fixed, so results are comparable across sessions:

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest (unit + worker integration against local D1)
npm run build          # production build must succeed
npm run db:migrate:local # migrations apply cleanly from empty
```

Copy the real terminal output into the handoff. A summary is not a substitute.

**Three tiers of test, used deliberately:**

1. **Route tests with a hand-written D1 stand-in.** Prove the HTTP contract: status codes, payload shape, auth boundaries. Cheap, fast, and honest about being a fake.
2. **Real-schema tests through `node:sqlite`** (`tests/helpers/sqlite-d1.ts`). These run the actual migration files with foreign keys enabled, so cascade deletes, CHECK constraints and unique indexes are exercised rather than trusted. Anything involving deletion, isolation or integrity belongs here.
3. **UI component tests** (`tests/ui/`) with jsdom and Testing Library. These cover what only a user notices: that the dialog loads its fields, that saving carries the version guard, and that deleting takes two deliberate clicks. They use `// @vitest-environment jsdom` per file, so the rest of the suite stays on Node.

None is a substitute for another. Do not "prove" a cascade with a fake that returns rows regardless of parameters, and do not "prove" a confirmation dialog with a server test that has no dialog.

### Review
Checklist before closing:
- [ ] Requirements satisfied and traced to tests
- [ ] No SQL outside `repositories/`
- [ ] No board identifier trusted from an agent request
- [ ] Cross-board isolation test present for any new resource
- [ ] CPU measured for any new endpoint
- [ ] Documentation updated in the same change
- [ ] `.flowquery/` state updated

### Close
Update `PHASE_STATUS.md`, `NEXT_ACTION.md`, `BACKLOG.md`, append to `logs/AGENT_ACTIVITY.md`, and write a handoff. Unfinished work is described honestly, including what is broken.

## 4. Working with Bob and the specialist team

- Bob is the current OpenCode session. Bob does not spawn a Bob agent.
- Specialists are subagents used for bounded, genuinely parallelisable work: an independent security review, a UX critique, a test-plan review, a research task against official docs.
- Do not spawn a specialist to write a document Bob could write, and never spawn the whole roster to look thorough.
- Maximum two or three concurrent specialists; never let two edit the same file.
- Bob reviews and integrates everything. A specialist's output is a draft, not a commit.
- Record an actual invocation in `.flowquery/agents/contact/<name>.md`. Never fabricate a contact.

## 5. Two-namespace discipline

The most likely serious defect in this codebase is a business rule implemented twice — once for the human routes and once for the agent routes — and drifting. Every review checks this. If a rule needs to differ per door, it is an authorisation concern and belongs in the service layer, not in two route handlers.

## 6. Secrets

| Secret | Where it lives | Where it must never appear |
|---|---|---|
| `GITHUB_CLIENT_SECRET` (if AUTH-01 chooses OAuth) | `.dev.vars` locally; `wrangler secret` when deployed | Git, logs, client bundle, prompts, screenshots |
| Session signing key | Same | Same |
| Registration allowlist | Non-secret config (`.dev.vars` / vars) | — |
| Agent tokens | Generated in-app, stored hashed | Anywhere in plaintext after creation |

`.dev.vars` is git-ignored before the first commit, not after.

## 7. Git

- `main` is the only long-lived branch.
- Feature branches, merged to `main` after review.
- Local repository only until the owner approves creating the remote.
- Never `git add -A` without reading `git status` first.
- Never commit `.dev.vars`, `.wrangler/`, `dist/` or `node_modules/`.

## 8. Definition of done

A milestone is done when its MUST requirements have passing tests, the verification commands' real output is recorded, typecheck and lint are clean, the affected documentation is updated, and `.flowquery/` reflects reality.

"Works on my machine" is a status report, not a definition of done.
