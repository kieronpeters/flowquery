# FlowQuery

A small, private Kanban board for managing development work by two humans and an AI-assisted team.

**Status:** specification consolidated 3 November 2026. **No application code exists.** Implementation is not authorised until the owner approves the next phase.

---

## The product in one paragraph

Two human administrators share a dashboard listing every board. Each board has five fixed columns — Backlog, To Do, In Progress, Review, Done — holding task cards with title, description, priority, assignee, due date, comments and activity history. Bob, the OpenCode session, reaches exactly one board through a scoped API token and can manage tasks there but cannot change boards. Zero recurring cost: Cloudflare Workers Free and D1 Free only.

## Start here

| Order | File | Why |
|---|---|---|
| 1 | [`MASTER_PROMPT.md`](MASTER_PROMPT.md) | Bob's role and operating rules |
| 2 | [`AGENTS.md`](AGENTS.md) | Repository rules and the current gate |
| 3 | [`docs/MVP_SPECIFICATION.md`](docs/MVP_SPECIFICATION.md) | Authoritative product scope |
| 4 | [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Testable requirements |
| 5 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical design |
| 6 | [`docs/DECISIONS.md`](docs/DECISIONS.md) | What is settled, proposed and open |
| 7 | [`.flowquery/state/PROJECT_STATE.md`](.flowquery/state/PROJECT_STATE.md) | Where the project actually is |

## What is settled

- Flat structure: **boards only** — no organisations, projects or workspaces.
- Five fixed columns; no column configuration.
- Permanent board deletion with explicit confirmation.
- Two humans with identical full access; registration restricted.
- Bob is the current OpenCode session, using a board-scoped bearer token.
- Specialist agents are assignee profiles with no accounts and no credentials.
- Zero recurring cost, `*.workers.dev` address, no domain.

## What was settled at the M1 gate

| ID | Decision |
|---|---|
| AUTH-01 | GitHub OAuth with a server-side allowlist |
| AUTH-02 | Both administrators use GitHub accounts |
| DEC-031 | Administrators identified by immutable GitHub numeric user ID |
| SCOPE-01 | In-app notification centre dropped |
| DEC-030 | Local Git authorised; no remote, no push |

Nothing is currently open. The next gate is the owner's review of M1.

## Repository layout

```text
AGENTS.md                 repository rules
MASTER_PROMPT.md          Bob's operating prompt
docs/                     authoritative specification, design and research
team/                     specialist roster, profiles, portraits
opencode/                 OpenCode configuration and agent definitions
.flowquery/               project state, decisions, backlog, handoffs, activity log
design/                   visual direction and concept images
templates/                sprint, task and release templates
repository/               earlier GitHub setup research
memory/                   stale mirror — not authoritative; .flowquery/ is
```

## Safety

No deployment, cloud resource, paid plan, domain purchase, remote repository or destructive operation without explicit owner approval. Never commit secrets. Never treat a board URL as authentication.
