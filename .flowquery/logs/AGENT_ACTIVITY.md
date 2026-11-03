# Agent Activity Log

Significant actions and their verified outcomes. Newest first. Facts only — no hidden reasoning, no secrets.

---

## 2026-11-03 — Specification consolidation (Bob, current session)

**Trigger:** owner issued a new product direction superseding the organisation/project hierarchy.

**Inspected:** all 60+ files in the package — root prompts and rules, 12 documents in `docs/`, 15 team profiles and the roster, 16 OpenCode agent definitions, the full `.flowquery/` tree, `design/`, `repository/`, `templates/`. Verified the toolchain (git 2.55.0, node 24.21.0, opencode 2.2.1, gh 2.103.3). Confirmed no Git repository and no application code existed.

**Identified contradictions:** nine, including a `docs/AGENTS.md` line instructing agents not to reintroduce the hierarchy that the spec mandated; human accounts marked MUST in requirements while deferred in the roadmap and backlog; the README asserting public editable board links while the security documents left it open; and Bob's token scope described three different ways.

**Researched:** Cloudflare Workers and D1 limits, pricing, static-asset billing, SPA routing, D1 foreign keys, batch semantics, Time Travel, and the absence of a hard spending cap — all against official documentation on 2026-11-03. Sources recorded in `docs/TECHNICAL_RESEARCH.md`.

**Measured:** PBKDF2-SHA256 CPU cost in the local V8/WebCrypto stack — 2.6 ms at 10k iterations, 25.9 ms at 100k, 162.6 ms at 600k. Against a 10 ms Workers Free budget this excludes server-side password hashing. Command and output recorded in `docs/TECHNICAL_RESEARCH.md`.

**Rewrote:** `MASTER_PROMPT.md`, `AGENTS.md`, `README.md`, `IMPLEMENTATION_KICKOFF_PROMPT.md` (marked superseded), `docs/MVP_SPECIFICATION.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/API_SPECIFICATION.md`, `docs/SECURITY_AND_AUTH.md`, `docs/TECHNICAL_RESEARCH.md`, `docs/DECISIONS.md`, `docs/MVP_ROADMAP.md`, `docs/PROJECT_BRIEF.md`, `docs/README.md`, `docs/AGENTS.md`, `docs/IMPLEMENTATION_GUIDE.md`, `docs/SECURITY_AND_QUALITY.md` (superseded pointer), `team/TEAM_DIRECTORY.md`, `team/AGENT_OPERATING_MODEL.md`, and the `.flowquery/` state, backlog, next action, phase status, decisions pointer and handoff.

**Not done, deliberately:** no code, no dependencies, no migrations, no Git repository, no cloud resources, no deployment, no paid service, no domain.

**Outcome:** documentation internally consistent with the flat board model; three decisions left open for the owner (AUTH-01, AUTH-02, SCOPE-01).

---

## 2026-11-02 — Requirements consolidation (previous session)

- Consolidated the owner's questionnaire and clarifications into the then-current `docs/MVP_SPECIFICATION.md`.
- Updated the brief, requirements, architecture candidate, API outline, data model, security/quality, roadmap, decision register, README, AGENTS and master prompt.
- No application code, repository creation, cloud resource creation or deployment performed.
- **Status now:** superseded by 2026-11-03. That specification described the organisation → project → board hierarchy, which has been removed from the product.
