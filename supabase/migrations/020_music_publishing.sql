-- ============================================================================
-- Music Publishing & Registration Automation — schema, RLS, and helpers
-- ============================================================================
-- Adds multi-tenant music publishing alongside the existing wrestling app.
-- All tables are isolated by organization_id and protected by RLS.
-- ============================================================================

-- ------------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE music_org_role AS ENUM ('owner', 'admin', 'editor', 'collaborator', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_release_type AS ENUM ('single', 'ep', 'album', 'compilation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_track_version AS ENUM (
    'original', 'radio_edit', 'clean', 'explicit', 'remix',
    'live', 'acoustic', 'instrumental', 'demo', 'alternate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_writer_role AS ENUM ('composer', 'lyricist', 'composer_lyricist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_pro AS ENUM ('BMI', 'ASCAP', 'SESAC', 'SOCAN', 'PRS', 'Other', 'Unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_publisher_type AS ENUM (
    'self_published', 'owned_publishing_company', 'songtrust_admin',
    'third_party_admin', 'label_publisher', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_isrc_status AS ENUM ('reserved', 'assigned', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_custom_entity AS ENUM ('release', 'track', 'writer', 'publisher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_custom_field_type AS ENUM (
    'text', 'number', 'date', 'dropdown', 'boolean',
    'multi_select', 'url', 'file'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_platform AS ENUM (
    'bmi', 'mlc', 'songtrust', 'soundexchange',
    'copyright', 'distributor', 'isrc', 'master'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_registration_status AS ENUM (
    'not_started', 'missing_information', 'ready', 'file_generated',
    'submitted', 'pending', 'confirmed', 'rejected', 'needs_correction', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE music_approval_status AS ENUM ('approved', 'pending', 'rejected', 'needs_changes');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------
-- organizations
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

-- ------------------------------------------------------------------
-- organization_members
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role music_org_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_org_member(org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION org_role(org UUID)
RETURNS music_org_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM organization_members
  WHERE organization_id = org AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION has_org_role(org UUID, min_role music_org_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  WITH ranks AS (
    SELECT 'viewer'::music_org_role AS r, 1 AS rank
    UNION ALL SELECT 'collaborator', 2
    UNION ALL SELECT 'editor', 3
    UNION ALL SELECT 'admin', 4
    UNION ALL SELECT 'owner', 5
  )
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN ranks user_rank ON user_rank.r = om.role
    JOIN ranks min_rank ON min_rank.r = min_role
    WHERE om.organization_id = org
      AND om.user_id = auth.uid()
      AND user_rank.rank >= min_rank.rank
  );
$$;

-- ------------------------------------------------------------------
-- artist_profiles
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  stage_name TEXT,
  isni TEXT,
  country TEXT,
  bio TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_profiles_org ON artist_profiles(organization_id);

-- ------------------------------------------------------------------
-- writer_profiles
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS writer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  stage_name TEXT,
  ipi_number TEXT,
  pro music_pro DEFAULT 'Unknown',
  email TEXT,
  phone TEXT,
  country TEXT,
  role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_writer_profiles_org ON writer_profiles(organization_id);

-- ------------------------------------------------------------------
-- publisher_profiles
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publisher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  publisher_name TEXT NOT NULL,
  legal_entity_name TEXT,
  ipi_number TEXT,
  pro music_pro DEFAULT 'Unknown',
  publisher_type music_publisher_type DEFAULT 'unknown',
  admin_company TEXT,
  territory TEXT,
  ownership_percentage NUMERIC(6,3),
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publisher_profiles_org ON publisher_profiles(organization_id);

-- ------------------------------------------------------------------
-- releases
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  release_title TEXT NOT NULL,
  release_type music_release_type NOT NULL DEFAULT 'single',
  primary_artist TEXT,
  featured_artists JSONB DEFAULT '[]'::jsonb,
  label_name TEXT,
  upc TEXT,
  catalog_number TEXT,
  release_date DATE,
  original_release_date DATE,
  language TEXT,
  genre TEXT,
  sub_genre TEXT,
  copyright_year INTEGER,
  p_line TEXT,
  c_line TEXT,
  distributor TEXT,
  artwork_path TEXT,
  notes TEXT,
  step_overrides JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_releases_org ON releases(organization_id);

-- ------------------------------------------------------------------
-- tracks
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  track_title TEXT NOT NULL,
  version music_track_version DEFAULT 'original',
  track_number INTEGER,
  disc_number INTEGER DEFAULT 1,
  duration_ms INTEGER,
  isrc TEXT,
  iswc TEXT,
  language TEXT,
  explicit BOOLEAN DEFAULT FALSE,
  instrumental BOOLEAN DEFAULT FALSE,
  bpm INTEGER,
  musical_key TEXT,
  mood_tags JSONB DEFAULT '[]'::jsonb,
  recording_date DATE,
  recording_location TEXT,
  studio_name TEXT,
  recording_engineer TEXT,
  mixing_engineer TEXT,
  mastering_engineer TEXT,
  p_line TEXT,
  c_line TEXT,
  lyrics TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracks_org ON tracks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracks_release ON tracks(release_id);
CREATE INDEX IF NOT EXISTS idx_tracks_isrc ON tracks(isrc);

-- ------------------------------------------------------------------
-- track_writers (splits)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS track_writers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  writer_profile_id UUID REFERENCES writer_profiles(id) ON DELETE SET NULL,
  role music_writer_role DEFAULT 'composer_lyricist',
  share_percent NUMERIC(6,3) NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  approval_status music_approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_writers_track ON track_writers(track_id);
CREATE INDEX IF NOT EXISTS idx_track_writers_writer ON track_writers(writer_profile_id);

-- ------------------------------------------------------------------
-- track_publishers
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS track_publishers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  publisher_profile_id UUID REFERENCES publisher_profiles(id) ON DELETE SET NULL,
  share_percent NUMERIC(6,3) NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_publishers_track ON track_publishers(track_id);

-- ------------------------------------------------------------------
-- track_performers
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS track_performers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  performer_name TEXT NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_performers_track ON track_performers(track_id);

-- ------------------------------------------------------------------
-- track_producers
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS track_producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  producer_name TEXT NOT NULL,
  role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_track_producers_track ON track_producers(track_id);

-- ------------------------------------------------------------------
-- isrc_codes
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS isrc_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  isrc_code TEXT NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
  release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
  registrant_code TEXT,
  country_code TEXT,
  year TEXT,
  designation_code TEXT,
  status music_isrc_status DEFAULT 'reserved',
  assigned_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, isrc_code)
);

CREATE INDEX IF NOT EXISTS idx_isrc_codes_org ON isrc_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_isrc_codes_track ON isrc_codes(track_id);

-- ------------------------------------------------------------------
-- custom_fields
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type music_custom_entity NOT NULL,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type music_custom_field_type NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, entity_type, field_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_org ON custom_fields(organization_id);

-- ------------------------------------------------------------------
-- custom_field_values
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(custom_field_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_id);

-- ------------------------------------------------------------------
-- platform_registrations
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  platform music_platform NOT NULL,
  status music_registration_status NOT NULL DEFAULT 'not_started',
  generated_file_id UUID,
  confirmation_number TEXT,
  confirmation_url TEXT,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_reg_org ON platform_registrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_reg_release ON platform_registrations(release_id);

-- ------------------------------------------------------------------
-- generated_files
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
  platform music_platform NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_generated_files_org ON generated_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_release ON generated_files(release_id);

-- Now that generated_files exists, add the FK from platform_registrations
ALTER TABLE platform_registrations
  DROP CONSTRAINT IF EXISTS platform_registrations_generated_file_fk;
ALTER TABLE platform_registrations
  ADD CONSTRAINT platform_registrations_generated_file_fk
  FOREIGN KEY (generated_file_id) REFERENCES generated_files(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------
-- audit_logs
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members can read their orgs" ON organizations;
CREATE POLICY "members can read their orgs" ON organizations
  FOR SELECT USING (is_org_member(id) OR created_by = auth.uid());
DROP POLICY IF EXISTS "users can create orgs" ON organizations;
CREATE POLICY "users can create orgs" ON organizations
  FOR INSERT WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "admins can update their orgs" ON organizations;
CREATE POLICY "admins can update their orgs" ON organizations
  FOR UPDATE USING (has_org_role(id, 'admin'));
DROP POLICY IF EXISTS "owners can delete their orgs" ON organizations;
CREATE POLICY "owners can delete their orgs" ON organizations
  FOR DELETE USING (has_org_role(id, 'owner'));

-- organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members can read their member rows" ON organization_members;
CREATE POLICY "members can read their member rows" ON organization_members
  FOR SELECT USING (user_id = auth.uid() OR is_org_member(organization_id));
DROP POLICY IF EXISTS "admins manage members" ON organization_members;
CREATE POLICY "admins manage members" ON organization_members
  FOR ALL USING (has_org_role(organization_id, 'admin'))
  WITH CHECK (has_org_role(organization_id, 'admin'));

-- Macro to enable org-scoped RLS for a table
-- (we expand inline because pgSQL doesn't support macros)

-- artist_profiles
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read artists" ON artist_profiles;
CREATE POLICY "org members read artists" ON artist_profiles
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "editors write artists" ON artist_profiles;
CREATE POLICY "editors write artists" ON artist_profiles
  FOR ALL USING (has_org_role(organization_id, 'editor'))
  WITH CHECK (has_org_role(organization_id, 'editor'));

-- writer_profiles
ALTER TABLE writer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read writers" ON writer_profiles;
CREATE POLICY "org members read writers" ON writer_profiles
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "editors write writers" ON writer_profiles;
CREATE POLICY "editors write writers" ON writer_profiles
  FOR ALL USING (has_org_role(organization_id, 'editor'))
  WITH CHECK (has_org_role(organization_id, 'editor'));

-- publisher_profiles
ALTER TABLE publisher_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read publishers" ON publisher_profiles;
CREATE POLICY "org members read publishers" ON publisher_profiles
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "editors write publishers" ON publisher_profiles;
CREATE POLICY "editors write publishers" ON publisher_profiles
  FOR ALL USING (has_org_role(organization_id, 'editor'))
  WITH CHECK (has_org_role(organization_id, 'editor'));

-- releases
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read releases" ON releases;
CREATE POLICY "org members read releases" ON releases
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "editors insert releases" ON releases;
CREATE POLICY "editors insert releases" ON releases
  FOR INSERT WITH CHECK (has_org_role(organization_id, 'editor'));
DROP POLICY IF EXISTS "editors update releases" ON releases;
CREATE POLICY "editors update releases" ON releases
  FOR UPDATE USING (has_org_role(organization_id, 'editor'));
DROP POLICY IF EXISTS "admins delete releases" ON releases;
CREATE POLICY "admins delete releases" ON releases
  FOR DELETE USING (has_org_role(organization_id, 'admin'));

-- tracks
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read tracks" ON tracks;
CREATE POLICY "org members read tracks" ON tracks
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "editors insert tracks" ON tracks;
CREATE POLICY "editors insert tracks" ON tracks
  FOR INSERT WITH CHECK (has_org_role(organization_id, 'editor'));
DROP POLICY IF EXISTS "editors update tracks" ON tracks;
CREATE POLICY "editors update tracks" ON tracks
  FOR UPDATE USING (has_org_role(organization_id, 'editor'));
DROP POLICY IF EXISTS "admins delete tracks" ON tracks;
CREATE POLICY "admins delete tracks" ON tracks
  FOR DELETE USING (has_org_role(organization_id, 'admin'));

-- track_writers — special collaborator rule
ALTER TABLE track_writers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read track_writers" ON track_writers;
CREATE POLICY "org members read track_writers" ON track_writers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_org_member(t.organization_id))
  );
DROP POLICY IF EXISTS "editors write track_writers" ON track_writers;
CREATE POLICY "editors write track_writers" ON track_writers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND has_org_role(t.organization_id, 'editor'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND has_org_role(t.organization_id, 'editor'))
  );

-- track_publishers
ALTER TABLE track_publishers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read track_publishers" ON track_publishers;
CREATE POLICY "org members read track_publishers" ON track_publishers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_org_member(t.organization_id))
  );
DROP POLICY IF EXISTS "editors write track_publishers" ON track_publishers;
CREATE POLICY "editors write track_publishers" ON track_publishers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND has_org_role(t.organization_id, 'editor'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND has_org_role(t.organization_id, 'editor'))
  );

-- track_performers
ALTER TABLE track_performers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read track_performers" ON track_performers;
CREATE POLICY "org members read track_performers" ON track_performers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_org_member(t.organization_id))
  );
DROP POLICY IF EXISTS "editors write track_performers" ON track_performers;
CREATE POLICY "editors write track_performers" ON track_performers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND has_org_role(t.organization_id, 'editor'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND has_org_role(t.organization_id, 'editor'))
  );

-- track_producers
ALTER TABLE track_producers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read track_producers" ON track_producers;
CREATE POLICY "org members read track_producers" ON track_producers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_org_member(t.organization_id))
  );
DROP POLICY IF EXISTS "editors write track_producers" ON track_producers;
CREATE POLICY "editors write track_producers" ON track_producers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND has_org_role(t.organization_id, 'editor'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND has_org_role(t.organization_id, 'editor'))
  );

-- isrc_codes
ALTER TABLE isrc_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read isrc" ON isrc_codes;
CREATE POLICY "org members read isrc" ON isrc_codes
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "editors write isrc" ON isrc_codes;
CREATE POLICY "editors write isrc" ON isrc_codes
  FOR ALL USING (has_org_role(organization_id, 'editor'))
  WITH CHECK (has_org_role(organization_id, 'editor'));

-- custom_fields
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read custom_fields" ON custom_fields;
CREATE POLICY "org members read custom_fields" ON custom_fields
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "admins write custom_fields" ON custom_fields;
CREATE POLICY "admins write custom_fields" ON custom_fields
  FOR ALL USING (has_org_role(organization_id, 'admin'))
  WITH CHECK (has_org_role(organization_id, 'admin'));

-- custom_field_values
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read cfv" ON custom_field_values;
CREATE POLICY "org members read cfv" ON custom_field_values
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM custom_fields cf WHERE cf.id = custom_field_id AND is_org_member(cf.organization_id))
  );
DROP POLICY IF EXISTS "editors write cfv" ON custom_field_values;
CREATE POLICY "editors write cfv" ON custom_field_values
  FOR ALL USING (
    EXISTS (SELECT 1 FROM custom_fields cf WHERE cf.id = custom_field_id AND has_org_role(cf.organization_id, 'editor'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM custom_fields cf WHERE cf.id = custom_field_id AND has_org_role(cf.organization_id, 'editor'))
  );

-- platform_registrations
ALTER TABLE platform_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read registrations" ON platform_registrations;
CREATE POLICY "org members read registrations" ON platform_registrations
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "editors write registrations" ON platform_registrations;
CREATE POLICY "editors write registrations" ON platform_registrations
  FOR ALL USING (has_org_role(organization_id, 'editor'))
  WITH CHECK (has_org_role(organization_id, 'editor'));

-- generated_files
ALTER TABLE generated_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read generated_files" ON generated_files;
CREATE POLICY "org members read generated_files" ON generated_files
  FOR SELECT USING (is_org_member(organization_id));
DROP POLICY IF EXISTS "editors write generated_files" ON generated_files;
CREATE POLICY "editors write generated_files" ON generated_files
  FOR ALL USING (has_org_role(organization_id, 'editor'))
  WITH CHECK (has_org_role(organization_id, 'editor'));

-- audit_logs (read for members; writes via server-side service role)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org members read audit_logs" ON audit_logs;
CREATE POLICY "org members read audit_logs" ON audit_logs
  FOR SELECT USING (is_org_member(organization_id));
-- Inserts performed via service role; no client policy.

-- ============================================================================
-- Storage buckets (created idempotently)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork', 'artwork', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('workbooks', 'workbooks', false)
ON CONFLICT (id) DO NOTHING;
