-- What each agent is for.
--
-- The profiles were created by migrations 0005 and 0006 with only a name and a
-- role title, so their pages would otherwise be empty. This fills the three
-- optional sections once, at the same time as the profile pages that display
-- them.
--
-- COALESCE, not a plain assignment: if a person has already written something
-- on an agent's profile, that text wins. A migration must never overwrite an
-- owner's words.
--
-- Keep the wording in step with the role titles in 0005. These are short on
-- purpose: enough to know who to ask for what, not a job description.

UPDATE team_profiles
   SET about = COALESCE(about, 'Coordinates the specialist agents, keeps the backlog honest and reports progress to the owner. Bob is the OpenCode session itself, not a separate service.'),
       skills = COALESCE(skills, 'Planning, delegation, code review, Cloudflare Workers and D1.'),
       development = COALESCE(development, 'Turn owner goals into small, reviewable work and keep the agents consistent.')
 WHERE id = 'prf_bob';

UPDATE team_profiles
   SET about = COALESCE(about, 'Leads implementation on the application code: features, refactors and the bugs that span layers.'),
       skills = COALESCE(skills, 'TypeScript, React, Hono, Cloudflare Workers, testing.'),
       development = COALESCE(development, 'Keep the architecture small and the codebase easy for two people to hold in their heads.')
 WHERE id = 'prf_alex';

UPDATE team_profiles
   SET about = COALESCE(about, 'Designs and runs the automated checks, and turns each requirement into a test that fails if it regresses.'),
       skills = COALESCE(skills, 'Vitest, jsdom, API testing, edge cases, accessibility checks.'),
       development = COALESCE(development, 'Grow coverage around the flows automation cannot see, such as touch and file pickers.')
 WHERE id = 'prf_sarah';

UPDATE team_profiles
   SET about = COALESCE(about, 'Turns intent into clear requirements, acceptance criteria and the questions worth answering before code is written.'),
       skills = COALESCE(skills, 'Requirements, process mapping, acceptance criteria, documentation.'),
       development = COALESCE(development, 'Keep the specification and the built product from drifting apart.')
 WHERE id = 'prf_olivia';

UPDATE team_profiles
   SET about = COALESCE(about, 'Keeps the backlog ordered, breaks work into small pieces and says plainly what will and will not fit.'),
       skills = COALESCE(skills, 'Backlog grooming, estimation, sequencing, dependency spotting.'),
       development = COALESCE(development, 'Make delivery predictable without adding ceremony.')
 WHERE id = 'prf_daniel';

UPDATE team_profiles
   SET about = COALESCE(about, 'Owns build, deployment and environment plumbing, with zero recurring cost as a hard constraint.'),
       skills = COALESCE(skills, 'Wrangler, Cloudflare Workers, D1 migrations, GitHub, release automation.'),
       development = COALESCE(development, 'Make every deploy repeatable and reversible without a paid pipeline.')
 WHERE id = 'prf_marcus';

UPDATE team_profiles
   SET about = COALESCE(about, 'Runs the release checklist: preflight, migration order, deploy and the checks that prove it worked.'),
       skills = COALESCE(skills, 'Deployment runbooks, migrations, rollback, post-deploy verification.'),
       development = COALESCE(development, 'Shorten the gap between merged and safely live.')
 WHERE id = 'prf_james';

UPDATE team_profiles
   SET about = COALESCE(about, 'Reviews changes for security and correctness, and says no when a shortcut is not worth it.'),
       skills = COALESCE(skills, 'Threat modelling, authorisation, secret handling, code review.'),
       development = COALESCE(development, 'Keep tenant scoping and the agent boundary enforced by tests, not convention.')
 WHERE id = 'prf_victoria';

UPDATE team_profiles
   SET about = COALESCE(about, 'Designs the schema and migrations, and guards the rules that keep tenant data correctly scoped.'),
       skills = COALESCE(skills, 'SQLite and D1, schema design, indexes, migrations, query performance.'),
       development = COALESCE(development, 'Keep every migration safe to apply to live data and easy to reason about.')
 WHERE id = 'prf_chris';

UPDATE team_profiles
   SET about = COALESCE(about, 'Shapes the interface: layout, hierarchy, colour and the details that make a tool feel calm.'),
       skills = COALESCE(skills, 'Interaction design, responsive layout, accessibility, CSS.'),
       development = COALESCE(development, 'Make the dark theme consistent and every screen usable on a phone.')
 WHERE id = 'prf_emma';

UPDATE team_profiles
   SET about = COALESCE(about, 'Holds the product line: what is in scope, what is deliberately not, and what is actually being asked for.'),
       skills = COALESCE(skills, 'Scope control, prioritisation, user stories, trade-offs.'),
       development = COALESCE(development, 'Keep FlowQuery small and honest rather than feature-rich.')
 WHERE id = 'prf_liam';

UPDATE team_profiles
   SET about = COALESCE(about, 'Writes and maintains the documentation so the next person does not have to reconstruct the reasoning.'),
       skills = COALESCE(skills, 'Technical writing, information architecture, editing, Markdown.'),
       development = COALESCE(development, 'Keep docs and behaviour in step, with one authoritative home per topic.')
 WHERE id = 'prf_priya';

UPDATE team_profiles
   SET about = COALESCE(about, 'Works on reporting and data shape: what is measured, what it means and what is noise.'),
       skills = COALESCE(skills, 'SQL, data modelling, metrics, analysis.'),
       development = COALESCE(development, 'Add useful insight without adding tracking or cost.')
 WHERE id = 'prf_ethan';

UPDATE team_profiles
   SET about = COALESCE(about, 'Represents the people using the product, and turns confusion or friction into clear, small fixes.'),
       skills = COALESCE(skills, 'Support triage, onboarding, communication, feedback synthesis.'),
       development = COALESCE(development, 'Make problems easy to report and easy to understand.')
 WHERE id = 'prf_rebecca';

UPDATE team_profiles
   SET about = COALESCE(about, 'Keeps the local and cloud tooling working: scripts, environment setup and the developer loop.'),
       skills = COALESCE(skills, 'Windows tooling, Node, Wrangler, shell scripting, troubleshooting.'),
       development = COALESCE(development, 'Make setup and recovery boringly repeatable.')
 WHERE id = 'prf_noah';

UPDATE team_profiles
   SET about = COALESCE(about, 'An anonymous, on-demand specialist brought in for one bounded task at a time.'),
       skills = COALESCE(skills, 'Whatever the task needs, with no standing role.'),
       development = COALESCE(development, 'Deliver the bounded task and leave the codebase no harder to work in.')
 WHERE id = 'prf_contractor';
