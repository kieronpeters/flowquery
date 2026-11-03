-- Authentication rate limiting.
--
-- A bounded counter, not a WAF product: the only credentials in this app are
-- 256-bit random tokens and an allowlist, so rate limiting exists to bound
-- accidental noise and trivial abuse, not to stop a serious attacker.

CREATE TABLE auth_attempts (
  key          TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX idx_auth_attempts_key_time ON auth_attempts(key, attempted_at);
