-- Local development seed data.
--
-- Separate from migrations on purpose (docs/DATABASE_DESIGN.md §7): applying
-- seed data to a real environment must always be an explicit choice.
--
-- Idempotent: fixed IDs with INSERT OR IGNORE, so re-running does not duplicate.
-- All identifiers are prefixed to make clear they are development fixtures.

-- ---------------------------------------------------------------------------
-- Development owner. Authentication does not exist until M3; boards require a
-- creator, so this placeholder user exists to satisfy the schema locally only.
-- The .invalid TLD guarantees it can never be a real address.
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO users (id, email, display_name, created_at)
VALUES ('usr_dev_owner', 'owner@flowquery.invalid', 'Owner', 1793664000000);

-- ---------------------------------------------------------------------------
-- Team profiles: 2 human administrators + 15 permanent AI members + 1 contractor.
-- These are assignee labels only. None of them can authenticate.
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO team_profiles (id, display_name, role_title, kind, avatar_path) VALUES
  ('prf_abdul',      'Abdul',      'Administrator',                        'human',      NULL),
  ('prf_bob',        'Bob',        'Engineering Manager',                  'ai',         'team/portraits/bob.png'),
  ('prf_alex',       'Alex',       'Senior Software Engineer',              'ai',         'team/portraits/alex.png'),
  ('prf_sarah',      'Sarah',      'QA & Test Automation Engineer',        'ai',         'team/portraits/sarah.png'),
  ('prf_olivia',     'Olivia',     'Business Analyst',                     'ai',         'team/portraits/olivia.png'),
  ('prf_daniel',     'Daniel',     'Backlog & Delivery Planner',           'ai',         'team/portraits/daniel.png'),
  ('prf_marcus',     'Marcus',     'DevOps & CI/CD Engineer',              'ai',         'team/portraits/marcus.png'),
  ('prf_james',      'James',      'Release & Deployment Engineer',        'ai',         'team/portraits/james.png'),
  ('prf_victoria',   'Victoria',   'Security & Code Review',               'ai',         'team/portraits/victoria.png'),
  ('prf_chris',      'Chris',      'Database Architect',                   'ai',         'team/portraits/chris.png'),
  ('prf_emma',       'Emma',       'UX/UI Designer',                       'ai',         'team/portraits/emma.png'),
  ('prf_liam',       'Liam',       'Product Manager',                      'ai',         'team/portraits/liam.png'),
  ('prf_priya',      'Priya',      'Technical Writer',                     'ai',         'team/portraits/priya.png'),
  ('prf_ethan',      'Ethan',      'Data & Analytics Engineer',            'ai',         'team/portraits/ethan.png'),
  ('prf_rebecca',    'Rebecca',    'Customer Success & Support',           'ai',         'team/portraits/rebecca.png'),
  ('prf_noah',       'Noah',       'IT Operations & Developer Tooling',    'ai',         'team/portraits/noah.png'),
  ('prf_contractor', 'Contractor', 'External Specialist',                  'contractor', 'team/portraits/contractor.png');

-- ---------------------------------------------------------------------------
-- One demo board so the read path has something to render.
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO boards (id, name, created_by, created_at, updated_at)
VALUES ('brd_demo', 'FlowQuery Development', 'usr_dev_owner', 1793664000000, 1793664000000);

INSERT OR IGNORE INTO tasks
  (id, board_id, title, description, status, position, priority, assignee_profile_id,
   due_date, version, created_at, updated_at, created_by_type, created_by_id, created_by_name)
VALUES
  ('tsk_demo_01', 'brd_demo', 'Add GitHub OAuth sign-in',
   'Allowlist by immutable GitHub numeric id. No passwords: PBKDF2 does not fit the 10 ms CPU budget.',
   'backlog', 0, 'high', 'prf_alex', '2026-11-20', 1,
   1793664000000, 1793664000000, 'human', 'usr_dev_owner', 'Owner'),

  ('tsk_demo_02', 'brd_demo', 'Write the board isolation test suite',
   'Prove a token for board A cannot read or mutate board B, and that revoked tokens are rejected immediately.',
   'backlog', 1, 'high', 'prf_sarah', '2026-11-22', 1,
   1793664001000, 1793664001000, 'human', 'usr_dev_owner', 'Owner'),

  ('tsk_demo_03', 'brd_demo', 'Design the empty board state',
   'What a user sees on a brand-new board before any task exists. Keep it plain and useful.',
   'backlog', 2, 'low', 'prf_emma', NULL, 1,
   1793664002000, 1793664002000, 'human', 'usr_dev_owner', 'Owner'),

  ('tsk_demo_04', 'brd_demo', 'Implement session storage',
   'Opaque token, SHA-256 at rest, __Host- cookie, 30 day expiry with idle refresh.',
   'todo', 0, 'medium', 'prf_alex', NULL, 1,
   1793664003000, 1793664003000, 'human', 'usr_dev_owner', 'Owner'),

  ('tsk_demo_05', 'brd_demo', 'Review the schema against the requirements',
   'Check every TASK-* and COL-* requirement maps to a column or constraint.',
   'todo', 1, 'medium', 'prf_chris', NULL, 1,
   1793664004000, 1793664004000, 'human', 'usr_dev_owner', 'Owner'),

  ('tsk_demo_06', 'brd_demo', 'Walking skeleton: board read path',
   'Route to repository to service to the board view, rendered read-only. No mutations until M5.',
   'in_progress', 0, 'high', 'prf_alex', '2026-11-05', 1,
   1793664005000, 1793664005000, 'human', 'usr_dev_owner', 'Owner'),

  ('tsk_demo_07', 'brd_demo', 'Consolidated specification',
   'Flat board model, zero recurring cost, GitHub OAuth. Awaiting owner approval.',
   'review', 0, 'none', 'prf_priya', NULL, 1,
   1793664006000, 1793664006000, 'human', 'usr_dev_owner', 'Owner'),

  ('tsk_demo_08', 'brd_demo', 'Repository foundation (M1)',
   'Git, toolchain, OpenCode agents and a verified smoke test. Complete.',
   'done', 0, 'none', 'prf_marcus', NULL, 1,
   1793664007000, 1793664007000, 'human', 'usr_dev_owner', 'Owner'),

  ('tsk_demo_09', 'brd_demo', 'Consolidate documentation',
   'Nine contradictions resolved; single decisions register; superseded files marked. Complete.',
   'done', 1, 'none', 'prf_olivia', NULL, 1,
   1793664008000, 1793664008000, 'human', 'usr_dev_owner', 'Owner');
