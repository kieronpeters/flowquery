# FlowQuery Documentation

**Current product source of truth:** [`MVP_SPECIFICATION.md`](MVP_SPECIFICATION.md)
**Current technical source of truth:** [`ARCHITECTURE.md`](ARCHITECTURE.md)

Read in this order. Each document has exactly one job; where two seem to overlap, the higher one wins.

| # | Document | Job | Authority |
|---|---|---|---|
| 1 | `MVP_SPECIFICATION.md` | What the product is and is not, including an explicit superseded-assumptions list | **Authoritative** |
| 2 | `REQUIREMENTS.md` | Testable requirements with stable IDs and acceptance criteria | **Authoritative** |
| 3 | `ARCHITECTURE.md` | How it is built, layering, CPU/free-tier design, failure behaviour | **Authoritative** |
| 4 | `DATABASE_DESIGN.md` | Schema, indexes, transaction patterns, migration rules | **Authoritative** |
| 5 | `API_SPECIFICATION.md` | The HTTP contract for both human and agent doors | **Authoritative** |
| 6 | `SECURITY_AND_AUTH.md` | Threat model, authentication design, token handling, backups | **Authoritative** |
| 7 | `DECISIONS.md` | Single register of approved, proposed and open decisions | **Authoritative** |
| 8 | `MVP_ROADMAP.md` | Phased delivery order and backlog | Authoritative |
| 9 | `TECHNICAL_RESEARCH.md` | Verified platform facts, sources and verification dates | Reference |
| 10 | `IMPLEMENTATION_GUIDE.md` | How work is proposed, executed, verified and closed | Process |
| 11 | `PROJECT_BRIEF.md` | One-page summary for humans | Summary |
| 12 | `AGENTS.md` | Engineering rules for agents working in this repository | Process |
| 13 | `RUNBOOK.md` | Setup, backup, restore, incident procedures, deployment checklist | Operational |
| 14 | `SECURITY_REVIEW.md` | The M8 review: checks, findings, accepted risks | Review |
| 15 | `DEPLOYMENT_PLAN.md` | M9: what would be created, the exact commands, rollback. **Not authorised.** | Plan |

## Superseded

These files remain only so nobody wonders where they went. Their content has been consolidated elsewhere; **do not follow them**.

| File | Replaced by |
|---|---|
| `SECURITY_AND_QUALITY.md` | `SECURITY_AND_AUTH.md` |

## Documentation rules

1. One authoritative home per topic. If you need to say something twice, link instead of copying.
2. Superseded content is marked, not silently deleted — but a marked document must not contain instructions that contradict the current spec.
3. Every numeric platform claim in these documents carries a source and a verification date, because Cloudflare's limits change.
4. Decisions are recorded once, in `DECISIONS.md`, with a status. A decision that is not in that register does not exist.
5. The `.flowquery/` directory holds project state and memory, never a second copy of the specifications.
