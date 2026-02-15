-- Clubs table: created and managed by coaches/admins on the website
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_city TEXT,
  location_state TEXT,
  logo_url TEXT,
  requires_approval BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Club members: athletes join clubs from the mobile app
CREATE TABLE IF NOT EXISTS club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'athlete', -- 'athlete', 'coach', 'admin'
  status TEXT DEFAULT 'active', -- 'active', 'pending', 'inactive'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, athlete_id)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_club_members_athlete ON club_members(athlete_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);

-- RLS: Athletes can read all clubs, but only admins manage them
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read clubs" ON clubs FOR SELECT USING (true);
CREATE POLICY "Admins manage clubs" ON clubs FOR ALL USING (
  created_by = auth.uid()
);

-- RLS: Athletes manage their own membership; club admins manage all members
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes manage own membership" ON club_members FOR ALL USING (
  athlete_id = auth.uid()
);
CREATE POLICY "Club admins manage members" ON club_members FOR ALL USING (
  club_id IN (SELECT id FROM clubs WHERE created_by = auth.uid())
);
