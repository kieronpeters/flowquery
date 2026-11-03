-- Two humans, named: Kieron and Abdul.
--
-- The seed carried generic placeholders ("Owner", "Friend") because the real
-- people did not exist yet. Kieron now arrives from the users table when they
-- sign in, so "Owner" is a duplicate of a real person. "Friend" is Abdul, who
-- will sign in later but should be assignable now.
--
-- The ids change with the names: prf_abdul matches the other profile ids, and
-- nothing else references prf_friend.

-- 1. Abdul exists before anything points at him.
INSERT OR IGNORE INTO team_profiles (id, display_name, role_title, kind, avatar_path, active)
VALUES ('prf_abdul', 'Abdul', 'Administrator', 'human', NULL, 1);

-- 2. Carry any local assignment off the placeholder before it is dropped.
UPDATE tasks SET assignee_profile_id = 'prf_abdul' WHERE assignee_profile_id = 'prf_friend';

-- 3. Remove the placeholders.
DELETE FROM team_profiles WHERE id IN ('prf_friend', 'prf_owner');
