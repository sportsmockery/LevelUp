-- /levelup/supabase/migrations/004_events_and_brackets.sql
-- Events, brackets, bouts, placements tables for LevelUp Wrestling

-- ============================================================
-- APP CONFIG (for storing last known Flo ID, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value)
VALUES ('last_flo_event_id', '14468740')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  location_city TEXT,
  location_state TEXT DEFAULT 'IL',
  venue TEXT,
  street TEXT,
  zip TEXT,
  style TEXT,
  age_divisions TEXT[],
  trackwrestling_url TEXT,
  tw_tournament_id TEXT,
  flo_event_id TEXT,
  flo_bracket_url TEXT,
  source TEXT DEFAULT 'trackwrestling',
  bracket_sync_status TEXT DEFAULT 'pending',
  bracket_synced_at TIMESTAMPTZ,
  total_brackets INTEGER DEFAULT 0,
  total_bouts INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If events table already exists, add missing columns safely
DO $$ BEGIN
  ALTER TABLE events ADD COLUMN IF NOT EXISTS flo_event_id TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS flo_bracket_url TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS tw_tournament_id TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS venue TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS street TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS zip TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS bracket_sync_status TEXT DEFAULT 'pending';
  ALTER TABLE events ADD COLUMN IF NOT EXISTS bracket_synced_at TIMESTAMPTZ;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS total_brackets INTEGER DEFAULT 0;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS total_bouts INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_flo_id ON events(flo_event_id);
CREATE INDEX IF NOT EXISTS idx_events_tw_id ON events(tw_tournament_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_tw_id_unique ON events(tw_tournament_id) WHERE tw_tournament_id IS NOT NULL;

-- ============================================================
-- CANDIDATE EVENTS (cron-discovered, pending admin review)
-- ============================================================

CREATE TABLE IF NOT EXISTS candidate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  location_city TEXT,
  location_state TEXT DEFAULT 'IL',
  venue TEXT,
  street TEXT,
  zip TEXT,
  tw_tournament_id TEXT UNIQUE,
  flo_event_id TEXT,
  source TEXT DEFAULT 'trackwrestling',
  status TEXT DEFAULT 'pending',
  match_confidence INTEGER,
  approved_event_id UUID,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_status ON candidate_events(status);
CREATE INDEX IF NOT EXISTS idx_candidate_tw_id ON candidate_events(tw_tournament_id);

DO $$ BEGIN
  ALTER TABLE candidate_events ADD COLUMN IF NOT EXISTS flo_event_id TEXT;
  ALTER TABLE candidate_events ADD COLUMN IF NOT EXISTS match_confidence INTEGER;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- BRACKETS (one row per weight class per event)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  flo_bracket_id TEXT NOT NULL,
  weight_class TEXT NOT NULL,
  participant_count INTEGER DEFAULT 0,
  bout_count INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, flo_bracket_id)
);

CREATE INDEX IF NOT EXISTS idx_brackets_event ON event_brackets(event_id);

-- ============================================================
-- BOUTS (every match in every bracket)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_bouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES event_brackets(id) ON DELETE CASCADE,
  flo_bout_id TEXT,
  match_number TEXT,
  round_name TEXT,
  result TEXT,
  win_type TEXT,
  bout_state TEXT DEFAULT 'completed',
  placement TEXT,
  -- Top wrestler
  top_wrestler_name TEXT,
  top_wrestler_team TEXT,
  top_wrestler_display_team TEXT,
  top_wrestler_seed INTEGER,
  top_wrestler_score INTEGER DEFAULT 0,
  top_wrestler_winner BOOLEAN DEFAULT false,
  top_wrestler_flo_id TEXT,
  -- Bottom wrestler
  bottom_wrestler_name TEXT,
  bottom_wrestler_team TEXT,
  bottom_wrestler_display_team TEXT,
  bottom_wrestler_seed INTEGER,
  bottom_wrestler_score INTEGER DEFAULT 0,
  bottom_wrestler_winner BOOLEAN DEFAULT false,
  bottom_wrestler_flo_id TEXT,
  -- Bracket position
  bracket_x INTEGER,
  bracket_y INTEGER,
  UNIQUE(bracket_id, flo_bout_id)
);

CREATE INDEX IF NOT EXISTS idx_bouts_bracket ON event_bouts(bracket_id);
CREATE INDEX IF NOT EXISTS idx_bouts_round ON event_bouts(round_name);
CREATE INDEX IF NOT EXISTS idx_bouts_wrestler_top ON event_bouts(top_wrestler_name);
CREATE INDEX IF NOT EXISTS idx_bouts_wrestler_bottom ON event_bouts(bottom_wrestler_name);

-- ============================================================
-- PLACEMENTS (final standings per weight class)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES event_brackets(id) ON DELETE CASCADE,
  place TEXT NOT NULL,
  wrestler_name TEXT NOT NULL,
  team_name TEXT,
  flo_participant_id TEXT,
  UNIQUE(bracket_id, place)
);

CREATE INDEX IF NOT EXISTS idx_placements_bracket ON event_placements(bracket_id);
CREATE INDEX IF NOT EXISTS idx_placements_name ON event_placements(wrestler_name);

-- ============================================================
-- ROW LEVEL SECURITY — public read for all bracket data
-- ============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Events readable by all" ON events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE candidate_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Candidates readable by all" ON candidate_events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE event_brackets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Brackets readable by all" ON event_brackets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE event_bouts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Bouts readable by all" ON event_bouts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE event_placements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Placements readable by all" ON event_placements FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Config readable by all" ON app_config FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER candidate_events_updated_at BEFORE UPDATE ON candidate_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
