-- The legacy `team/portraits/...` avatar_path values predate the portrait map.
-- Default portraits are resolved by profile id in src/shared/agent-portraits.ts,
-- and the `team/portraits/` originals were removed in the repository cleanup.
-- Clear the stale paths so no row points at a file that no longer exists.

UPDATE team_profiles
SET avatar_path = NULL
WHERE avatar_path LIKE 'team/portraits/%';
