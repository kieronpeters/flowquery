# Next Action

**Blocked on the owner.** Nothing proceeds until the following three things happen.

## 1. Review the consolidated specification

Read, in this order:

1. `docs/MVP_SPECIFICATION.md` — what the product is, and the superseded-assumptions table at the end.
2. `docs/REQUIREMENTS.md` — what must be true, as testable statements.
3. `docs/SECURITY_AND_AUTH.md` — the authentication options and their costs.
4. `docs/MVP_ROADMAP.md` — the order of work and the M1 exit criteria.

Confirm the product is what you intend, or tell me what is wrong.

## 2. Answer three questions

| ID | Question |
|---|---|
| AUTH-01 | Which authentication mechanism? The recommendation is in `SECURITY_AND_AUTH.md` §4. |
| AUTH-02 | Is requiring a GitHub account for you and your friend acceptable? |
| SCOPE-01 | Do you still want the in-app notification centre, or drop it? |

## 3. Approve M1 only

M1 is repository foundation: local Git initialisation, `.gitignore` covering secrets, project structure, toolchain, scripts, OpenCode agent activation, and a README verified from a clean directory. No application logic.

I will not start M1, and will not create a Git repository, until you say so explicitly.

## Then

M1 → M2 walking skeleton → M3 authentication (the real gate) → M4 boards → M5 Kanban → M6 comments/activity → M7 agent API → M8 hardening → M9 deployment (separate approval).

**Current gate: documentation and planning only.**
