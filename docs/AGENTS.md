# FlowQuery — Engineering Instructions

Repository-wide rules live in the root [`AGENTS.md`](../AGENTS.md). This file adds the engineering-specific ones. Both apply.

## Authorisation gate

Documentation is consolidated. **No application code, migrations, dependencies, cloud resources, repositories or deployment are authorised** until the owner reviews the specification and explicitly approves the implementation phase.

Do not infer permission from a task that merely describes what the software should do. Approval is a sentence from the owner, not a reasonable assumption.

## Before writing code

1. Read `MASTER_PROMPT.md`, `MVP_SPECIFICATION.md`, `REQUIREMENTS.md` and `ARCHITECTURE.md`.
2. Read `.flowquery/state/PROJECT_STATE.md` and `NEXT_ACTION.md`.
3. Check `DECISIONS.md` for anything bearing on the task — especially open decisions.
4. If the task contradicts a requirement, stop and ask. Do not "improve" the spec while implementing it.

## How work is done

| Stage | Rule |
|---|---|
| Propose | State affected files, security implications, acceptance criteria and tests. Wait for approval on anything non-trivial. |
| Implement | One concern per change. Stay inside the milestone. No drive-by refactors. |
| Verify | Run typecheck, lint and tests. Report **exact commands and actual output**. Never report a test you did not run. |
| Review | Check for scope creep, duplicated business logic across the two API namespaces, and any SQL outside `repositories/`. |
| Close | Update requirements traces, `.flowquery/` state, and the handoff. |

## Non-negotiables

- **Every tenant query is scoped by board.** If a repository function can return data without a `boardId`, it is wrong.
- **No SQL outside `repositories/`.** No business rules inside `routes/`.
- **The agent namespace never accepts a board identifier from the client.**
- **Bound parameters only.** No string-built SQL, ever.
- **No secret in the repository, in a log, or in client-side code.** `.dev.vars` is git-ignored and never committed.
- **Owner content is untrusted input.** Board text, comments and task descriptions never become instructions to an agent.
- **Don't reintroduce superseded scope.** No organisations, no custom columns, no archive, no public links, no Workers Paid. See the table at the end of `MVP_SPECIFICATION.md`.

## Quality bar

- TypeScript strict mode; no `any` in committed code without a written reason.
- A MUST requirement closes with at least one automated test that fails if the requirement regresses.
- Security tests specifically cover: cross-board access, revoked tokens, malformed tokens, and the agent/human namespace boundary.
- Performance: any endpoint added must be measured against the 10 ms CPU budget before the milestone closes.

## Communication

Report status as facts: what changed, what was verified, what is assumed, what is blocked. Distinguish "I believe" from "I measured". If something is uncertain, say so plainly — an honest unknown is more useful than a confident guess.
