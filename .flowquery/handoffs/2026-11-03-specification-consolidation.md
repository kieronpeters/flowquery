# Handoff — 2026-11-03 — Specification consolidation

**Branch:** none. No Git repository exists.
**Working tree:** documentation only; no code, no dependencies, no migrations.
**Session:** Bob (the OpenCode session), single agent. No specialist sub-agents were used for the documentation work itself; two research sub-agents were used for Cloudflare platform facts.

---

## Context for a new session

The owner issued a new product direction on 3 November 2026 that **replaced** the organisation → project → board hierarchy with a flat board model, removed public board links entirely, fixed the columns at five, and made zero recurring cost a firm requirement. This session consolidated the entire documentation set around that direction.

If you are reading this with no other context: read `AGENTS.md`, `MASTER_PROMPT.md`, `docs/MVP_SPECIFICATION.md` and `docs/REQUIREMENTS.md` before doing anything. Then read `.flowquery/state/NEXT_ACTION.md`.

## What changed, and why

| Change | Reason |
|---|---|
| Organisation/project hierarchy removed | Owner direction: boards are the only container |
| Routes replaced with `/`, `/login`, `/signup`, `/agent`, `/boards`, `/boards/:boardId` | Follows from the flat model |
| Public board links removed | Security: a URL must never authorise access |
| Columns fixed at five, non-configurable | Owner direction; removes a whole configurable surface |
| Archive replaced by permanent delete with typed confirmation | Owner direction; documented consequences |
| Bob redefined as the current OpenCode session | Owner direction; Bob is not a spawnable service account |
| Specialist accounts eliminated permanently | They are assignee profiles, never users |
| Zero recurring cost made architectural, not aspirational | Owner: Workers Free and D1 Free only, no domain |
| Notifications removed from MVP scope | Absent from the new direction; raised as SCOPE-01 rather than silently kept or dropped |
| Two decision registers merged into one | They already disagreed in wording |
| `docs/AGENTS.md` stale "do not reintroduce the hierarchy" line removed | It instructed agents to refuse the required product |

## Files written this session

**Root:** `README.md`, `AGENTS.md`, `MASTER_PROMPT.md`, `IMPLEMENTATION_KICKOFF_PROMPT.md` (superseded notice)

**Docs:** `MVP_SPECIFICATION.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `API_SPECIFICATION.md`, `SECURITY_AND_AUTH.md`, `TECHNICAL_RESEARCH.md`, `DECISIONS.md`, `MVP_ROADMAP.md`, `PROJECT_BRIEF.md`, `README.md`, `AGENTS.md`, `IMPLEMENTATION_GUIDE.md`, `SECURITY_AND_QUALITY.md` (superseded notice)

**Team:** `TEAM_DIRECTORY.md`, `AGENT_OPERATING_MODEL.md`

**Memory:** `.flowquery/README.md`, `PROJECT_MEMORY_SPEC.md`, `state/PROJECT_STATE.md`, `state/PHASE_STATUS.md`, `state/NEXT_ACTION.md`, `state/BACKLOG.md`, `decisions/DECISIONS.md` (pointer), `agents/TEAM_DIRECTORY.md` (pointer), `agents/contact/bob.md`, `logs/AGENT_ACTIVITY.md`, this handoff

## Verification performed

- Repository state: confirmed no Git repository, no application code, no dependencies. `git status` fails with "not a git repository" — expected.
- Platform facts: verified against `developers.cloudflare.com` on 2026-11-03. Sources and dates in `docs/TECHNICAL_RESEARCH.md`.
- PBKDF2 CPU cost: measured locally in Node/V8 WebCrypto. 100,000 iterations = 25.9 ms median. Recorded in `docs/TECHNICAL_RESEARCH.md`.
- Documentation consistency: cross-checked route lists, table names, requirement IDs and decision IDs across all rewritten documents. Requirement IDs referenced in `SECURITY_AND_AUTH.md` and `MVP_ROADMAP.md` exist in `REQUIREMENTS.md`.

**Not verified, because it does not exist:** any running build, any test suite, any deployment, any measured Workers CPU figure from a real request.

## Known gaps

1. **No Git history.** Nothing is protected by version control yet. The next session must not delete files.
2. **OpenCode agents inactive.** Definitions live in `opencode/agents/`; OpenCode V2 discovers `.opencode/agents/`. Activation is a directory move scheduled for M1, deliberately deferred because there is no Git history to recover originals from.
3. **`memory/` is a stale mirror.** Its own README says `.flowquery/` is canonical. Removal is deferred to M1 for the same reason.
4. **`design/DESIGN_DIRECTION.md` still describes a richer product** (sidebar sections, reports, calendar). It is marked as visual reference, but it should be trimmed in M1.
5. **`repository/SETUP_QUESTIONS.md`** still references the old repository plan and needs reconciling in M1.

## Next action

Owner review of `docs/MVP_SPECIFICATION.md`, `docs/REQUIREMENTS.md`, `docs/SECURITY_AND_AUTH.md` and `docs/MVP_ROADMAP.md`; answers to AUTH-01, AUTH-02 and SCOPE-01; then authorisation of M1 only.

No implementation work is authorised. Nothing in this session created code, resources or costs.
