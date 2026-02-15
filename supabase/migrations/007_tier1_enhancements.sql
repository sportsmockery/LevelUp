-- Tier 1 Enhancements: Frame triage, pose estimation, temporal actions, confidence calibration

-- Coach scoring table for confidence calibration (Gap 4)
CREATE TABLE IF NOT EXISTS coach_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES match_analyses(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  position_scores JSONB,           -- { standing, top, bottom }
  sub_scores JSONB,                -- Full sub-score breakdown
  techniques_observed TEXT[],      -- Techniques the coach identified
  scoring_events JSONB,            -- Array of { type, frame_index, scorer }
  notes TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up coach scores by analysis
CREATE INDEX IF NOT EXISTS idx_coach_scores_analysis_id ON coach_scores(analysis_id);
CREATE INDEX IF NOT EXISTS idx_coach_scores_coach_id ON coach_scores(coach_id);

-- Add triage and temporal metadata columns to match_analyses
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS triage_summary JSONB;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS temporal_summary JSONB;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS pose_metrics JSONB;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS frames_triaged INTEGER;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS frames_after_triage INTEGER;

-- Calibration snapshots table (stores periodic calibration summary)
CREATE TABLE IF NOT EXISTS calibration_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_comparisons INTEGER NOT NULL,
  avg_overall_mae REAL NOT NULL,
  avg_position_mae JSONB NOT NULL,
  avg_bias REAL NOT NULL,
  direction_accuracy REAL NOT NULL,
  confidence_correlation REAL NOT NULL,
  calibration_score INTEGER NOT NULL,
  recommendations TEXT[],
  pipeline_version TEXT NOT NULL DEFAULT 'v2',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
