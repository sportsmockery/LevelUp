-- LevelUp: Match Analyses, Drills, Badges, Level History
-- Run against your Supabase project via the SQL editor or CLI

-- ============================================================
-- 1. match_analyses — one row per analyzed video
-- ============================================================
CREATE TABLE IF NOT EXISTS match_analyses (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id    UUID NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  match_date    DATE,

  -- scores
  overall_score SMALLINT NOT NULL,
  standing      SMALLINT NOT NULL,
  top           SMALLINT NOT NULL,
  bottom        SMALLINT NOT NULL,
  confidence    REAL,

  -- sub-scores (JSON for flexibility)
  sub_scores    JSONB,

  -- match result
  match_result       TEXT,  -- win, loss, draw, unknown
  result_type        TEXT,  -- pin, tech_fall, major_decision, decision, unknown
  match_duration_sec SMALLINT,

  -- match stats
  takedowns_scored   SMALLINT DEFAULT 0,
  takedowns_allowed  SMALLINT DEFAULT 0,
  reversals_scored   SMALLINT DEFAULT 0,
  escapes_scored     SMALLINT DEFAULT 0,
  near_falls_scored  SMALLINT DEFAULT 0,
  pins_scored        SMALLINT DEFAULT 0,

  -- match context
  weight_class       TEXT,
  competition_name   TEXT,
  match_style        TEXT,

  -- strengths / weaknesses (arrays)
  strengths          TEXT[],
  weaknesses         TEXT[],

  -- full analysis JSON (for replay in the client)
  analysis_json      JSONB NOT NULL,

  -- fatigue
  fatigue_flag       BOOLEAN DEFAULT false,
  first_half_score   SMALLINT,
  second_half_score  SMALLINT
);

CREATE INDEX IF NOT EXISTS idx_match_analyses_athlete ON match_analyses (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_analyses_date ON match_analyses (athlete_id, match_date DESC);

-- ============================================================
-- 2. drill_assignments — per-match recommended drills
-- ============================================================
CREATE TABLE IF NOT EXISTS drill_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id     UUID REFERENCES match_analyses(id) ON DELETE CASCADE,
  athlete_id      UUID NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  drill_name      TEXT NOT NULL,
  drill_desc      TEXT,
  reps            TEXT,
  priority        TEXT,  -- critical, high, medium, maintenance
  addresses       TEXT,  -- which weakness
  completed       BOOLEAN DEFAULT false,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_drill_assignments_athlete ON drill_assignments (athlete_id, completed, created_at DESC);

-- ============================================================
-- 3. badges — earned achievements
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id  UUID NOT NULL,
  badge_key   TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  badge_icon  TEXT,
  awarded_at  TIMESTAMPTZ DEFAULT now(),
  analysis_id UUID REFERENCES match_analyses(id) ON DELETE SET NULL,
  UNIQUE(athlete_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_badges_athlete ON badges (athlete_id, awarded_at DESC);

-- ============================================================
-- 4. level_history — timeline events
-- ============================================================
CREATE TABLE IF NOT EXISTS level_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id  UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  event_type  TEXT NOT NULL,  -- analysis, badge, milestone, streak
  title       TEXT NOT NULL,
  subtitle    TEXT,
  analysis_id UUID REFERENCES match_analyses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_level_history_athlete ON level_history (athlete_id, created_at DESC);

-- ============================================================
-- 5. Row Level Security (RLS)
-- ============================================================
ALTER TABLE match_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_history ENABLE ROW LEVEL SECURITY;

-- Policy: athletes can only read/write their own data
-- Uses auth.uid() to match the athlete_id via a lookup
-- For now, we allow service_role (API) full access and
-- authenticated users access to their own records

-- match_analyses
CREATE POLICY "Athletes read own analyses"
  ON match_analyses FOR SELECT
  USING (athlete_id IN (SELECT id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Service role insert analyses"
  ON match_analyses FOR INSERT
  WITH CHECK (true);

-- drill_assignments
CREATE POLICY "Athletes read own drills"
  ON drill_assignments FOR SELECT
  USING (athlete_id IN (SELECT id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Athletes update own drills"
  ON drill_assignments FOR UPDATE
  USING (athlete_id IN (SELECT id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Service role insert drills"
  ON drill_assignments FOR INSERT
  WITH CHECK (true);

-- badges
CREATE POLICY "Athletes read own badges"
  ON badges FOR SELECT
  USING (athlete_id IN (SELECT id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Service role insert badges"
  ON badges FOR INSERT
  WITH CHECK (true);

-- level_history
CREATE POLICY "Athletes read own history"
  ON level_history FOR SELECT
  USING (athlete_id IN (SELECT id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Service role insert history"
  ON level_history FOR INSERT
  WITH CHECK (true);
