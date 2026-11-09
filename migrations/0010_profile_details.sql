-- Optional text on a profile page.
--
-- A profile with only a name and a picture is complete: every column here is
-- nullable, and the service stores an emptied field as NULL rather than ''.
-- One representation of "not filled in" is easier to reason about than two.
--
-- The CHECKs are a backstop, not the primary limit. The Worker validates and
-- trims first, so these only catch a bug that bypassed it. SQLite's length()
-- counts characters for TEXT, which is what a person typing counts too.
ALTER TABLE team_profiles
  ADD COLUMN about TEXT CHECK (about IS NULL OR length(about) BETWEEN 1 AND 2000);

ALTER TABLE team_profiles
  ADD COLUMN skills TEXT CHECK (skills IS NULL OR length(skills) BETWEEN 1 AND 1000);

ALTER TABLE team_profiles
  ADD COLUMN development TEXT CHECK (development IS NULL OR length(development) BETWEEN 1 AND 1000);
