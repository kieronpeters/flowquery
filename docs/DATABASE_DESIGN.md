# FlowQuery — Database Design

**Status:** Authoritative design, 3 November 2026. Illustrative DDL only — **no migration files exist and none may be created until implementation is authorised.**

Target: **Cloudflare D1** (SQLite). Verified behaviour relied on below: foreign keys are **enforced by default**; `db.batch()` runs statements as a single transaction and counts as one query against the 50-per-invocation limit; maximum 500 MB per database on the Free plan; `LIKE`/`GLOB` patterns are limited to **50 bytes**; maximum 100 bound parameters per query.

---

## 1. Model

```text
users ──< sessions
  │
  └──< auth_identities

boards ──< tasks ──< comments
   │         └──< activity_events (also referenced directly)
   └──< agent_tokens

team_profiles ──< tasks (assignee, nullable)
```

Six core tables plus two auth-side tables. There is no organisation, project, column or membership table — deliberately.

## 2. Identity and access tables

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,            -- 'usr_' + 22 base32 chars
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,            -- unix ms
  last_login_at INTEGER
);

CREATE TABLE auth_identities (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,                 -- 'github' | 'passkey'
  subject     TEXT NOT NULL,                 -- provider user id, or credential id
  credential  TEXT,                          -- passkey public key blob / counter, unused for OAuth
  created_at  INTEGER NOT NULL,
  last_used_at INTEGER,
  UNIQUE (provider, subject)
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,           -- SHA-256 of the opaque session token
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER
);
```

Rationale:

- **`auth_identities` exists so the auth mechanism can change without touching `users`.** Swapping GitHub OAuth for passkeys inserts different rows; it does not reshape the identity model.
- **`sessions` stores only a hash.** A database leak does not yield usable sessions (`AUTH-004`).
- Both human administrators are simply rows in `users`. There is no `role` column because there is no role distinction — inventing one now would invite a permission engine we have explicitly excluded.

## 3. Board and work tables

```sql
CREATE TABLE boards (
  id         TEXT PRIMARY KEY,               -- 'brd_' + 22 base32 chars, unguessable
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE tasks (
  id                  TEXT PRIMARY KEY,
  board_id            TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title               TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description         TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL CHECK (status IN ('backlog','todo','in_progress','review','done')),
  position            INTEGER NOT NULL,
  priority            TEXT NOT NULL DEFAULT 'none'
                        CHECK (priority IN ('none','low','medium','high','urgent')),
  assignee_profile_id TEXT REFERENCES team_profiles(id) ON DELETE SET NULL,
  due_date            TEXT,                  -- 'YYYY-MM-DD', no time
  version             INTEGER NOT NULL DEFAULT 1,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  created_by_type     TEXT NOT NULL CHECK (created_by_type IN ('human','agent')),
  created_by_id       TEXT NOT NULL,
  created_by_name     TEXT NOT NULL
);

CREATE TABLE comments (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('human','agent')),
  author_id   TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  created_at  INTEGER NOT NULL
);

CREATE TABLE activity_events (
  id          TEXT PRIMARY KEY,
  board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  task_id     TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  actor_type  TEXT NOT NULL CHECK (actor_type IN ('human','agent','system')),
  actor_id    TEXT,
  actor_name  TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  payload     TEXT NOT NULL DEFAULT '{}',    -- small JSON: {from,to,field,old,new}
  created_at  INTEGER NOT NULL
);

CREATE TABLE agent_tokens (
  id           TEXT PRIMARY KEY,
  board_id     TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  label        TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  token_prefix TEXT NOT NULL,                -- e.g. 'fq_7Kd2' — shown in UI to identify the token
  token_hash   TEXT NOT NULL UNIQUE,         -- SHA-256 of the full token
  created_by   TEXT NOT NULL REFERENCES users(id),
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at   INTEGER
);

CREATE TABLE team_profiles (
  id          TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  role_title  TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('human','ai','contractor')),
  avatar_path TEXT,
  active      INTEGER NOT NULL DEFAULT 1
);
```

## 4. Decisions embedded in the schema

### 4.1 Status is an enum on `tasks`, not a `columns` table

The five columns are fixed by product requirement (`COL-001`, `COL-002`). Modelling them as rows would add a join to every task query, a position column that can never change, and a whole class of referential bugs — to buy flexibility the product has explicitly refused.

**Trade-off accepted:** if custom columns are ever approved, the change is a migration adding a `columns` table and a `task.column_id` column, plus a backfill of five values. That is a bounded, well-understood migration. The reverse — carrying an unused table for years — is worse.

The public contract is unaffected: `GET /columns` returns the five columns from a server-side constant, so the API's shape still anticipates a day when columns are data.

### 4.2 Positions are integers, renumbered on move

`position` is 0-based within its column. A move rewrites the affected rows inside a single `batch()`. This is simple to reason about and simple to render.

Write amplification is the trade-off: moving a task across 100 siblings writes ~100 rows. At D1 Free's 100,000 rows written/day that is ~1,000 such moves per day. Acceptable for two users. The threshold to reconsider is a column exceeding ~500 tasks, at which point spaced positions plus occasional rebalancing is the fix — not before.

### 4.3 `version` provides optimistic concurrency

`TASK-012`: an update carries `expectedVersion`; the repository issues `UPDATE … WHERE id = ? AND version = ?` and treats `changes === 0` as `409 Conflict`. This prevents two clients (or Bob and a human) from silently clobbering each other. It is one integer column and one `WHERE` clause — far cheaper than locks or websockets.

### 4.4 Actor is denormalised onto the row

`activity_events` and `comments` store `actor_type`, `actor_id` **and** `actor_name`. The name at the time of the action is part of the historical record; renaming a display name must not rewrite history. No foreign key to `users` on purpose — Bob has no `users` row.

### 4.5 Tokens

- Format: `fq_` + 32 bytes of CSPRNG output, base32-encoded. Shown once (`AGT-002`).
- Stored: `SHA-256(token)` hex. A slow hash is unnecessary because the token is 256 bits of entropy — there is nothing to brute-force; a fast hash is the correct choice, and it is the only one that fits the CPU budget.
- `token_prefix` (first 8 characters) is shown in the UI so a human can identify "which token is this" without ever seeing the secret again.
- Lookup is a single unique-index hit on `token_hash`, then an in-row check of `revoked_at IS NULL`. Revocation is therefore instant with no session table to clean up (`AGT-005`).

## 5. Indexes

Every index below exists to serve a specific query; none is speculative.

```sql
CREATE INDEX idx_tasks_board_status_pos ON tasks(board_id, status, position);
CREATE INDEX idx_tasks_board_updated     ON tasks(board_id, updated_at DESC);
CREATE INDEX idx_tasks_assignee          ON tasks(board_id, assignee_profile_id);
CREATE INDEX idx_comments_task_created   ON comments(task_id, created_at);
CREATE INDEX idx_activity_board_created  ON activity_events(board_id, created_at DESC);
CREATE INDEX idx_activity_task_created   ON activity_events(task_id, created_at DESC);
CREATE INDEX idx_tokens_board            ON agent_tokens(board_id);
CREATE INDEX idx_sessions_user           ON sessions(user_id);
CREATE INDEX idx_sessions_expires        ON sessions(expires_at);
```

Why it matters on the Free plan: D1 bills **rows read**, with 5 million per day. An unindexed board scan on a 5,000-row table costs 5,000 reads for *one* request. The composite index on `(board_id, status, position)` makes the board query proportional to the rows actually returned.

## 6. Query conventions

1. **Every data query takes `boardId` as its first parameter.** Repositories that return tenant data have no signature that omits it. This is the structural defence behind `SEC-001`.
2. **Select explicit columns**, never `SELECT *`. It reduces rows-read ambiguity and keeps payloads stable as the schema grows.
3. **Bound parameters only.** No SQL string interpolation (`SEC-004`).
4. **`LIKE` patterns are capped at 50 bytes** by D1. Search terms are validated to ≤ 40 characters *bytes* before use, and escaped for `%`/`_`. Full-text search is not available in this design; if search quality becomes a real complaint, the answer is an FTS5 virtual table, not a bigger `LIKE`.
5. **Pagination by keyset**, not offset: `WHERE created_at < ? ORDER BY created_at DESC LIMIT ?`. Offset pagination degrades as rows grow.
6. **Transactions use `db.batch()`**, which is atomic. Multi-row invariants (position renumbering, delete-board cascade plus final activity write) always use it.

## 7. Migration strategy

- Files: `migrations/0001_init.sql`, `0002_….sql`, applied with `wrangler d1 migrations apply`.
- Migrations are forward-only and never edited after being applied anywhere. Corrections are new migrations.
- `wrangler d1 migrations apply` takes a backup and rolls back a failed migration; this is relied on, not reimplemented.
- Seeding (`team_profiles`, plus a demo board for local development) is **separate from migrations** so that production seeding is an explicit choice.
- Destructive migrations (dropping columns or tables) require an export first; see `SECURITY_AND_AUTH.md` §backup.

## 8. Data volume reality check

Two humans, one to five boards, low hundreds of tasks, thousands of activity rows. Total database size is measured in single-digit megabytes against a 500 MB ceiling. Growth is not a design constraint here; correctness and simplicity are.

## 9. Deletion and retention

- Board delete cascades to tasks, comments, activity and tokens in one transaction (`BOARD-005`).
- Task delete cascades to its comments and its activity rows.

  **Consequence worth stating plainly:** deleting a task also deletes the record that it existed. If an audit trail matters more than tidy data later, the change is to null the task reference instead of cascading. That is not the current decision.
- Session rows expire and are deleted lazily on use, plus opportunistically during sign-in.
- Backups are the only recovery mechanism after a confirmed delete. See `SECURITY_AND_AUTH.md`.
