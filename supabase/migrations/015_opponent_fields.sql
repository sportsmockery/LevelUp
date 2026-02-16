-- Add opponent school and weight class columns to match_analyses
-- opponent_name already exists from migration 009

ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS opponent_school TEXT;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS opponent_weight_class TEXT;

-- Index for opponent search/grouping queries
CREATE INDEX IF NOT EXISTS idx_match_analyses_opponent
  ON match_analyses(athlete_id, opponent_name)
  WHERE opponent_name IS NOT NULL;
