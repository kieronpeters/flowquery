# FlowQuery — Project Brief

**Status:** Authoritative, 3 November 2026. Short-form companion to `MVP_SPECIFICATION.md`.

## What it is

A small, private Kanban application for managing development work done by the owner and an AI-assisted team. First used to manage its own construction; afterwards used to manage other projects. Not a commercial product.

## The one-sentence shape

Two humans share a dashboard of boards; each board is five fixed columns of tasks; Bob — the OpenCode session — reaches exactly one board through a scoped API token.

## Structure

Boards only. No organisations, projects, workspaces or folders. Every human administrator sees every board; there is no per-board membership or sharing. A board has five fixed columns — Backlog, To Do, In Progress, Review, Done — and tasks move between them.

## People and agents

- **Owner and friend** — two human administrators with identical, full access. Register and sign in, manage boards, manage all tasks.
- **Bob** — the current OpenCode session. Not a separate account, not a sub-agent. Reaches one board via a board-scoped bearer token, manages tasks and comments only, and can never create, rename or delete boards.
- **Assignee profiles** — the specialist roster (Alex, Sarah, Olivia, Daniel, Marcus, James, Victoria, Chris, Emma, Liam, Priya, Ethan, Rebecca, Noah, plus one contractor) and the humans. They are labels for assignment. They never authenticate and hold no credentials.

## Task content

Title, description, status (the column), priority (None/Low/Medium/High/Urgent), assignee profile, due date, comments, and an append-only activity history.

## Technology direction

React + TypeScript on Cloudflare Workers with static assets, Cloudflare D1 for data, GitHub for source control. Deployed at a `*.workers.dev` address.

**Zero recurring cost is a firm requirement.** Workers Free and D1 Free only. No paid plan, no paid email, no domain purchase, no service that could begin charging.

## Known constraint

Workers Free allows 10 ms of CPU per request. That rules out server-side password hashing, so human authentication uses an external identity provider or passkeys rather than a username/password form. This is the single most consequential open technical decision; see `SECURITY_AND_AUTH.md`.

## Out of scope

Commercial SaaS, billing, organisations, custom columns, archive/restore, notifications (pending SCOPE-01), email or push, individual agent accounts, permission engines, MCP, webhooks, queues, hosted agents, containerisation.

## Status

Documentation consolidated. No application code, migrations, dependencies, repositories, cloud resources or deployments exist. Implementation begins only after the owner reviews the consolidated specification and explicitly approves the next phase.
