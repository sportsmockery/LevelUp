-- Longitudinal Tracking: wrestler profiles and trend data
-- Enables match-over-match tracking of wrestler improvement

-- Wrestler profiles table
CREATE TABLE IF NOT EXISTS wrestler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team TEXT,
  weight_class TEXT,
  birth_year INTEGER,
  user_id UUID,                            -- FK to auth.users when auth is integrated
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wrestler_profiles_user_id ON wrestler_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_wrestler_profiles_name ON wrestler_profiles(name);

-- Link analyses to wrestler profiles
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS wrestler_profile_id UUID REFERENCES wrestler_profiles(id);
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS match_date DATE;
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS opponent_name TEXT;

CREATE INDEX IF NOT EXISTS idx_match_analyses_wrestler_profile ON match_analyses(wrestler_profile_id);
CREATE INDEX IF NOT EXISTS idx_match_analyses_match_date ON match_analyses(match_date);

-- Longitudinal trends table — aggregated metrics over time
CREATE TABLE IF NOT EXISTS longitudinal_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wrestler_profile_id UUID NOT NULL REFERENCES wrestler_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,                  -- 'overall', 'standing', 'top', 'bottom', 'stance_motion', etc.
  match_sequence INTEGER NOT NULL,         -- 1st match, 2nd match, etc.
  score INTEGER NOT NULL,
  match_date DATE,
  analysis_id UUID REFERENCES match_analyses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_longitudinal_trends_wrestler ON longitudinal_trends(wrestler_profile_id);
CREATE INDEX IF NOT EXISTS idx_longitudinal_trends_category ON longitudinal_trends(category);
CREATE INDEX IF NOT EXISTS idx_longitudinal_trends_date ON longitudinal_trends(match_date);
