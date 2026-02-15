-- Expert Coach Validation Study: coach scoring portal and correlation analysis
-- Enables partnership with certified coaches to validate AI scoring accuracy

-- Expert validations table — coach scores for comparison with AI
CREATE TABLE IF NOT EXISTS expert_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES match_analyses(id) ON DELETE CASCADE,
  coach_id UUID,                           -- FK to auth.users when auth integrated
  coach_name TEXT NOT NULL,
  coach_certification TEXT NOT NULL CHECK (coach_certification IN ('Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5')),
  scores JSONB NOT NULL,                   -- Same structure as AI scores: { overall, standing, top, bottom, sub_scores }
  notes TEXT,
  time_spent_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_validations_analysis ON expert_validations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_expert_validations_coach ON expert_validations(coach_id);

-- Validation disagreements — flagged when AI and coach scores diverge significantly
CREATE TABLE IF NOT EXISTS validation_disagreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES match_analyses(id) ON DELETE CASCADE,
  validation_id UUID NOT NULL REFERENCES expert_validations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                  -- Which score category disagreed
  ai_score INTEGER NOT NULL,
  coach_score INTEGER NOT NULL,
  delta INTEGER NOT NULL,                  -- Absolute difference
  coach_reasoning TEXT,
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  prompt_adjustment TEXT,                  -- What prompt change was made based on this disagreement
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_disagreements_analysis ON validation_disagreements(analysis_id);
CREATE INDEX IF NOT EXISTS idx_validation_disagreements_reviewed ON validation_disagreements(reviewed);

-- Add validation metadata to match_analyses
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS expert_validation_count INTEGER DEFAULT 0;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS avg_coach_score REAL;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS ai_coach_correlation REAL;
