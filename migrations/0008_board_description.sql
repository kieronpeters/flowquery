-- A one-line "what this board is for", shown under the title.
--
-- Nullable: existing boards have none, and the UI simply shows nothing until
-- somebody writes one.
ALTER TABLE boards ADD COLUMN description TEXT;
