-- Persistent token store for GameChanger sync.
-- Refresh tokens rotate on every refresh, so they must be re-saved server-side
-- after each refresh. Single-row table; id defaults to 'default'.

CREATE TABLE IF NOT EXISTS gc_auth_tokens (
  id              TEXT PRIMARY KEY DEFAULT 'default',
  access_token    TEXT,
  access_expires  BIGINT,
  refresh_token   TEXT NOT NULL,
  refresh_expires BIGINT,
  device_id       TEXT NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gc_auth_tokens ENABLE ROW LEVEL SECURITY;
-- Service-role only — no public policies. Tokens never leave the backend.
