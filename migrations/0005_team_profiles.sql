-- The agent roster, as reference data rather than demo data.
--
-- Local development got these from seeds/dev.sql, which is why production
-- had none: it was migrated empty and never seeded. Without rows here there
-- is nothing to assign an agent to on the live app.
--
-- Humans are deliberately absent. They are created from `users` when somebody
-- signs in (see ensureHumanProfile), so seeding placeholder humans here would
-- put phantom people in the assignee list next to the real account.
--
-- OR IGNORE keeps this safe to run against a database that already has them,
-- and against one where a human happens to share a display name.
INSERT OR IGNORE INTO team_profiles (id, display_name, role_title, kind, avatar_path, active) VALUES
  ('prf_bob',        'Bob',        'Engineering Manager',               'ai',         'team/portraits/bob.png',        1),
  ('prf_alex',       'Alex',       'Senior Software Engineer',          'ai',         'team/portraits/alex.png',       1),
  ('prf_sarah',      'Sarah',      'QA & Test Automation Engineer',     'ai',         'team/portraits/sarah.png',      1),
  ('prf_olivia',     'Olivia',     'Business Analyst',                  'ai',         'team/portraits/olivia.png',     1),
  ('prf_daniel',     'Daniel',     'Backlog & Delivery Planner',        'ai',         'team/portraits/daniel.png',     1),
  ('prf_marcus',     'Marcus',     'DevOps & CI/CD Engineer',           'ai',         'team/portraits/marcus.png',     1),
  ('prf_james',      'James',      'Release & Deployment Engineer',     'ai',         'team/portraits/james.png',      1),
  ('prf_victoria',   'Victoria',   'Security & Code Review',            'ai',         'team/portraits/victoria.png',   1),
  ('prf_chris',      'Chris',      'Database Architect',                'ai',         'team/portraits/chris.png',      1),
  ('prf_emma',       'Emma',       'UX/UI Designer',                    'ai',         'team/portraits/emma.png',       1),
  ('prf_liam',       'Liam',       'Product Manager',                   'ai',         'team/portraits/liam.png',       1),
  ('prf_priya',      'Priya',      'Technical Writer',                  'ai',         'team/portraits/priya.png',      1),
  ('prf_ethan',      'Ethan',      'Data & Analytics Engineer',         'ai',         'team/portraits/ethan.png',      1),
  ('prf_rebecca',    'Rebecca',    'Customer Success & Support',        'ai',         'team/portraits/rebecca.png',    1),
  ('prf_noah',       'Noah',       'IT Operations & Developer Tooling', 'ai',         'team/portraits/noah.png',       1),
  ('prf_contractor', 'Contractor', 'External Specialist',               'contractor', 'team/portraits/contractor.png', 1);
