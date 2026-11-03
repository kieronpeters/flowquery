# Phase Status

**Current phase:** M6 complete — comments and activity.
**Next gate:** owner approval for M7 (Bob's agent API).
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
| M5 Kanban and tasks | Complete | Task CRUD, detail drawer, ordering, drag-and-drop, keyboard moves |
| **M6 Comments and activity** | **Complete 2026-11-03** | Append-only comments and a board activity feed |
| M7 Agent API and tokens | Not started | Requires owner approval |
| M8 Hardening | Not started | — |
| M9 Deployment | Not started | Requires explicit deployment approval |

## M6 completion evidence

| Check | Result |
|---|---|
| `npm run typecheck` / `lint` / `build` | Pass |
| `npm test` | **113 tests passed**, 9 files |
| Comment added | `201`, attributed to the signed-in human |
| Markup in a comment | Stored and returned verbatim as text |
| Validation | empty, whitespace, >10 000 chars, non-string → `400` |
| Unknown task / wrong board | `404` |
| Comments listed | Oldest first, scoped to their task |
| Activity on create | `task.created` with title and column |
| Activity on priority change | `task.priority_changed` with `{from, to}` |
| Activity on description change | `task.description_changed` with **no text** in the payload |
| Activity on a column move | exactly one `task.moved` with `{from, to}` |
| Activity on a reorder within a column | **no event** |
| Activity on comment and delete | `comment.added`, `task.deleted` |
| Deletion event survives | Written with `task_id = NULL`; task-scoped events cascade |
| Feed ordering and paging | Newest first; `limit` + `before` cursor returns the remainder |
| Browser: comment with `<script>` | Rendered as literal text, `window.__pwned` stayed false, no injected elements |
| Browser: feed | "created", "commented", "moved" rendered newest-first |

## Design note

Activity records **what changed and who changed it**, one event per real change. It deliberately does not diff field values into the feed: a description can be 20,000 characters, and `task.description_changed` carries an empty payload. Reordering within a column produces no event — that is churn, not history.

Deleting a task used to erase the deletion event along with the task, because the event referenced the task it described. It is now written with a null task reference so the board keeps the fact that the task existed.

## Explicitly not done

No agent API or tokens. No notifications. No remote repository, deployment or cost.
