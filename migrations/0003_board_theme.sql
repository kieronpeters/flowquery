-- Per-board appearance.
--
-- Stored as JSON on the board rather than a table of its own: it is a small,
-- bounded document with no queries beyond "give me this board". A table would
-- add joins to every board read for no benefit.
--
-- Shape: { "background": "#0b1020", "columns": { "backlog": "#1a2138", ... } }
-- Values are validated in the service layer; nothing else reads this column.

ALTER TABLE boards ADD COLUMN theme TEXT NOT NULL DEFAULT '{}';
