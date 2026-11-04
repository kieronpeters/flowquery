-- A human's picture comes from GitHub, not from an upload: the avatar URL is
-- returned by the OAuth /user call and stored here so the shell can show it
-- without calling GitHub again on every page load.
--
-- Nullable on purpose. A token signed in before this column existed has no
-- URL until their next sign-in, and the UI falls back to initials.
ALTER TABLE users ADD COLUMN avatar_url TEXT;
