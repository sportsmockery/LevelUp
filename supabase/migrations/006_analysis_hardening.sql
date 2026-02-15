-- Analysis hardening: wrestler identity tracking, quality metadata, coach review support

ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS athlete_side TEXT;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS athlete_bounding_box JSONB;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS opponent_bounding_box JSONB;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS identity_confidence REAL;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS quality_flags JSONB;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS hallucination_warnings TEXT[];
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS pipeline_version TEXT DEFAULT 'v2';

-- Coach review support
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS corrected_json JSONB;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
