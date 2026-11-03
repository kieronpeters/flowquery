# Persistent Project Memory — `.flowquery/`

`.flowquery/` is the durable, version-controlled working record of FlowQuery's state, decisions, handovers and activity. It complements Git history; it does not replace it.

## Structure

```text
.flowquery/
├── README.md
├── PROJECT_MEMORY_SPEC.md        (this file)
├── state/
│   ├── PROJECT_STATE.md          verified current state
│   ├── PHASE_STATUS.md           milestone history and blockers
│   ├── NEXT_ACTION.md            the single next step
│   └── BACKLOG.md                prioritised work
├── decisions/
│   └── DECISIONS.md              pointer to docs/DECISIONS.md
├── agents/
│   ├── TEAM_DIRECTORY.md         pointer to team/TEAM_DIRECTORY.md
│   └── contact/                  one file per agent, real invocations only
├── handoffs/
│   └── YYYY-MM-DD-topic.md
├── logs/
│   └── AGENT_ACTIVITY.md
└── templates/
```

Two directories from an earlier draft — `decisions/adr/` and `artifacts/` — were never created and are not part of the current structure. If formal ADRs are needed later, they go in `decisions/adr/` and the register links to them.

## Cadence

**Session start** — read `state/PROJECT_STATE.md`, `PHASE_STATUS.md`, `NEXT_ACTION.md`, `BACKLOG.md`, the open decisions in `docs/DECISIONS.md`, and the latest handoff. Compare with the actual repository and report discrepancies.

**After meaningful work** — update state, next action and backlog; append to the activity log; write or update the handoff if the session ends.

**At milestone completion** — update phase status, mark backlog items, record verification evidence (exact commands and real output), create a handoff, and list what remains unverified.

**On pause, mid-task** — write a handoff even if incomplete: current branch, working-tree state, what is done, what is broken, what is next.

## Store / never store

**Store:** verified state, approved decisions, evidence, commands and their results, assignments, blockers, handoff summaries.

**Never store:** secrets or credentials of any kind, personal data beyond what the product requires, hidden chain-of-thought, or a claim that something was done when it was not.

## Identity note

Bob is the current OpenCode session. When Bob does work, record it as Bob's work in `logs/AGENT_ACTIVITY.md`. When a specialist is genuinely invoked, record a contact entry for that specialist — and only then.

## Integrity

- If memory conflicts with code or with an approved decision, flag it and ask. Do not silently reconcile.
- Every handoff must be usable by a session with no prior context.
- The owner approves material product, architecture, security and cost decisions; memory records them, never invents them.
