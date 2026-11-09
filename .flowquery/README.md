# FlowQuery Persistent Project Memory

This directory is the live working memory of the project. It records **where things stand** — not what the product is. Product and technical specifications live in `../docs/`.

Read it at the start of every session. Update it after every meaningful piece of work.

## Contents

| Path | Holds |
|---|---|
| `state/PROJECT_STATE.md` | Verified current state: phase, decisions in force, platform facts, open decisions |
| `state/PHASE_STATUS.md` | Milestone history and what is blocked |
| `state/NEXT_ACTION.md` | The single next thing to do, and who it is waiting on |
| `state/BACKLOG.md` | Prioritised work, including deferred items |
| `decisions/DECISIONS.md` | **Pointer only.** The register is `docs/internal/DECISIONS.md` |
| `agents/TEAM_DIRECTORY.md` | Pointer only. The roster is `docs/agents/TEAM_DIRECTORY.md` |
| `handoffs/` | Session and milestone handovers |
| `logs/AGENT_ACTIVITY.md` | Chronological log of significant actions and verified outcomes |
| `templates/` | Handoff, phase closeout and ADR templates |

## Rules

1. **One source of truth per topic.** Product scope belongs in `docs/`, not here. State belongs here, not in `docs/`.
2. **Facts, not narratives.** Record what was done, what was verified and what failed. Never hidden reasoning.
3. **No secrets.** No tokens, passwords, keys or credentials — not even partial ones.
4. **No invented work.** If a test was not run, say it was not run. If a sub-agent was not launched, do not record a contact.
5. **Update in the same session as the work**, not later from memory.
6. When memory contradicts the repository, report the contradiction; do not quietly overwrite either side.
