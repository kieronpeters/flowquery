# FlowQuery — Requirements and Acceptance Criteria

**Status:** Authoritative, 3 November 2026. Derived from `MVP_SPECIFICATION.md`.
**Purpose:** the testable layer. Every MUST here becomes at least one automated test before the milestone that owns it is closed.

Identifiers are stable. Use them in commit messages, tests and bug reports (`NAV-004 fails when…`).

---

## 1. Navigation and routing

| ID | Level | Requirement |
|---|---|---|
| NAV-001 | MUST | `/` renders a landing page; a signed-in human is redirected to `/boards`. |
| NAV-002 | MUST | `/login` and `/signup` are reachable without a session. |
| NAV-003 | MUST | `/boards` requires a human session; unauthenticated visitors are redirected to `/login`. |
| NAV-004 | MUST | `/boards/:boardId` requires a human session and renders that board. |
| NAV-005 | MUST | `/agent` renders an agent sign-in form accepting a board ID and token. |
| NAV-006 | MUST | Any unknown path redirects to `/`. |
| NAV-007 | MUST | A valid session is not invalidated by a hard refresh or a direct deep-link visit. |

**Acceptance:** direct navigation (hard refresh, pasted URL) to each route behaves as specified; a client-side route change never renders another user's data; unknown paths land on `/`.

## 2. Authentication and registration

Mechanism is AUTH-01 (open). These hold regardless of mechanism.

| ID | Level | Requirement |
|---|---|---|
| AUTH-001 | MUST | Only a human on the configured allowlist can complete registration and obtain an account. |
| AUTH-002 | MUST | A failed or non-allowlisted sign-in creates no account and discloses no board data. |
| AUTH-003 | MUST | Sessions are held in a cookie that is `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and carries the `__Host-` prefix. |
| AUTH-004 | MUST | Session tokens are stored server-side only as a hash, never in plaintext. |
| AUTH-005 | MUST | Sessions expire after a bounded idle period and can be terminated explicitly by sign-out. |
| AUTH-006 | MUST | Sign-out invalidates the server-side session, not merely the cookie. |
| AUTH-007 | MUST | State-changing requests are rejected unless the request `Origin` matches the application origin. |
| AUTH-008 | MUST | No password, credential or token appears in a URL, a log line, or client-side JavaScript. |
| AUTH-009 | SHOULD | A human can recover access without manual database intervention (recovery path depends on AUTH-01). |
| AUTH-010 | MUST | Authentication completes within the Workers Free CPU budget of 10 ms, verified by measurement, not assumption. |
| AUTH-011 | MUST | Administrator identity is keyed on the immutable GitHub numeric user ID. Username and email are display-only and cannot grant, revoke or transfer access. |

## 3. Boards

| ID | Level | Requirement |
|---|---|---|
| BOARD-001 | MUST | `/boards` lists every board, for both human administrators, with no filtering by ownership. |
| BOARD-002 | MUST | A human can create a board with a name; the board receives a stable, unguessable ID. |
| BOARD-003 | MUST | A human can rename a board; ID, tasks, comments, activity and tokens are unchanged. |
| BOARD-004 | MUST | A human can delete a board only after an explicit confirmation step that states the consequences. |
| BOARD-005 | MUST | Deleting a board deletes its tasks, comments, activity and agent tokens in the same transaction. |
| BOARD-006 | MUST | A board with no session returns `404` to an unauthenticated request, not board content. |
| BOARD-007 | MUST | Board IDs are independent of board names; renaming never changes a URL. |

## 4. Columns

| ID | Level | Requirement |
|---|---|---|
| COL-001 | MUST | Every board exposes exactly five columns in this order: Backlog, To Do, In Progress, Review, Done. |
| COL-002 | MUST | Columns cannot be created, renamed, reordered or deleted through the UI or the API. |
| COL-003 | MUST | Task counts per column are correct after any task operation. |

## 5. Tasks

| ID | Level | Requirement |
|---|---|---|
| TASK-001 | MUST | A task has title, description, status, position, priority, assignee, due date, created/updated timestamps. |
| TASK-002 | MUST | Title is required, trimmed, and between 1 and 200 characters. |
| TASK-003 | MUST | Priority is one of None, Low, Medium, High, Urgent; default None. |
| TASK-004 | MUST | Assignee is a seeded team profile or empty; an unknown profile is rejected. |
| TASK-005 | MUST | Due date is a calendar date (no time) and may be empty. |
| TASK-006 | MUST | A task can be created directly into any of the five columns. |
| TASK-007 | MUST | A task can be moved between columns and reordered within a column by drag-and-drop. |
| TASK-008 | MUST | Every drag-and-drop operation has an equivalent keyboard-only path. |
| TASK-009 | MUST | A move updates both column and position atomically; no intermediate state is observable. |
| TASK-010 | MUST | Task deletion is permanent and requires confirmation. |
| TASK-011 | MUST | Task data persists across reloads. |
| TASK-012 | MUST | A concurrently modified task is not silently overwritten: the write returns `409` and the client re-fetches. |
| TASK-013 | MUST | Description length is bounded and enforced server-side. |

## 6. Comments and activity

| ID | Level | Requirement |
|---|---|---|
| COM-001 | MUST | A human or Bob can add a comment to a task; comments are append-only. |
| COM-002 | MUST | A comment records its author identity, body and timestamp. |
| COM-003 | MUST | Comments are rendered as text, never as raw HTML (no script execution). |
| ACT-001 | MUST | Creating, editing, moving, reassigning, reprioritising, commenting on and deleting a task records an activity event. |
| ACT-002 | MUST | Activity events record actor, event type, timestamp and a structured payload. |
| ACT-003 | MUST | Activity is read-only through every interface. |
| ACT-004 | MUST | Activity is ordered newest-first and paginated. |

## 7. Agent API and tokens

| ID | Level | Requirement |
|---|---|---|
| AGT-001 | MUST | A human can create an agent token for a board, with a human-readable label. |
| AGT-002 | MUST | The plaintext token is displayed exactly once, at creation; it is never retrievable afterwards. |
| AGT-003 | MUST | Only a SHA-256 hash of the token is stored; the plaintext is never persisted or logged. |
| AGT-004 | MUST | Multiple tokens can exist for one board and are independently labelled. |
| AGT-005 | MUST | A token can be revoked individually; revocation takes effect on the next request. |
| AGT-006 | MUST | A token grants access to exactly one board; every agent response is scoped by the token's board. |
| AGT-007 | MUST | A token cannot reach another board, the dashboard, or any board-administration endpoint. |
| AGT-008 | MUST | A board ID supplied by an agent is ignored or validated against the token; it is never trusted. |
| AGT-009 | MUST | Tokens are conveyed only in the `Authorization: Bearer` header, never in a URL or query string. |
| AGT-010 | MUST | Bob can read tasks, read one task, create, edit and delete tasks, move tasks, set priority/assignee/due date, comment, and read activity. |
| AGT-011 | MUST | Tokens record `last_used_at` and `revoked_at`. |
| AGT-012 | MUST | Agent sign-in at `/agent` never establishes access to the human dashboard. |

## 8. API contract

| ID | Level | Requirement |
|---|---|---|
| API-001 | MUST | All endpoints live under `/api/v1`. |
| API-002 | MUST | Responses are JSON with consistent error shapes and stable error codes. |
| API-003 | MUST | Invalid input returns `400` with field-level detail; unauthenticated returns `401`; unauthorised returns `404`. |
| API-004 | MUST | The API is documented as an OpenAPI 3.1 document served by the application. |
| API-005 | MUST | The UI and the API resolve through the same service layer; no business rule is duplicated in a route handler. |
| API-006 | MUST | List endpoints are paginated with a documented maximum page size. |
| API-007 | SHOULD | Task search filters by column, priority, assignee and title substring. |
| API-008 | MUST | Request bodies are size-limited and schema-validated before reaching the database. |

## 9. Security

| ID | Level | Requirement |
|---|---|---|
| SEC-001 | MUST | Every database query that returns tenant data is scoped by board. |
| SEC-002 | MUST | Automated tests prove board A cannot read or mutate board B, for every resource type. |
| SEC-003 | MUST | Automated tests prove a revoked token and a malformed token are rejected. |
| SEC-004 | MUST | All SQL uses bound parameters; no string interpolation of user data. |
| SEC-005 | MUST | User content is escaped on output; stored content is treated as text. |
| SEC-006 | MUST | No secret, token or credential is committed to the repository or written to logs. |
| SEC-007 | MUST | Security headers are set on HTML responses: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`. |
| SEC-008 | MUST | Board content returned by the API is treated as untrusted data by Bob, never as instructions. |

## 10. Operational

| ID | Level | Requirement |
|---|---|---|
| OPS-001 | MUST | The application runs on Cloudflare Workers Free and D1 Free only. |
| OPS-002 | MUST | A request costs no more than 10 ms CPU; measured, with the measurement recorded. |
| OPS-003 | MUST | Local development requires no Cloudflare account and no paid service. |
| OPS-004 | MUST | Database schema changes are applied through versioned migrations. |
| OPS-005 | MUST | A documented export/restore procedure exists and has been exercised before deployment. |
| OPS-006 | MUST | `README.md` setup instructions are verified from a clean clone on Windows. |
| OPS-007 | MUST | No deployment, cloud resource, domain or paid plan exists without explicit owner approval. |

---

## Traceability

| Spec section | Requirements |
|---|---|
| §5 Routes | NAV-* |
| §3.1 Humans, §9 Auth | AUTH-* |
| §6 Boards, §7.3 Deletion | BOARD-* |
| §7.1 Columns | COL-* |
| §7.2 Tasks | TASK-* |
| §8 Comments and activity | COM-*, ACT-* |
| §3.2 Bob, §4 Access model, §10 API | AGT-*, API-* |
| §12 Operating constraints | OPS-* |

## Definition of done for any milestone

A milestone is complete only when: its MUST requirements have passing automated tests, the exact commands and their real output are recorded in the handoff, `npm run typecheck` and `npm run lint` are clean, and the documentation affected by the change has been updated in the same commit.
