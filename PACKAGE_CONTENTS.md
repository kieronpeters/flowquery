# FlowQuery Package Contents

- `MASTER_PROMPT.md` — Bob's operating prompt. Bob is the current OpenCode session.
- `AGENTS.md` — repository-wide rules, and the current authorisation gate.
- `opencode.jsonc` — OpenCode project configuration (V2 schema).
- `.opencode/agents/` — Bob (primary) plus 15 specialist subagent definitions.
- `docs/` — authoritative specification, requirements, architecture, database design, API contract, security design, research, decisions, roadmap and process.
- `src/worker/` — Cloudflare Worker application (Hono router).
- `src/app/` — React application. A foundation placeholder at M1.
- `tests/` — Vitest test suite.
- `migrations/` — D1 migrations. Empty until M2, by design.
- `team/` — virtual AI team roster, profiles, portraits and operating model.
- `.flowquery/` — persistent project state, decisions pointer, backlog, handoffs, activity log.
- `design/` — visual direction and concept images (illustrative, not binding scope).
- `templates/` — task, sprint and release templates.
- `repository/` — earlier GitHub setup research. Historical; partly superseded.
- `memory/` — deprecated mirror of `.flowquery/`. Neutralised; do not read as current state.

## Current state

M1 is complete: repository, toolchain, project configuration and a verified smoke test. There are no product features, no database schema, no authentication and no deployment.

No remote GitHub repository, Cloudflare resource, domain or paid service exists.
