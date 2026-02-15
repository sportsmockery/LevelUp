-- Temporal Action Detection: action sequences table and frame tagging columns
-- Groups consecutive high-motion frames into action sequences (shot attempts, scrambles, rides)

-- Action sequences table
CREATE TABLE IF NOT EXISTS action_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES match_analyses(id) ON DELETE CASCADE,
  start_timestamp REAL NOT NULL,           -- Seconds from video start
  end_timestamp REAL NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('shot_attempt', 'scramble', 'ride', 'escape_attempt', 'turn_attempt', 'reset', 'neutral')),
  technique_attempted TEXT,                -- 'single_leg', 'double_leg', 'sprawl', etc.
  outcome TEXT CHECK (outcome IN ('success', 'defended', 'countered', 'incomplete', 'unknown')),
  peak_frame_index INTEGER,
  peak_motion_delta REAL,
  frame_count INTEGER NOT NULL DEFAULT 0,
  representative_frames INTEGER[],         -- Array of frame indices [start, peak, end]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_sequences_analysis_id ON action_sequences(analysis_id);
CREATE INDEX IF NOT EXISTS idx_action_sequences_action_type ON action_sequences(action_type);

-- Add action tagging columns to match_analyses for per-frame metadata
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS action_windows JSONB;
-- Stores: [{ windowId, frameIndex, sequencePosition, motionDelta }]

-- Add action summary to match_analyses
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS action_summary JSONB;
-- Stores: { shot_attempts: { total, successful, ... }, scrambles: { ... }, ... }
