-- Manual match entry support
-- Allows athletes to log match results without uploading video

ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS match_score_detail TEXT;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS win_loss_type TEXT;

-- Manual entries may not have analysis_json, so relax the NOT NULL constraint
ALTER TABLE match_analyses ALTER COLUMN analysis_json DROP NOT NULL;

-- Manual entries have 0 scores by default, relax NOT NULL on score columns
ALTER TABLE match_analyses ALTER COLUMN overall_score SET DEFAULT 0;
ALTER TABLE match_analyses ALTER COLUMN standing SET DEFAULT 0;
ALTER TABLE match_analyses ALTER COLUMN top SET DEFAULT 0;
ALTER TABLE match_analyses ALTER COLUMN bottom SET DEFAULT 0;
