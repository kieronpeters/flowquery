-- Bob's profile text predates the platform-independent operating model.
-- Correct the one sentence that described Bob as an OpenCode session. The
-- UPDATE is guarded by the exact old text, so an owner edit is never overwritten.

UPDATE team_profiles
SET about = 'Coordinates the specialist agents, keeps the backlog honest and reports progress to the owner. Bob is the running AI Engineering Manager, not a separate service or a specific tool.'
WHERE id = 'prf_bob'
  AND about = 'Coordinates the specialist agents, keeps the backlog honest and reports progress to the owner. Bob is the OpenCode session itself, not a separate service.';
