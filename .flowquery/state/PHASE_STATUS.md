# Phase Status

**Current phase:** M0 — specification consolidated; owner approval pending.
**Implementation:** not authorised.
**Last updated:** 2026-11-03.

## Phase history

| Phase | Status | Outcome |
|---|---|---|
| Initial package assembly | Complete | Project pack, team roster, concept images, early research |
| Requirements consolidation (v1) | Complete — superseded | Organisation → project → board hierarchy; never implemented |
| Access-control investigation | Complete — resolved by scope change | The hierarchy was removed rather than secured; authenticated-humans-only chosen |
| **Specification consolidation (v2)** | **Complete 2026-11-03** | Flat board model documented end to end; full documentation set rewritten; single decisions register |
| Owner review and approval | **Pending** | Blocks everything |
| M1 Repository foundation | Not started | Requires approval |
| M2–M8 Implementation | Not started | Requires M1 |
| M9 Deployment | Not started | Requires explicit deployment approval |

## What was completed on 2026-11-03

- Audited all 60+ files in the package; catalogued nine documentation conflicts.
- Replaced the hierarchy with the flat board model across every authoritative document.
- Corrected Bob's identity: Bob is the current OpenCode session, not a separate service account and not a spawnable agent.
- Settled specialist agents as assignee profiles with no accounts, no credentials and no board access — permanently.
- Replaced "archive" with permanent deletion and documented its consequences.
- Introduced the zero-recurring-cost constraint as a hard architectural driver.
- Measured PBKDF2 cost and documented why password authentication is excluded.
- Consolidated two decision registers into one.
- Marked superseded documents rather than deleting them (no version control exists yet).
- Rewrote `.flowquery/` state, backlog, next action, decisions pointer and activity log.

## Before M1 can start

1. Owner reviews `docs/MVP_SPECIFICATION.md` and `docs/REQUIREMENTS.md`.
2. Owner resolves AUTH-01, AUTH-02 and SCOPE-01.
3. Owner authorises implementation of M1 only.

## Explicitly not done

No code. No dependencies. No migrations. No Git repository. No Cloudflare resources. No deployment. No paid service. No domain.
