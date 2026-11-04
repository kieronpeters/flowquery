-- Custom profile pictures, uploaded by a human.
--
-- Kept in its own table rather than a column on team_profiles: every board view
-- lists all the profiles, and a base64 picture sitting on the profile row would
-- be carried by every one of those loads. Nothing reads this table unless it is
-- asking for one specific picture.
--
-- `data` is base64 with no `data:` prefix; the MIME type is a separate column so
-- the serving endpoint never has to parse a string. The size limit is enforced
-- by the Worker before the row is written — the CHECK below is a second line of
-- defence, not the primary one. 88,000 base64 characters is a 64 KiB image.
CREATE TABLE profile_avatars (
  profile_id TEXT PRIMARY KEY REFERENCES team_profiles(id) ON DELETE CASCADE,
  mime       TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  data       TEXT NOT NULL CHECK (length(data) BETWEEN 1 AND 88000),
  updated_at INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- A token now belongs to an agent, not to a free-text label.
--
-- The label stays, because it is what the activity history records. But it is
-- derived from the profile instead of typed, so an agent's actions can no
-- longer lose their name — and their avatar — to a typo.
-- ---------------------------------------------------------------------------

ALTER TABLE agent_tokens ADD COLUMN profile_id TEXT REFERENCES team_profiles(id);

-- Existing tokens are matched by name, which is how activity attributed them
-- until now.
UPDATE agent_tokens
   SET profile_id = (SELECT p.id FROM team_profiles p WHERE p.display_name = agent_tokens.label)
 WHERE profile_id IS NULL;

-- One live token per agent per board. Revoked rows accumulate as history, so
-- the index only covers the live ones.
CREATE UNIQUE INDEX idx_tokens_one_live_per_profile
  ON agent_tokens(board_id, profile_id)
  WHERE revoked_at IS NULL AND profile_id IS NOT NULL;
