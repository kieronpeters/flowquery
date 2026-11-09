# FlowQuery Documentation

FlowQuery uses its own documentation as application content. Every Markdown file
under `docs/` is imported by the Worker at build time and served through
`/api/v1/docs`, so these documents are both repository documentation and part of
the running site.

**Product source of truth:** [`internal/MVP_SPECIFICATION.md`](internal/MVP_SPECIFICATION.md)
**Technical source of truth:** [`internal/ARCHITECTURE.md`](internal/ARCHITECTURE.md)
**AI assistant entry point:** [`agents/AI_AGENT_ENTRYPOINT.md`](agents/AI_AGENT_ENTRYPOINT.md)
**Human guides:** [`user/README.md`](user/README.md)

## How the tree is organised

| Folder | Audience | Contents |
|---|---|---|
| `agents/` | AI assistants and the team model | The universal entry point, the AI roster and the operating model. |
| `user/` | Human administrators | How to use boards, tasks, tickets and profiles. |
| `internal/` | Maintainers | Product, architecture, data, API, security, operations and decisions. |

The folder is the audience classification: `docs/agents/` is served as
`agents`, `docs/user/` as `user`, and everything else as `internal`.

## Read in this order

Each document has exactly one job; where two seem to overlap, the higher one
wins.

| # | Document | Job | Authority |
|---|---|---|---|
| 1 | [`internal/MVP_SPECIFICATION.md`](internal/MVP_SPECIFICATION.md) | What the product is and is not, including the superseded-assumptions list | **Authoritative** |
| 2 | [`internal/REQUIREMENTS.md`](internal/REQUIREMENTS.md) | Testable requirements with stable IDs and acceptance criteria | **Authoritative** |
| 3 | [`internal/ARCHITECTURE.md`](internal/ARCHITECTURE.md) | How it is built, layering, CPU/free-tier design, failure behaviour | **Authoritative** |
| 4 | [`internal/DATABASE_DESIGN.md`](internal/DATABASE_DESIGN.md) | Schema, indexes, transaction patterns, migration rules | **Authoritative** |
| 5 | [`internal/API_SPECIFICATION.md`](internal/API_SPECIFICATION.md) | The HTTP contract for both human and agent doors | **Authoritative** |
| 6 | [`internal/SECURITY_AND_AUTH.md`](internal/SECURITY_AND_AUTH.md) | Threat model, authentication design, token handling, backups | **Authoritative** |
| 7 | [`internal/DECISIONS.md`](internal/DECISIONS.md) | Single register of approved, proposed and open decisions | **Authoritative** |
| 8 | [`internal/MVP_ROADMAP.md`](internal/MVP_ROADMAP.md) | Phased delivery order and backlog | Authoritative |
| 9 | [`internal/TECHNICAL_RESEARCH.md`](internal/TECHNICAL_RESEARCH.md) | Verified platform facts, sources and verification dates | Reference |
| 10 | [`internal/IMPLEMENTATION_GUIDE.md`](internal/IMPLEMENTATION_GUIDE.md) | How work is proposed, executed, verified and closed | Process |
| 11 | [`internal/PROJECT_BRIEF.md`](internal/PROJECT_BRIEF.md) | One-page summary for humans | Summary |
| 12 | [`internal/RUNBOOK.md`](internal/RUNBOOK.md) | Setup, backup, restore, incident procedures, deployment checklist | Operational |
| 13 | [`internal/SECURITY_REVIEW.md`](internal/SECURITY_REVIEW.md) | The M8 review: checks, findings, accepted risks | Review |
| 14 | [`internal/DESIGN_DIRECTION.md`](internal/DESIGN_DIRECTION.md) | The visual language and what was deliberately not built | Reference |
| 15 | [`internal/BRAND.md`](internal/BRAND.md) | Logo and icon assets: locations, sizes, where each is used, rules | Reference |

## Agent and team documents

| Document | Job |
|---|---|
| [`agents/AI_AGENT_ENTRYPOINT.md`](agents/AI_AGENT_ENTRYPOINT.md) | Master onboarding for any AI assistant |
| [`agents/TEAM_DIRECTORY.md`](agents/TEAM_DIRECTORY.md) | The canonical AI roster, roles and identity rules |
| [`agents/AGENT_OPERATING_MODEL.md`](agents/AGENT_OPERATING_MODEL.md) | Delegation, concurrency and the task lifecycle |

## Documentation rules

1. One authoritative home per topic. If you need to say something twice, link
   instead of copying.
2. Superseded content is removed, not silently kept beside the current version.
3. Every numeric platform claim carries a source and a verification date,
   because Cloudflare's limits change.
4. Decisions are recorded once, in `internal/DECISIONS.md`, with a status. A
   decision that is not in that register does not exist.
5. `.flowquery/` holds project state and memory, never a second copy of the
   specifications.
