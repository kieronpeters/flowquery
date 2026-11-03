# FlowQuery — Architecture and Technical Design

**Status:** Authoritative technical design, updated 3 November 2026 after implementation. Everything below describes what was built; where the original plan changed, the change and its reason are stated.
**Constraint that shapes everything below:** zero recurring cost. Cloudflare Workers **Free** and D1 **Free** only.

---

## 1. Shape

One Worker, one database, one build. No second service.

```text
   Human browser                    Bob (OpenCode, owner's PC)
        │                                    │
        │ HTTPS + session cookie             │ HTTPS + Bearer <board token>
        ▼                                    ▼
  ┌────────────────────────────────────────────────────┐
  │  Cloudflare Worker  (single deployment)            │
  │                                                    │
  │  static assets ──► React SPA   (free, unmetered)   │
  │  /api/*        ──► Hono router ──► services        │
  │                                    └─► repositories│
  └───────────────────────────┬────────────────────────┘
                              ▼
                       Cloudflare D1 (SQLite)
```

Why this is the smallest thing that works: the SPA is static files on the same origin as the API, so there is no CORS, no second host, no token in browser storage, and no separate deploy pipeline. `*.workers.dev` is an acceptable hostname, so no domain is required.

## 2. Request routing (this is where free-tier safety lives)

The Worker configuration must do exactly this:

- `assets.directory` → the built SPA (`./dist`).
- `assets.not_found_handling` → `"single-page-application"`: unmatched non-API paths return `index.html` with `200`.
- `assets.run_worker_first` → `["/api/*"]` **only**.

Consequences, which are deliberate:

1. Page loads and refreshes are served as static assets and **do not invoke the Worker**. They are free and unmetered, so browsing can never exhaust the 100,000 requests/day budget.
2. Only API calls consume the request budget. At two humans that is a few hundred calls per day.
3. Client-side routing handles all page paths; the server never issues a `302` for an unknown path. `/boards/does-not-exist` therefore renders the SPA, which asks the API, gets `404`, and redirects to `/`. Requirement NAV-006 is satisfied in the client because server-side redirects for page routes would require `run_worker_first: ["*"]` — which would make every page view billable and turn a quota overrun into a broken app rather than a degraded one.

## 3. Layers

| Layer | Responsibility | Rule |
|---|---|---|
| `routes/` | Parse request, authenticate, validate with Zod, call one service function, map result to HTTP | No SQL. No business rules. |
| `services/` | Business rules, authorisation decisions, transactions | No HTTP objects. No SQL strings. |
| `repositories/` | All SQL. Every function takes a scope (`boardId`) | The only place SQL exists. |
| `db/` | Schema, migrations, seeds, query helpers | — |

`API-005` is enforced by structure, not discipline: if a rule lives in a route handler, it cannot be reused by the other door — and there are two doors (human session, agent token).

## 4. Two doors, one core

```text
/api/v1/boards/:boardId/...   ← human session, board from path, checked
/api/v1/agent/...             ← agent token, board from token, never from client
                    └──────────────┬──────────────┘
                            same services
```

Both resolve to the same service calls. The difference is only *how the acting identity and its board scope are established*:

- Human: session cookie → `users.id` → scope = all boards.
- Agent: `Authorization: Bearer` → `agent_tokens` lookup by hash → scope = exactly one `board_id`.

Because the agent's board never comes from the request, `AGT-008` is true by construction rather than by validation. Implemented in M7; the isolation suite runs every agent route against a second board.

## 5. Frontend

What is actually in use, as built:

| Concern | Choice | Status |
|---|---|---|
| Build | Vite | in use |
| Framework | React 19 + TypeScript (strict) | in use |
| Routing | React Router | in use |
| Server state | **plain `fetch` in component state** | in use |
| Styling | **hand-written CSS with custom properties** | in use |
| Drag & drop | dnd-kit (keyboard sensors) | in use |
| Validation | **hand-written validators in the service layer** | in use |

**The last three were changed from the original proposal, and the reason matters:** TanStack Query, Tailwind and Zod were all considered and dropped. At this size each would add a dependency, a layer of indirection, or a build step without removing any real problem — the app has one cache, one stylesheet and about a dozen validation rules. If the board grows to the point where cache invalidation becomes fiddly, TanStack Query is the first thing to add back.

Notes:

- **Drag-and-drop is optimistic but reconciled.** A drop updates the view immediately, fires the move request, then replaces the whole board with the server's response. On `409` it refetches and says so rather than trying to repair the optimistic state locally.
- **The keyboard alternative is a first-class path, not a fallback.** The task drawer has ← → across columns and ↑ ↓ within a column, which call the same endpoint as a drop. `TASK-008` therefore does not depend on a keyboard drag implementation behaving.
- The design direction document describes a richer product (sidebar sections, reports, calendar). Only the MVP shell is in scope: header, board list, board. Preserved visual language, not preserved feature list.

## 6. Authentication seam

Decided (AUTH-01): **GitHub OAuth with a server-side allowlist**, keyed on the immutable GitHub numeric id. Implemented at M3. Cloudflare Access and passkeys were documented alternatives and rejected — see `SECURITY_AND_AUTH.md` §4.

The mechanism sits behind one interface so it stays replaceable:

```ts
interface AuthProvider {
  begin(req): Response            // start sign-in (OAuth redirect) or no-op
  complete(req): Identity | null  // callback / assertion → verified identity
  identityFromSession(req): Identity | null
}
```

Everything above the seam depends only on `Identity { userId, email, displayName }`. Swapping GitHub OAuth for passkeys changes one module, the `auth_identities` table contents, and two routes — not the services.

Whatever is chosen must satisfy `AUTH-003` (cookie flags), `AUTH-004` (hashed session tokens) and `AUTH-010` (10 ms CPU). See `SECURITY_AND_AUTH.md` for the analysis.

## 7. CPU budget (the real technical risk)

Workers Free allows **10 ms of CPU per request**; I/O wait is not counted. What a board request actually spends:

| Work | Reality |
|---|---|
| Session check | SHA-256 of the cookie token + one indexed lookup. Measured at 0.033 ms |
| Input validation | Hand-written checks, well under 0.1 ms |
| D1 queries (2–4) | I/O — excluded from the CPU budget |
| JSON serialisation | The dominant cost, measured below |

**Measured** (Node/V8 on the developer machine, not workerd — order of magnitude only):

| Tasks in board | Payload | Median assembly + serialise | p95 |
|---|---|---|---|
| 9 (demo board) | 4.8 KB | 0.033 ms | 0.067 ms |
| 50 | 24.8 KB | 0.154 ms | 0.406 ms |
| 200 | 98.0 KB | 0.578 ms | 1.317 ms |
| 500 | 244.5 KB | 1.620 ms | 2.702 ms |

The agent task list (50 tasks, one page) measures 0.137 ms median. At 500 tasks the CPU-bound work uses roughly 16% of the budget, which is why the 500-character description cap (DEC-025) is a safety margin rather than a necessity at this scale.

Controls:

1. **Bound everything.** Title 200 chars, description 20,000 chars, comment 10,000 chars, page size ≤ 100.
2. **Never serialise an unbounded board.** The board endpoint returns tasks for the visible columns with descriptions truncated to 500 characters; a task detail request returns the full description. This keeps the hot path flat as the board grows.
3. **Measure, don't assume.** The milestone that introduces the board endpoint records actual CPU time from Workers logs. If it exceeds 6 ms, the payload strategy changes before more features land on it.
4. **No heavy crypto on the hot path.** Session verification is HMAC (fast). Password hashing is excluded because it is not compatible with this budget — see §6.
5. **No SSR.** Server-side rendering of React would consume the CPU budget on every page view. The SPA is static.

## 8. Data flow — moving a task

```text
1. Client: optimistic reorder in cache
2. PATCH /api/v1/agent/tasks/:id/move  { status, position, expectedVersion }
3. Route: authenticate → validate → service
4. Service: load task (scoped) → check version → compute new ordering
5. Repository: one db.batch():
      UPDATE tasks SET status, position, version=version+1
      UPDATE tasks SET position … (affected neighbours)
      INSERT activity_event (moved)
6. Response 200 with the authoritative ordering
7. On 409: client refetches and explains rather than retrying blindly
```

One `batch()` = one transaction and one query against the 50-queries-per-invocation allowance, which is why reordering uses a batch rather than a loop of statements.

## 9. Local development

- `vite dev` + Wrangler's Vite plugin run on `workerd` locally; D1 is emulated locally and persists between runs.
- No Cloudflare account, no login, no network access required for day-to-day development.
- `wrangler d1 migrations apply --local` for schema; `--remote` only when a real deployment exists.
- Local and remote data are entirely separate — never assume a local seed exists in production.

## 10. Failure behaviour

| Failure | Behaviour |
|---|---|
| D1 unavailable | `503` with a generic message; the SPA shows a retry banner. No stack traces to the client. |
| Free request quota exhausted | API returns Cloudflare `1027`; the app shows an explicit "daily limit reached" state rather than a blank screen. |
| CPU limit exceeded | `1102` from the platform; logged as a defect with the request that caused it. |
| Invalid session | `401`; client clears the cookie and redirects to `/login`. |
| Revoked agent token | `401`; Bob reports the blocker to the owner rather than retrying. |

## 11. Deliberately not added

No ORM, no GraphQL, no tRPC, no state-management library, no component library, no Docker, no CI service beyond GitHub Actions, no queue, no KV, no Durable Objects, no R2, no third-party auth service that could start charging, no analytics, no feature flags. Each was considered and rejected as cost or complexity without a matching requirement.

## 12. Ownership of technical decisions

The consequential choices are recorded in `DECISIONS.md`: the router, the absence of an ORM, tasks-as-an-enum-of-status, the authentication seam, and the three frontend libraries that were considered and dropped. Each was reversible in a day when it was made; none would be reversible after three months of code — which is why they were written down before implementation, and updated here after it.
