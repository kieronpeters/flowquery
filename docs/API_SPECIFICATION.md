# FlowQuery — API Specification

**Status:** Authoritative contract, 3 November 2026. Not yet implemented. OpenAPI 3.1 document to be served at `/api/v1/openapi.json` during implementation (`API-004`).

Base path: `/api/v1`. All requests and responses are `application/json; charset=utf-8` except the OpenAPI document.

---

## 1. Two namespaces

| Namespace | Authenticated by | Board scope |
|---|---|---|
| `/api/v1/…` | Human session cookie | Any board; board comes from the path and is checked |
| `/api/v1/agent/…` | `Authorization: Bearer <token>` | Exactly one board; board comes from the token and is never read from the request |

A human session cannot call `/api/v1/agent/*`. A bearer token cannot call anything outside `/api/v1/agent/*`. Both namespaces call the same service layer.

## 2. Conventions

- **IDs** are opaque strings (`brd_…`, `tsk_…`, `usr_…`, `tok_…`). Clients must not parse them.
- **Timestamps** are ISO-8601 UTC strings in JSON (`2026-11-03T09:41:22.184Z`). Stored internally as unix milliseconds.
- **Due dates** are `YYYY-MM-DD` — a calendar date with no time or timezone.
- **Nullable** fields are present and `null`, never omitted.
- **Mutating requests** require `Content-Type: application/json` and a matching `Origin` header (`AUTH-007`).
- **Concurrency**: task mutations may include `expectedVersion`. Omit it to force the write; include it to be protected.
- **Pagination**: `?limit=` (default 50, max 100) and `?cursor=`. Responses include `{ "data": [...], "nextCursor": string | null }`.

### Error shape

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Title must be between 1 and 200 characters.",
    "fields": { "title": "must be 1-200 characters" },
    "requestId": "req_01JB..."
  }
}
```

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Body or query failed schema validation |
| 401 | `UNAUTHENTICATED` | Missing, malformed, expired or revoked credential |
| 403 | `FORBIDDEN` | Authenticated but the action is not permitted for this identity type |
| 404 | `NOT_FOUND` | Resource does not exist **or is not visible to this caller** — never `403` for scope failures |
| 409 | `CONFLICT` | `expectedVersion` did not match, or ordering conflict |
| 413 | `PAYLOAD_TOO_LARGE` | Body exceeded the documented limit |
| 429 | `RATE_LIMITED` | Too many attempts |
| 503 | `UNAVAILABLE` | Database or dependency failure |

`requestId` is always present and appears in server logs, so a user-visible error can be traced without exposing internals.

## 3. Authentication endpoints (human)

Provider-agnostic by design, so AUTH-01 can change without breaking the contract.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/start` | Begins sign-in. `302` to the provider, or `200` if the chosen mechanism needs no redirect. Sets a short-lived, signed `state` cookie. |
| `GET` | `/auth/callback` | Provider callback. Verifies `state`, resolves or creates the allow-listed user, creates a session, sets the cookie, redirects to `/boards`. |
| `POST` | `/auth/signup` | Registration completion for mechanisms that need it. `400` if the identity is not on the allowlist. |
| `POST` | `/auth/logout` | Deletes the session row and clears the cookie. `204`. |
| `GET` | `/auth/me` | Returns the current human identity, or `401`. |

Session cookie: `__Host-fq_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, 30-day absolute expiry with idle refresh.

**Sign-up restriction is enforced server-side** by an allowlist (`AUTH-001`). A non-allow-listed identity receives `403 FORBIDDEN` with the message "This FlowQuery instance is private." No account, no session, no board data.

## 4. Boards (human)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/boards` | All boards, newest first: `id, name, createdAt, updatedAt, taskCount`. |
| `POST` | `/boards` | Create. Body `{ name }`. Returns `201` with the board. |
| `GET` | `/boards/{boardId}` | Board metadata plus columns and task counts. `404` if absent. |
| `PATCH` | `/boards/{boardId}` | Rename. Body `{ name }`. ID is unchanged (`BOARD-003`). |
| `DELETE` | `/boards/{boardId}` | **Permanent.** Requires `{ "confirm": true, "confirmName": "<exact board name>" }`. `409` if the name does not match. Cascades to tasks, comments, activity and tokens. |

Deletion deliberately requires typing the board name: it is irreversible (`BOARD-004`, `BOARD-005`).

## 5. Agent tokens (human)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/boards/{boardId}/tokens` | List: `id, label, tokenPrefix, createdAt, lastUsedAt, revokedAt`. Never the secret. |
| `POST` | `/boards/{boardId}/tokens` | Create. Body `{ label }`. Returns `201` with `token` (**only time the plaintext is returned**) and the metadata. |
| `DELETE` | `/boards/{boardId}/tokens/{tokenId}` | Revoke. `204`. Effective on the next request. |
| `POST` | `/agent` (page) | Human-facing agent sign-in page; not an API endpoint. |

Plaintext token format: `fq_` + 32 CSPRNG bytes, base32. Displayed once with a copy control and a warning that it cannot be shown again (`AGT-002`).

## 6. Tasks — human namespace

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/boards/{boardId}/tasks` | List/filter. `?status=&priority=&assignee=&q=` |
| `POST` | `/boards/{boardId}/tasks` | Create. Body below. Returns `201`. |
| `GET` | `/boards/{boardId}/tasks/{taskId}` | Full task including complete description. |
| `PATCH` | `/boards/{boardId}/tasks/{taskId}` | Partial update. |
| `DELETE` | `/boards/{boardId}/tasks/{taskId}` | Delete. `204`. |
| `POST` | `/boards/{boardId}/tasks/{taskId}/move` | Move/reorder. |
| `GET` | `/boards/{boardId}/tasks/{taskId}/comments` | List comments, oldest first. |
| `POST` | `/boards/{boardId}/tasks/{taskId}/comments` | Add comment. `201`. |
| `GET` | `/boards/{boardId}/activity` | Board activity, newest first, paginated. |
| `GET` | `/boards/{boardId}/profiles` | Assignable team profiles. |
| `GET` | `/columns` | The five fixed columns (constant, same for every board). |

## 7. Tasks — agent namespace

Identical operations, board implied by the token, no `boardId` in any path:

```text
GET    /agent/board
GET    /agent/tasks
POST   /agent/tasks
GET    /agent/tasks/{taskId}
PATCH  /agent/tasks/{taskId}
DELETE /agent/tasks/{taskId}
POST   /agent/tasks/{taskId}/move
GET    /agent/tasks/{taskId}/comments
POST   /agent/tasks/{taskId}/comments
GET    /agent/activity
GET    /agent/profiles
GET    /agent/columns
```

`GET /agent/board` returns the token's board (id, name, task counts) so Bob can confirm scope before acting. This is also the cheapest way for Bob to verify a token is live and correctly scoped.

There is **no** `POST /agent/boards`, `PATCH /agent/boards/*` or `DELETE /agent/boards/*`. Those paths do not exist for agents (`AGT-007`).

## 8. Payloads

### Task object

```json
{
  "id": "tsk_01JB8Q…",
  "boardId": "brd_01JB7X…",
  "title": "Consolidate the specification",
  "description": "Full text…",
  "descriptionTruncated": false,
  "status": "in_progress",
  "position": 2,
  "priority": "high",
  "assignee": { "id": "prf_alex", "displayName": "Alex", "roleTitle": "Senior Software Engineer" },
  "dueDate": "2026-11-14",
  "version": 7,
  "createdAt": "2026-11-03T09:41:22.184Z",
  "updatedAt": "2026-11-03T11:02:00.000Z",
  "createdBy": { "type": "human", "id": "usr_…", "name": "Kieron" }
}
```

`descriptionTruncated` is `true` only in board/list responses, where descriptions are cut at 500 characters to protect the CPU budget (see `ARCHITECTURE.md` §7). Fetch the single task for the full text.

### Create task

```json
{
  "title": "Add token revocation",
  "description": "Optional.",
  "status": "backlog",
  "priority": "medium",
  "assigneeProfileId": "prf_sarah",
  "dueDate": "2026-11-20"
}
```

`status` defaults to `backlog`. `position` defaults to the end of that column. All fields validated server-side; unknown fields are rejected rather than ignored.

### Move task

```json
{ "status": "review", "position": 0, "expectedVersion": 7 }
```

Response returns the authoritative ordering for the affected columns so the client can reconcile an optimistic update.

### Update task

Partial body; only supplied fields change. `assigneeProfileId` accepts `null` to unassign. `dueDate` accepts `null` to clear.

## 9. Validation limits

| Field | Limit |
|---|---|
| Board name | 1–120 characters |
| Token label | 1–80 characters |
| Task title | 1–200 characters |
| Task description | ≤ 20,000 characters |
| Comment body | 1–10,000 characters |
| Search query `q` | ≤ 40 **bytes** (D1 caps `LIKE` patterns at 50 bytes) |
| Page size | ≤ 100 |
| Request body | ≤ 256 KB |

## 10. Authorisation rules, stated once

1. Human session: may access every board and every human endpoint.
2. Agent token: may access the task/comment/activity/profiles/columns endpoints **for its own board only**.
3. Agent token: may not access boards, tokens, sessions or the dashboard, even for its own board.
4. Any scope failure returns `404` (not `403`) so that board existence is not disclosed to a token that should not know it.
5. A revoked token returns `401` immediately — there is no cached session to expire.
6. The only `403` in the API is a non-allow-listed human attempting registration.

## 11. Rate limiting

Deliberately minimal, because the credentials are high-entropy and the user count is two:

- Token-authenticated requests: failures are counted per token prefix per minute; more than 20 failures returns `429` for 60 seconds.
- `/auth/*`: more than 10 requests per IP per minute returns `429`.
- The limiter is a bounded D1 counter row, not a paid WAF product.

## 12. What the API deliberately does not expose

No endpoint lists users, creates users, changes roles, or grants board access. There is no admin surface beyond "these are the boards" because there is no administrative hierarchy to manage. This is a security property, not an omission.
