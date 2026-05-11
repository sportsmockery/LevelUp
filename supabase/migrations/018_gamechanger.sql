-- GameChanger sync tables. gc_id holds the upstream GameChanger ID (e.g. "v2FmyevcsoGf")
-- and is the upsert key so syncs are idempotent.

CREATE TABLE IF NOT EXISTS gc_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sport TEXT,
  level TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gc_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_id TEXT UNIQUE NOT NULL,
  team_id UUID NOT NULL REFERENCES gc_teams(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  jersey_number INTEGER,
  position TEXT,
  bats TEXT,
  throws TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gc_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gc_id TEXT UNIQUE NOT NULL,
  team_id UUID NOT NULL REFERENCES gc_teams(id) ON DELETE CASCADE,
  opponent TEXT,
  date DATE,
  location TEXT,
  home_away TEXT,
  result TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gc_batting_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES gc_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES gc_players(id) ON DELETE CASCADE,
  is_season_total BOOLEAN DEFAULT FALSE,
  at_bats INTEGER DEFAULT 0,
  hits INTEGER DEFAULT 0,
  doubles INTEGER DEFAULT 0,
  triples INTEGER DEFAULT 0,
  home_runs INTEGER DEFAULT 0,
  rbi INTEGER DEFAULT 0,
  base_on_balls INTEGER DEFAULT 0,
  strikeouts INTEGER DEFAULT 0,
  stolen_bases INTEGER DEFAULT 0,
  caught_stealing INTEGER DEFAULT 0,
  sacrifice_flies INTEGER DEFAULT 0,
  sacrifice_hits INTEGER DEFAULT 0,
  hit_by_pitch INTEGER DEFAULT 0,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, game_id, is_season_total)
);

CREATE TABLE IF NOT EXISTS gc_pitching_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES gc_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES gc_players(id) ON DELETE CASCADE,
  is_season_total BOOLEAN DEFAULT FALSE,
  innings_pitched NUMERIC DEFAULT 0,
  hits_allowed INTEGER DEFAULT 0,
  runs_allowed INTEGER DEFAULT 0,
  earned_runs INTEGER DEFAULT 0,
  base_on_balls_allowed INTEGER DEFAULT 0,
  strikeouts_pitched INTEGER DEFAULT 0,
  wild_pitches INTEGER DEFAULT 0,
  balks INTEGER DEFAULT 0,
  hit_by_pitch_allowed INTEGER DEFAULT 0,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, game_id, is_season_total)
);

CREATE TABLE IF NOT EXISTS gc_fielding_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES gc_games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES gc_players(id) ON DELETE CASCADE,
  is_season_total BOOLEAN DEFAULT FALSE,
  putouts INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  double_plays INTEGER DEFAULT 0,
  triple_plays INTEGER DEFAULT 0,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, game_id, is_season_total)
);

CREATE INDEX IF NOT EXISTS idx_gc_players_team ON gc_players(team_id);
CREATE INDEX IF NOT EXISTS idx_gc_games_team_date ON gc_games(team_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_gc_batting_player ON gc_batting_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_gc_pitching_player ON gc_pitching_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_gc_fielding_player ON gc_fielding_stats(player_id);

ALTER TABLE gc_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc_batting_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc_pitching_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE gc_fielding_stats ENABLE ROW LEVEL SECURITY;

-- Service-role-only by default. Add user-facing policies later when the UI lands.
