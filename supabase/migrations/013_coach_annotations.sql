-- Coach Annotation & Drawing Tools: frame annotations, sharing, voice notes
-- Enables coaches to add drawings, text, and voice notes to analysis frames

-- Frame annotations table
CREATE TABLE IF NOT EXISTS frame_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES match_analyses(id) ON DELETE CASCADE,
  frame_index INTEGER NOT NULL,            -- Which frame in the analysis
  coach_id UUID,                           -- FK to auth.users when auth integrated
  coach_name TEXT,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('drawing', 'voice', 'text')),
  drawing_data JSONB,                      -- Array of drawing elements: [{type, points, color, width}, ...]
  text_content TEXT,
  voice_url TEXT,                           -- S3/storage URL for voice recording
  voice_duration_seconds INTEGER,
  position JSONB,                          -- {x, y} screen position for text/voice icon
  timestamp REAL,                          -- Timestamp in video where annotation applies (seconds)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frame_annotations_analysis ON frame_annotations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_frame_annotations_frame ON frame_annotations(analysis_id, frame_index);
CREATE INDEX IF NOT EXISTS idx_frame_annotations_coach ON frame_annotations(coach_id);

-- Shared annotations table
CREATE TABLE IF NOT EXISTS shared_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES frame_annotations(id) ON DELETE CASCADE,
  shared_with_user_ids UUID[],             -- Athletes/coaches who can view
  share_token TEXT UNIQUE NOT NULL,        -- Public share link token
  expires_at TIMESTAMPTZ,                  -- Optional expiration
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_annotations_token ON shared_annotations(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_annotations_annotation ON shared_annotations(annotation_id);

-- Add annotation counts to match_analyses for quick display
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS annotation_count INTEGER DEFAULT 0;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS annotated_by TEXT[];  -- Array of coach names who annotated
