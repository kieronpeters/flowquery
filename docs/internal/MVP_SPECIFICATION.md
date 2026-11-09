# FlowQuery — Product Specification

**Status:** Authoritative. Consolidated 3 November 2026 from the owner's direction of the same date.
**Supersedes:** every earlier scope statement in this repository, including the organisation → project → board hierarchy, public editable board links, and column configuration.
**Built and deployed:** the product described here is live; this document defines scope, not a pending approval.

---

## 1. What FlowQuery is

FlowQuery is a small, private Kanban application for managing software development work carried out by the owner and an AI-assisted development team.

- It is used first to manage its own development, and afterwards other projects.
- It is **not** a commercial SaaS product. It has no billing, plans, tenants or customer onboarding.
- It is deliberately simple. Every feature must earn its place against a straightforward alternative.

## 2. Design principles

1. **Fewer concepts.** Boards, tasks, people. Nothing else in the hierarchy.
2. **Explicit over clever.** Fixed behaviour beats configurable behaviour where the fixed behaviour is genuinely sufficient.
3. **Zero recurring cost.** A firm requirement, not a preference. See §12.
4. **Human UI and agent API are one application.** Same rules, same database, same business logic.
5. **The application works when Bob is offline.** No background jobs, queues or agent runtime.
6. **Nothing is hidden behind a slug.** A URL identifies a resource; it never authorises access.

## 3. Identities

There are three kinds of identity. They are deliberately different, and the differences are load-bearing.

| Identity | Authenticates with | Access | Notes |
|---|---|---|---|
| **Human administrator** | Human account (see §9) | Every board, full control | Exactly two initially: the owner and their friend. Equivalent rights. |
| **Bob** | Board-scoped agent token | Exactly one board, task-level operations only | Bob **is** the running AI Engineering Manager, whatever environment runs it. Not a separate agent, not a human account. |
| **Assignee profile** | Nothing — never authenticates | None | Labels for assignment: team members, AI specialists, contractor. Not accounts. |

### 3.1 Human administrators

- Both humans have **identical full access**. There is no role hierarchy between them.
- Either human can register, sign in, sign out, recover access, view all boards, create boards, rename boards, delete boards (with confirmation), and manage all board content.
- Registration is restricted. An arbitrary visitor must not be able to create an account and thereby see every board.
- Administrators are identified by the **immutable GitHub numeric user ID**. Usernames and email addresses are display-only; neither can grant, revoke or transfer access. A renamed GitHub account or a changed email address therefore changes nothing.

### 3.2 Bob

- Bob is the **running AI agent and Engineering Manager** - the manager reading this repository. Bob may run in OpenCode, Cursor, Cline, GitHub Copilot, Codex, ChatGPT, Claude, Gemini, DeepSeek or another environment; the tool is not the identity. Bob is not spawned as a sub-agent and has no FlowQuery human account.
- Bob authenticates to FlowQuery with a **board-scoped token** and interacts through the versioned REST API, never through browser automation.
- Bob's authority is limited to tasks, comments and activity **within the token's board**. Bob cannot create, rename or delete boards, reach the human dashboard, or read any other board.

### 3.3 Assignee profiles

- A profile represents a person or AI that work can be assigned to: the two human administrators, the specialist roster (Alex, Sarah, Olivia, Daniel, Marcus, James, Victoria, Chris, Emma, Liam, Priya, Ethan, Rebecca, Noah) and one anonymous contractor.
- Profiles are seeded data. They have no credentials, no sessions and no API tokens. Assigning work to a profile implies nothing about that profile's ability to log in.
- The roster is preserved from the existing project pack at `docs/agents/TEAM_DIRECTORY.md`.

## 4. Access model

Two independent doors, with no overlap:

```
Human door                              Agent door
──────────                              ──────────
session cookie                          Authorization: Bearer <board token>
any board                               exactly one board
board administration + tasks            tasks, comments, activity only
/boards, /boards/:boardId               /api/v1/agent/*
```

Rules that must hold at the API layer, not merely in the UI:

1. Every agent response is filtered by the token's board. A board identifier supplied by the agent is never trusted; the board comes from the token.
2. An agent token cannot reach board administration endpoints, and a human session cannot use `/api/v1/agent/*`.
3. An unknown or unauthorised board returns `404`, never `403`, so board existence is not disclosed.
4. Revoking a token invalidates it on the **next request**, including any agent session cookie derived from it.

## 5. Routes

| Route | Audience | Purpose |
|---|---|---|
| `/` | Public | Landing page. Signed-in humans are sent to `/boards`. |
| `/login` | Public | Human sign-in. |
| `/signup` | Public | Human registration, subject to §3.1 restrictions. |
| `/agent` | Agents | Agent sign-in using a board ID and token. |
| `/boards` | Human | Dashboard listing every board. |
| `/boards/:boardId` | Human | Kanban board. |

Unknown or inaccessible paths redirect to `/`. Board routes are **not** public: an unauthenticated visitor is redirected to `/login`.

## 6. Boards

A board is the only container in the product. There is no organisation, project, workspace or folder layer.

- Any human administrator can see **all** boards. There is no board sharing or per-board membership.
- Create: name only. The board ID is a stable, unguessable identifier generated at creation and is independent of the name.
- Rename: changes the name only. The ID, tasks, comments, activity and agent tokens are unaffected.
- Delete: **permanent**, after explicit confirmation. Deleting a board deletes its tasks, comments, activity history and agent tokens. This is a deliberate decision — see §7.3.

## 7. Kanban board

### 7.1 Fixed columns

Every board has exactly five columns, in this fixed order:

1. Backlog
2. To Do
3. In Progress
4. Review
5. Done

Columns cannot be created, renamed, reordered or deleted by humans or by Bob. Column order is part of the product, not configuration.

### 7.2 Tasks

A task belongs to exactly one board and one column. Fields:

| Field | Required | Notes |
|---|---|---|
| Title | Yes | 1–200 characters |
| Description | No | Plain text or Markdown; bounded length |
| Status / column | Yes | One of the five fixed columns |
| Position | Yes | Ordering within the column |
| Priority | Yes | None, Low, Medium, High, Urgent. Default None. |
| Assignee | No | A team profile, or unassigned |
| Due date | No | Calendar date, no time component |
| Comments | — | Append-only discussion |
| Activity | — | System-generated history |

Moving a task between columns and reordering within a column are supported by drag-and-drop **and** by an accessible keyboard alternative. The keyboard alternative is a requirement, not a nice-to-have.

### 7.3 Deletion semantics

Board deletion is permanent and confirmed, not archived. The UI must state what will be destroyed and require an explicit confirmation step that cannot be triggered by a single stray click. Tasks may be deleted individually; task deletion is also permanent.

Consequence to be documented in the UI: there is no recycle bin and no undo after confirmation. Recovery depends on database backups (see `SECURITY_AND_AUTH.md`).

## 8. Comments and activity

- **Comments** carry an author (human administrator or Bob), a body, and a timestamp. Comments are attributed to the acting identity, never to an assignee profile pretending to be an actor.
- **Activity** is system-generated and append-only: task created, updated, moved between columns, assignee changed, priority changed, due date changed, commented, deleted.
- Activity records the actor, the event type, a timestamp and a small structured payload (for example `from: "todo", to: "review"`). Activity is never editable.
- Both are visible in the board UI and readable through the agent API.

## 9. Human authentication requirements

The *mechanism* was an open decision (AUTH-01) and is now **decided: GitHub OAuth with a server-side allowlist**. These requirements bind it:

1. Only the intended humans can obtain an account.
2. Sessions survive a page reload and expire after a bounded idle period.
3. Session credentials are never readable by browser JavaScript.
4. Account recovery is possible without manual database surgery.
5. Registration cannot be used to enumerate or reach other people's data.
6. Authentication must work within the Cloudflare Workers **Free** CPU budget of **10 ms per request**, and must not require a paid email or identity service.
7. No password or credential material is ever stored in plaintext.

Requirement 6 rules out server-side password hashing on the free tier: a single PBKDF2-SHA256 hash at the minimum defensible iteration count costs ~26 ms of CPU, 2.6× the entire per-request budget (measured, `TECHNICAL_RESEARCH.md` §8). No free transactional email provider will send to arbitrary recipients without an owned domain, so password reset and magic links are also unavailable at zero cost.

The mechanism is therefore an external identity provider or passkeys. **Decided (AUTH-01): GitHub OAuth with a server-side allowlist**, which also delegates recovery to the provider. Administrators are identified by immutable GitHub numeric user ID. Rationale and rejected alternatives: `SECURITY_AND_AUTH.md` §4.

## 10. Bob's API

A versioned REST API under `/api/v1`, documented with OpenAPI, using the same service layer as the UI. Full contract: `API_SPECIFICATION.md`.

Bob can: read board information, list and search tasks, read task details, create tasks, edit tasks, delete tasks, move tasks between columns, set priority, assignee and due date, add and read comments, read activity.

Bob cannot: create, rename or delete boards, list other boards, read other boards, access human administration, or change board-level settings.

## 11. Decisions

All previously open decisions were settled by the owner on 3 November 2026 and are recorded in `DECISIONS.md`:

| ID | Decision |
|---|---|
| AUTH-01 | GitHub OAuth with a server-side allowlist |
| AUTH-02 | Both administrators use GitHub accounts |
| DEC-031 | Administrator identity is keyed on the immutable GitHub numeric user ID |
| SCOPE-01 | In-app notification centre dropped from the MVP |

Nothing is currently open. New questions arising during implementation are recorded in the register as Open rather than resolved silently.

## 12. Operating constraints

- **Zero recurring cost is a firm requirement.** The solution must run within genuinely free tiers, without Workers Paid, without paid email, and without any subscription.
- A Cloudflare `*.workers.dev` deployment URL is acceptable; no domain purchase is required.
- No paid service, billing activation, cloud resource creation or deployment occurs without explicit owner approval.
- The application must degrade visibly rather than silently incurring charges. Cloudflare offers **no hard spending cap**; the control is architectural — stay on the Free plan, never enable automatic upgrades, and monitor usage.

## 13. Out of scope

Explicitly excluded from the current version:

- Organisations, projects, workspaces, folders, or any hierarchy above boards.
- Per-board membership, sharing, invitations, guest access, or public links.
- Custom, reorderable or user-defined columns.
- Archive/restore or a recycle bin.
- Board templates, labels, checklists, attachments, sub-tasks, dependencies, estimates, time tracking, sprints, roadmaps, calendar or timeline views.
- Email and push notifications, and any in-app notification centre (SCOPE-01: dropped).
- Individual FlowQuery accounts or tokens for specialist agents.
- A permission or role engine beyond "human administrator" and "board-scoped agent".
- Commercial features: billing, subscriptions, plans, customer onboarding.
- MCP server, webhooks, queues, real-time updates, hosted agent execution, browser automation.
- Kubernetes, containers, microservices, or any second service.

## 14. What "done" looks like

The product is usable when:

1. Two humans can register (if permitted), sign in, and sign out.
2. Both humans see the same list of all boards.
3. A board can be created, renamed, and deleted with confirmation, and deletion removes its data.
4. A board shows the five fixed columns in order and every task in the correct column.
5. Tasks can be created, edited, moved and deleted, with priority, assignee and due date, by mouse and by keyboard.
6. Comments and activity are recorded and attributed correctly.
7. Bob can authenticate with a board token, read and modify tasks on that board, and is provably unable to reach any other board or board administration.
8. Revoking a token takes effect immediately.
9. The whole system runs on free tiers with no billing risk.

Measurable acceptance criteria: `REQUIREMENTS.md`.

## 15. Superseded assumptions — do not reintroduce

These appeared in earlier drafts of this repository and are now **wrong**. If a document, agent prompt or memory file states any of the following, it is stale:

| Superseded | Replaced by |
|---|---|
| Organisation → Project → Board → Column → Task hierarchy | Flat: boards only |
| Routes `/`, `/:organisationSlug`, `/:organisationSlug/:projectSlug`, `/:organisationSlug/:projectSlug/:boardSlug` | `/`, `/login`, `/signup`, `/agent`, `/boards`, `/boards/:boardId` |
| Public board links granting anonymous view or edit | Authenticated humans only |
| Public organisation directory | Does not exist |
| Configurable columns, column reordering, column deletion moving cards | Five fixed columns |
| Archive instead of delete | Permanent delete with confirmation |
| Board slugs as route identifiers | Stable, unguessable board IDs |
| Organisation ownership, memberships, roles | Two equal human administrators |
| Bob as a separate service account with an inbox | Bob is the running AI manager, not an account |
| Specialist agents as future FlowQuery accounts | Profiles only, never accounts |
| In-app notification centre with on/off control | Excluded pending SCOPE-01 |
| Workers Paid as an acceptable option | Workers Free only |
