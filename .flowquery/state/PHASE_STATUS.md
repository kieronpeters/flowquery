# Phase Status

**Current phase:** M7 complete — Bob's agent API.
**Next gate:** owner approval for M8 (hardening and release preparation).
**Last updated:** 2026-11-03.

## Phase history

| Phase | Status | Outcome |
|---|---|---|
| Initial package assembly | Complete | Project pack, team roster, concept images, early research |
| Requirements consolidation (v1) | Complete — superseded | Organisation → project → board hierarchy; never implemented |
| Access-control investigation | Complete — resolved by scope change | Hierarchy removed; authenticated-humans-only chosen |
| Specification consolidation (v2) | Complete 2026-11-03 | Flat board model; single decisions register |
| Owner review and approval | Complete 2026-11-03 | AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030 |
| M1 Repository foundation | Complete | Git, toolchain, structure, OpenCode agents, smoke test |
| M2 Walking skeleton | Complete | D1 schema, seeds, read-only board, CPU measurement, restore drill |
| M3 Human authentication | Complete | GitHub OAuth + PKCE, allowlist, sessions, CSRF, rate limiting |
| M4 Boards and dashboard | Complete | Board list, create, rename, permanent delete with cascade |
| M5 Kanban and tasks | Complete | Task CRUD, ordering, drag-and-drop, keyboard moves |
| M6 Comments and activity | Complete | Append-only comments and a board activity feed |
| **M7 Agent API and tokens** | **Complete 2026-11-03** | Board-scoped tokens, `/agent` namespace, OpenAPI, isolation suite |
| M8 Hardening | Not started | Requires owner approval |
| M9 Deployment | Not started | Requires explicit deployment approval |

## M7 completion evidence

| Check | Result |
|---|---|
| `npm run typecheck` / `lint` / `build` | Pass |
| `npm test` | **142 tests passed**, 11 files |
| Token creation | `fq_` + 32 bytes; prefix shown; plaintext returned once |
| Storage | SHA-256 only; a test asserts the plaintext never appears in a list response |
| Multiple tokens per board | Yes, independently labelled |
| Revocation | `204`; the token returns `401` on the next request |
| Revocation through another board | `404` |
| Agent reads its board | 200, correct board and task count |
| Agent lists tasks | Only its own; filters for status, priority, title |
| Cross-board read, update, move, delete, comment | **404 in every case**, and the task is unchanged |
| Agent activity | Sees only its own board's events |
| Agent writes | Attributed to the token label with `actorType: 'agent'` |
| Missing / malformed / unknown token | `401`, identical response |
| Session cookie on the agent door | `401` |
| Bearer token on the human door | `401` |
| Agent reaching board administration | `404` |
| `last_used_at` | Updated on use |
| OpenAPI 3.1 | Served at `/api/v1/openapi.json` |

## End-to-end proof outside the test suite

A token created in the dashboard was used from a shell to read the board, filter the backlog (3 tasks), create a task, and comment on it. The board then held 10 tasks with the new one in To Do, and activity recorded both actions as `Bob - verification [agent]`. Revoking the token from the UI made the next call return `401`.

## Design note

The agent namespace contains no board parameter anywhere — no path segment, body field or query value. `boardId` is read from the credential row. Isolation is therefore structural: there is no code path that could trust a client-supplied board id, because none exists.

## Explicitly not done

No hardening pass, no deployment. No remote repository or cost.
