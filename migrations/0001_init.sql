-- FlowQuery schema, initial version.
--
-- Implements docs/DATABASE_DESIGN.md §2–§5. Forward-only: never edit after it
-- has been applied anywhere; corrections are new migrations.
--
-- Notes:
--   * Timestamps are unix milliseconds (INTEGER).
--   * due_date is a calendar date 'YYYY-MM-DD' with no time component.
--   * D1 enforces foreign keys by default, so the ON DELETE rules below are real.

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE auth_identities (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,
  -- Immutable provider identifier. For GitHub this is the numeric user id
  -- (DEC-031): usernames and emails are display-only and must never be used
  -- as an identity key.
  subject      TEXT NOT NULL,
  credential   TEXT,
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER,
  UNIQUE (provider, subject)
);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256 of the opaque session token. The plaintext is never stored.
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  last_seen_at INTEGER
);

-- ---------------------------------------------------------------------------
-- Assignable profiles (never accounts; never able to authenticate)
-- ---------------------------------------------------------------------------

CREATE TABLE team_profiles (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  role_title   TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('human', 'ai', 'contractor')),
  avatar_path  TEXT,
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

-- ---------------------------------------------------------------------------
-- Boards and work
-- ---------------------------------------------------------------------------

CREATE TABLE boards (
  id         TEXT PRIMARY KEY,
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
  status              TEXT NOT NULL
                        CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
  position            INTEGER NOT NULL,
  priority            TEXT NOT NULL DEFAULT 'none'
                        CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent')),
  assignee_profile_id TEXT REFERENCES team_profiles(id) ON DELETE SET NULL,
  due_date            TEXT,
  version             INTEGER NOT NULL DEFAULT 1,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  created_by_type     TEXT NOT NULL CHECK (created_by_type IN ('human', 'agent')),
  created_by_id       TEXT NOT NULL,
  created_by_name     TEXT NOT NULL
);

CREATE TABLE comments (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('human', 'agent')),
  author_id   TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  created_at  INTEGER NOT NULL
);

CREATE TABLE activity_events (
  id         TEXT PRIMARY KEY,
  board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  task_id    TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human', 'agent', 'system')),
  actor_id   TEXT,
  actor_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload    TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE TABLE agent_tokens (
  id           TEXT PRIMARY KEY,
  board_id     TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  label        TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  token_prefix TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  created_by   TEXT NOT NULL REFERENCES users(id),
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at   INTEGER
);

-- ---------------------------------------------------------------------------
-- Indexes: each serves a specific query (docs/DATABASE_DESIGN.md §5)
-- ---------------------------------------------------------------------------

CREATE INDEX idx_tasks_board_status_pos ON tasks(board_id, status, position);
CREATE INDEX idx_tasks_board_updated ON tasks(board_id, updated_at DESC);
CREATE INDEX idx_tasks_assignee ON tasks(board_id, assignee_profile_id);
CREATE INDEX idx_comments_task_created ON comments(task_id, created_at);
CREATE INDEX idx_activity_board_created ON activity_events(board_id, created_at DESC);
CREATE INDEX idx_activity_task_created ON activity_events(task_id, created_at DESC);
CREATE INDEX idx_tokens_board ON agent_tokens(board_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
