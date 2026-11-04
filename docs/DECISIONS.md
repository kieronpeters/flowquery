# FlowQuery — Decisions Register

**Status:** single authoritative register, updated 3 November 2026.
**Rule:** a decision that is not here does not exist. Anything recorded elsewhere is either a link to this file or superseded.

Statuses: **Approved** = the owner has stated it. **Proposed** = Bob recommends it, awaiting approval. **Open** = needs the owner. **Superseded** = replaced, kept for history.

---

## Approved — product direction (owner, 2026-11-03)

| ID | Decision | Consequence |
|---|---|---|
| DEC-001 | FlowQuery is a private Kanban app for the owner and an AI-assisted team; not a commercial product | No billing, plans, tenants or onboarding |
| DEC-002 | Flat structure: **boards only** — no organisations, projects, workspaces or folders | Removes a whole hierarchy, and the routes, tables and permissions that went with it |
| DEC-003 | Routes are `/`, `/login`, `/signup`, `/agent`, `/boards`, `/boards/:boardId` | Unknown or inaccessible paths redirect to `/`; board routes require a session |
| DEC-004 | Specialist agents are **assignee profiles only** — never accounts, never credentials, permanently | Bob is the sole AI writer |
| DEC-005 | Two human administrators (owner and friend) with **identical full access**; registration restricted | No role hierarchy; registration allowlist required |
| DEC-006 | Five **fixed** columns: Backlog, To Do, In Progress, Review, Done | No column CRUD for humans or agents |
| DEC-007 | Board deletion is **permanent**, with explicit confirmation; no archive | Cascades to tasks, comments, activity and tokens; backed by database backups only |
| DEC-008 | Tasks carry title, description, status, priority (None/Low/Medium/High/Urgent), assignee profile, due date, comments, activity | — |
| DEC-009 | Bob is the **current OpenCode session**; not a separate service account, not spawnable | Corrects the previous "service identity with an inbox" model |
| DEC-010 | Agent access uses **board-scoped bearer tokens**: multiple per board, labelled, individually revocable, stored hashed | Board ID is never trusted from the client |
| DEC-011 | Bob's permissions are task-level only: no board create, rename or delete, no dashboard, no other board | Enforced at the API layer, not the UI |
| DEC-012 | React + TypeScript, Cloudflare Workers, D1, static assets, GitHub | Proposed stack, now approved as the direction |
| DEC-013 | **Zero recurring cost is a firm requirement.** Workers Free + D1 Free; `*.workers.dev` acceptable; no domain | Rules out Workers Paid, paid email and any subscription |
| DEC-014 | No queues, webhooks, realtime, hosted agents or unnecessary polling | Bob polls only while active |

## Approved — technical (owner accepted the above direction; these follow directly)

| ID | Decision | Rationale |
|---|---|---|
| DEC-015 | Single Worker serves both the SPA and `/api/v1` | No CORS, no second deploy, same origin for cookies |
| DEC-016 | Static assets use `not_found_handling: single-page-application` with `run_worker_first: ["/api/*"]` only | Page views stay free and unmetered; only API calls consume the request budget |
| DEC-017 | Page-route redirects happen client-side; the server never redirects page paths | A server-side redirect would require invoking the Worker on navigation, making every page view billable |
| DEC-018 | Every tenant query is scoped by `boardId` in one repository layer | Structural defence for cross-board isolation |

## Proposed — awaiting owner approval

| ID | Decision | Rationale | Reversible? |
|---|---|---|---|
| DEC-019 | Status is an enum on `tasks`, not a `columns` table | Columns are fixed; avoids a join and an unusable position column. Migration to a real table is bounded if custom columns are ever approved | Yes, ~1 migration |
| DEC-020 | Positions are integers, renumbered inside a `batch()` on move | Simple and predictable; write amplification acceptable at this scale (~1,000 moves/day against a 100,000 row/day budget) | Yes |
| DEC-021 | Optimistic concurrency via a `version` integer and `expectedVersion` → `409` | Prevents silent clobbering between Bob and a human; one column, one `WHERE` clause | Yes |
| DEC-022 | Agent tokens are `fq_` + 32 CSPRNG bytes, stored as **SHA-256** (fast hash) | 256 bits of entropy means no brute-force surface; a slow hash would not fit the CPU budget and adds nothing | Yes, with token reissue |
| DEC-023 | Plain SQL in repositories; **no ORM** | D1 is SQLite; an ORM adds indirection and bundle size for little gain at this schema size | Yes |
| DEC-024 | **Hono** as the router | Small, typed, Workers-native | Yes |
| DEC-025 | Descriptions truncated to 500 characters in board/list responses | Keeps the hot path flat as boards grow, protecting the 10 ms CPU budget | Yes, if measurement permits |
| DEC-026 | D1 location hint `apac` for the primary | Owner is in Bali; writes always hit one primary | Yes |
| DEC-027 | `memory/` mirror to be removed once Git history exists | It duplicates `.flowquery/` and will drift | Yes |
| DEC-028 | OpenCode agents to be activated by moving `opencode/agents/` → `.opencode/agents/` in M1 | OpenCode V2 discovers only the latter | Yes |
| DEC-032 | **No TanStack Query, Tailwind or Zod.** Server state is `fetch` in component state, styling is hand-written CSS with custom properties, validation is hand-written in the service layer | Each would add a dependency and a layer of indirection without removing a real problem at this size. Revisit TanStack Query first if cache invalidation becomes fiddly | Yes, ~a day |
| DEC-033 | **Per-board appearance**: the page background, the five column backgrounds, the ticket (card) background and the activity box are configurable per board, by humans only, stored as a JSON document on the board. Twelve presets per surface pick the higher-contrast ink automatically; a custom picker sits behind a per-row button | Requested by the owner after using the app. Outside the original MVP scope, so it is recorded here rather than quietly absorbed. Bob's token has no route for it, because appearance is board administration | Yes, one migration |
| DEC-034 | **Appearance stays per board; no per-user override.** Both admins see the same colours on a board, and changing them changes what the other person sees | The owner asked whether colours should be per board or per user and, after the comparison, chose per board. It matches how Trello, Notion and GitHub Projects treat board identity, and there is only one copy to keep in sync. A personal override is the fallback if accessibility needs ever diverge — a `board_theme_overrides` table merged on read | No |
| DEC-035 | **Generic account subdomain `workstack`**, giving `flowquery.workstack.workers.dev`; the Worker stays named `flowquery` | The account subdomain was auto-assigned from the owner's personal details and appeared in every URL. The owner wanted no personal identity there, and a generic namespace so future apps sit at `<app>.workstack.workers.dev`. Changing the account subdomain is dashboard-only — the public API returns `10036` and cannot rename one — and it moved every Worker at once. The Worker name was briefly changed to `app` for an abandoned `app.flowquery` plan and reverted, which avoided re-entering the three secrets | No |
| DEC-036 | **Uploaded profile pictures live in D1**, in their own `profile_avatars` table, capped at 64 KiB after the browser resizes to 256px; PNG, JPEG and WebP only. One mechanism serves humans and agents. Precedence is uploaded picture → drawn avatar → initials | The owner asked for a picture upload in the profile menu and per-agent pictures. The alternative was an R2 bucket: better for binaries, but a second service, a second binding and a second thing that can fail, for at most 18 pictures of a few kilobytes each. A separate table rather than a column keeps the bytes out of every board load, since profiles are listed on each one. SVG is refused because an SVG is a document that can carry script, and it would be served from our own origin. Magic bytes are checked against the declared type, so a mislabelled file is rejected rather than trusted | Yes — move the table to R2 later, no schema change to profiles |
| DEC-037 | **One live token per agent per board, issued by choosing the agent from a list.** The token label is copied from the profile rather than typed, and rotating revokes and reissues in one step | The owner asked for the label to become a dropdown of team names, one token each, rotatable with one press. This also fixes a real defect: activity attribution matches `actor_name` against `team_profiles.display_name`, so a hand-typed label could silently detach an agent's actions from its name and avatar. A partial unique index enforces the rule in the database, and rotation runs as one batch so a failure leaves the old token working rather than leaving the agent with nothing | Yes, one migration |

## Approved — owner decisions, 3 November 2026

Recorded verbatim from the owner's approval, at the M1 gate.

| ID | Decision | Detail |
|---|---|---|
| **AUTH-01** | Human authentication is **GitHub OAuth with a server-side allowlist** | No passwords, no email service, no domain. Analysis and rejected alternatives: `SECURITY_AND_AUTH.md` §4 |
| **AUTH-02** | **Both administrators will use GitHub accounts** | Accepted dependency; account recovery is delegated to GitHub |
| **DEC-031** | Administrator identity is keyed on the **immutable GitHub numeric user ID** | Username and email are display-only. A renamed account or changed email cannot gain or lose access; the allowlist stores numeric IDs |
| **SCOPE-01** | The **in-app notification centre is dropped** from the MVP | No `notifications` table, no event feed, no toggle. Reintroducing it needs a new decision |
| **DEC-029** | Local repository path confirmed: `C:\Users\Asus\source\repos\FlowQuery` | The earlier `C:\repos\flowquery` is not used |
| **DEC-030** | Local `git init` authorised on `main`; **no remote repository, no push** | Remote creation remains a separate, unapproved decision |

## Open — none

Nothing currently waits on the owner except review of M1's output. Should a new question arise during implementation, it is added here rather than decided silently.

## Superseded — kept for history, do not follow

| ID | Was | Replaced by |
|---|---|---|
| DEC-S01 | Organisation → Project → Board → Column → Task hierarchy | DEC-002 |
| DEC-S02 | Slug-based routes including `/:organisationSlug/:projectSlug/...` | DEC-003 |
| DEC-S03 | Public board links granting anonymous view/edit | DEC-005 + authenticated-only access |
| DEC-S04 | Public organisation directory | Does not exist |
| DEC-S05 | Configurable columns, reordering, column deletion moving cards | DEC-006 |
| DEC-S06 | Archive/restore instead of delete | DEC-007 |
| DEC-S07 | Organisation ownership and membership roles | DEC-005 |
| DEC-S08 | Bob as a separate service identity with an email inbox | DEC-009 |
| DEC-S09 | Specialist agents as possible future application users | DEC-004 |
| DEC-S10 | Workers Paid ($5/month) as an acceptable answer to the CPU limit | DEC-013 |
| DEC-S11 | In-app notification centre with on/off control | SCOPE-01 (open) |

## Notes on how these were decided

- Approved items reproduce the owner's direction of 2026-11-03. They are not Bob's interpretation of it; where the direction was silent, the gap is listed as Open rather than filled in.
- Proposed items are technical choices inside the approved direction. They are recorded so a future session does not relitigate them by accident, and so the owner can veto one cheaply now rather than expensively later.
- Nothing here was inferred from an earlier document that has since been superseded.
