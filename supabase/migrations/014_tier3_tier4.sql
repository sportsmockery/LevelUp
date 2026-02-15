-- Migration 014: Tier 3 & Tier 4 Features
-- Training data, model versioning, sharing, leaderboards, external imports, progressive analysis

-- ===== Feature 9: Fine-Tuned Wrestling Vision Model =====

-- Training data exports for model fine-tuning
CREATE TABLE IF NOT EXISTS training_data_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  export_type TEXT NOT NULL CHECK (export_type IN ('vision_finetune', 'scoring_calibration', 'full_pipeline')),
  analysis_count INTEGER NOT NULL DEFAULT 0,
  validation_count INTEGER NOT NULL DEFAULT 0,
  file_path TEXT,
  file_size_bytes BIGINT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Model version tracking
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_tag TEXT NOT NULL UNIQUE,
  model_type TEXT NOT NULL CHECK (model_type IN ('vision', 'scoring', 'triage')),
  base_model TEXT NOT NULL DEFAULT 'gpt-4o',
  prompt_hash TEXT,
  config JSONB DEFAULT '{}',
  evaluation_metrics JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Prompt calibration history
CREATE TABLE IF NOT EXISTS prompt_calibrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_version_id UUID REFERENCES model_versions(id),
  calibration_type TEXT NOT NULL CHECK (calibration_type IN ('bias_correction', 'threshold_adjustment', 'prompt_edit')),
  before_metrics JSONB NOT NULL DEFAULT '{}',
  after_metrics JSONB DEFAULT '{}',
  adjustments JSONB NOT NULL DEFAULT '{}',
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Feature 10: TrackWrestling/MatBoss Integration =====

-- TrackWrestling wrestler records
CREATE TABLE IF NOT EXISTS tw_wrestler_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tw_wrestler_id TEXT,
  wrestler_profile_id UUID REFERENCES wrestler_profiles(id),
  name TEXT NOT NULL,
  team TEXT,
  weight_class TEXT,
  grade TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  pins INTEGER DEFAULT 0,
  tech_falls INTEGER DEFAULT 0,
  major_decisions INTEGER DEFAULT 0,
  season TEXT,
  state TEXT DEFAULT 'IL',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tw_wrestler_records_profile ON tw_wrestler_records(wrestler_profile_id);
CREATE INDEX IF NOT EXISTS idx_tw_wrestler_records_tw_id ON tw_wrestler_records(tw_wrestler_id);

-- MatBoss imported match records
CREATE TABLE IF NOT EXISTS matboss_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wrestler_profile_id UUID REFERENCES wrestler_profiles(id),
  import_source TEXT NOT NULL DEFAULT 'csv',
  match_date DATE,
  opponent_name TEXT,
  opponent_team TEXT,
  weight_class TEXT,
  result TEXT CHECK (result IN ('win', 'loss', 'draw', 'no_contest')),
  result_type TEXT CHECK (result_type IN ('pin', 'tech_fall', 'major_decision', 'decision', 'forfeit', 'default', 'disqualification', 'medical_forfeit')),
  wrestler_score INTEGER,
  opponent_score INTEGER,
  match_duration_seconds INTEGER,
  period_scores JSONB,
  tournament_name TEXT,
  tournament_placement TEXT,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matboss_imports_profile ON matboss_imports(wrestler_profile_id);
CREATE INDEX IF NOT EXISTS idx_matboss_imports_date ON matboss_imports(match_date);

-- ===== Feature 11: Social/Community =====

-- Shared analyses (public links)
CREATE TABLE IF NOT EXISTS shared_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  shared_by TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'team', 'unlisted')),
  include_video_frames BOOLEAN DEFAULT FALSE,
  include_drills BOOLEAN DEFAULT TRUE,
  include_sub_scores BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_token ON shared_analyses(share_token);

-- Activity feed entries
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID,
  athlete_id TEXT NOT NULL,
  athlete_name TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('analysis_complete', 'score_improvement', 'badge_earned', 'streak', 'comparison', 'drill_completed', 'milestone')),
  title TEXT NOT NULL,
  subtitle TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_feed_club ON activity_feed(club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_athlete ON activity_feed(athlete_id, created_at DESC);

-- Club leaderboard snapshots (cached daily)
CREATE TABLE IF NOT EXISTS club_leaderboard_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('overall', 'standing', 'top', 'bottom', 'improvement', 'consistency')),
  rankings JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, snapshot_date, leaderboard_type)
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_club ON club_leaderboard_snapshots(club_id, snapshot_date DESC);

-- ===== Feature 12: Progressive/Streaming Analysis =====

-- Progressive analysis sessions
CREATE TABLE IF NOT EXISTS progressive_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id TEXT NOT NULL,
  match_style TEXT DEFAULT 'folkstyle',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'complete', 'expired')),
  frames_received INTEGER DEFAULT 0,
  frames_processed INTEGER DEFAULT 0,
  chunks_completed INTEGER DEFAULT 0,
  current_scores JSONB DEFAULT '{}',
  final_analysis_id UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_progressive_sessions_status ON progressive_sessions(status, last_activity_at DESC);

-- ===== Performance indexes for existing tables =====

-- Speed up wrestler progress queries
CREATE INDEX IF NOT EXISTS idx_match_analyses_wrestler_date ON match_analyses(wrestler_profile_id, match_date DESC);

-- Speed up validation correlation queries
CREATE INDEX IF NOT EXISTS idx_expert_validations_analysis ON expert_validations(analysis_id);

-- Speed up comparison queries
CREATE INDEX IF NOT EXISTS idx_comparisons_wrestler ON comparisons(wrestler_profile_id, created_at DESC);
