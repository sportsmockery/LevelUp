-- ============================================================
-- Migration 005: Cron Logs
-- Stores execution history for automated cron jobs
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL DEFAULT 'discover-events',
  status TEXT NOT NULL DEFAULT 'running', -- running, success, error
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  scraped INTEGER DEFAULT 0,
  new_candidates INTEGER DEFAULT 0,
  flo_matched INTEGER DEFAULT 0,
  auto_approved INTEGER DEFAULT 0,
  auto_synced INTEGER DEFAULT 0,
  error_message TEXT,
  log_lines TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_started_at ON cron_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_status ON cron_logs(status);

-- RLS: admin-only read (or service role)
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on cron_logs"
  ON cron_logs FOR SELECT
  USING (true);
