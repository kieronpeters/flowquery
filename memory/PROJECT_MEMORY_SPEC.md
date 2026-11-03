# Persistent Project Memory — `.flowquery/`

The `.flowquery/` directory lives at the root of the FlowQuery Git repository. It is the durable, version-controlled project record for decisions, phase state, specialist contact summaries and handovers. It complements source control; it does not replace Git commits or issue tracking.

## Required structure

```text
.flowquery/
├── README.md
├── decisions/
│   ├── DECISIONS.md
│   └── adr/
│       └── ADR-000-template.md
├── state/
│   ├── PROJECT_STATE.md
│   ├── PHASE_STATUS.md
│   ├── BACKLOG.md
│   └── NEXT_ACTION.md
├── agents/
│   ├── TEAM_DIRECTORY.md
│   └── contact/
│       ├── CONTACT_LOG.md
│       ├── bob.md
│       ├── alex.md
│       └── ... one file per named agent
├── handoffs/
│   └── YYYY-MM-DD-phase-or-task.md
├── logs/
│   └── AGENT_ACTIVITY.md
└── artifacts/
    └── reports, diagrams, review summaries and approved outputs
```

## Update cadence

### Session start
Read project state, phase status, next action, active backlog, relevant decisions and latest handoff before doing work. Compare the notes with the actual repository and report discrepancies.

### After a meaningful task
Update state and next action. Add a concise entry to the relevant agent contact file and the shared contact log. Record decisions separately from recommendations. Link to commits, pull requests or issue IDs where available.

### At phase/milestone completion
- Update project state and phase status.
- Mark backlog items complete or carry them forward.
- Record test/build/review evidence and any unverified work.
- Create a handoff document.
- Update agent contact summaries.
- List blockers and the next milestone entry criteria.

### On project pause or session end
Write a handoff even if the phase is incomplete. Include exact branch, commit, working-tree state, active task, modified files, tests run, known failures, blockers and next action.

## What to store — and what not to store

Store concise facts, approved decisions, evidence, commands and results, task assignments, outputs, blockers and handoff summaries. Do not store hidden chain-of-thought, speculative internal deliberations, API keys, passwords, tokens, personal data or secrets. Never invent an agent contact: only record an actual subagent invocation as a contact; otherwise record that Bob performed the work.

## Ownership and integrity

- Bob maintains the canonical index and reconciles specialist reports.
- Every named agent is responsible for supplying a usable handoff summary.
- The owner approves material product/architecture/security decisions.
- Git history provides the audit trail for edits.
- If memory conflicts with code or approved decisions, flag it and ask; do not silently overwrite the source of truth.
