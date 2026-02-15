-- Add job queue support to match_analyses for async analysis
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS job_status TEXT DEFAULT 'complete';
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Allow analysis_json to be null for pending jobs
ALTER TABLE match_analyses ALTER COLUMN analysis_json DROP NOT NULL;

-- Index for polling by job status
CREATE INDEX IF NOT EXISTS idx_match_analyses_job_status ON match_analyses (id) WHERE job_status = 'processing';
