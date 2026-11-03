-- Humans who signed in before profiles were synced never became assignable:
-- assignees are rows in team_profiles, and nothing created one for an account.
-- Backfill every existing account so the assignee list is correct immediately,
-- rather than only after that person's next sign-in.
--
-- OR IGNORE rather than plain INSERT: display_name is UNIQUE, and a human whose
-- name matches an existing profile must not fail the migration.
INSERT OR IGNORE INTO team_profiles (id, display_name, role_title, kind, avatar_path, active)
SELECT 'prf_user_' || id, display_name, 'Administrator', 'human', NULL, 1
FROM users;
