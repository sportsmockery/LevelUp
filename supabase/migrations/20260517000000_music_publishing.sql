-- Music Publishing & Registration Automation
-- Multi-tenant SaaS schema: orgs, members, catalog, splits, platforms, files, audit.
-- Table names per spec (unprefixed). Helper function namespaced to avoid collision.

-- =========================================================================
-- Helper: org membership check used by every RLS policy.
-- =========================================================================
CREATE OR REPLACE FUNCTION is_publishing_org_member(p_org uuid, p_min_role text DEFAULT 'viewer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_rank int;
  v_min_rank int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role
  FROM organization_members
  WHERE org_id = p_org AND user_id = auth.uid();

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  v_rank := CASE v_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'collaborator' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  v_min_rank := CASE p_min_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'collaborator' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  RETURN v_rank >= v_min_rank;
END;
$$;

-- =========================================================================
-- 1. Organizations
-- =========================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','editor','collaborator','viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);
CREATE INDEX IF NOT EXISTS organization_members_user_idx ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS organization_members_org_idx ON organization_members(org_id);

-- =========================================================================
-- 2. Profiles (artists, writers, publishers)
-- =========================================================================
CREATE TABLE IF NOT EXISTS artist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  stage_name text,
  isni text,
  country text,
  bio text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS artist_profiles_org_idx ON artist_profiles(org_id);

CREATE TABLE IF NOT EXISTS writer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  stage_name text,
  ipi_number text,
  pro text,
  email text,
  phone text,
  country text,
  role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS writer_profiles_org_idx ON writer_profiles(org_id);

CREATE TABLE IF NOT EXISTS publisher_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  publisher_name text NOT NULL,
  legal_entity_name text,
  ipi_number text,
  pro text,
  publisher_type text,
  admin_company text,
  territory text,
  ownership_percentage numeric(5,2),
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publisher_profiles_org_idx ON publisher_profiles(org_id);

-- =========================================================================
-- 3. Releases + tracks
-- =========================================================================
CREATE TABLE IF NOT EXISTS releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  release_title text NOT NULL,
  release_type text NOT NULL CHECK (release_type IN ('single','ep','album','compilation')),
  primary_artist text,
  featured_artists jsonb DEFAULT '[]'::jsonb,
  label_name text,
  upc text,
  catalog_number text,
  release_date date,
  original_release_date date,
  language text,
  genre text,
  sub_genre text,
  copyright_year int,
  p_line text,
  c_line text,
  distributor text,
  artwork_path text,
  step_overrides jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS releases_org_idx ON releases(org_id);

CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  release_id uuid NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  track_title text NOT NULL,
  version text,
  track_number int,
  disc_number int DEFAULT 1,
  duration_ms int,
  isrc text,
  iswc text,
  language text,
  explicit boolean DEFAULT false,
  instrumental boolean DEFAULT false,
  bpm int,
  musical_key text,
  mood_tags jsonb DEFAULT '[]'::jsonb,
  recording_date date,
  recording_location text,
  studio_name text,
  recording_engineer text,
  mixing_engineer text,
  mastering_engineer text,
  p_line text,
  c_line text,
  lyrics text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracks_release_idx ON tracks(release_id);
CREATE INDEX IF NOT EXISTS tracks_org_idx ON tracks(org_id);

-- =========================================================================
-- 4. Splits + credits
-- =========================================================================
CREATE TABLE IF NOT EXISTS track_writers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  writer_profile_id uuid NOT NULL REFERENCES writer_profiles(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('composer','lyricist','composer_lyricist')),
  share_percent numeric(6,3) NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('approved','pending','rejected','needs_changes')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS track_writers_track_idx ON track_writers(track_id);
CREATE INDEX IF NOT EXISTS track_writers_writer_idx ON track_writers(writer_profile_id);

CREATE TABLE IF NOT EXISTS track_publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  publisher_profile_id uuid NOT NULL REFERENCES publisher_profiles(id) ON DELETE RESTRICT,
  share_percent numeric(6,3) NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS track_publishers_track_idx ON track_publishers(track_id);

CREATE TABLE IF NOT EXISTS track_performers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  performer_name text NOT NULL,
  featured boolean DEFAULT false,
  role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS track_performers_track_idx ON track_performers(track_id);

CREATE TABLE IF NOT EXISTS track_producers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  producer_name text NOT NULL,
  role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS track_producers_track_idx ON track_producers(track_id);

-- =========================================================================
-- 5. ISRC ledger
-- =========================================================================
CREATE TABLE IF NOT EXISTS isrc_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  isrc_code text NOT NULL,
  track_id uuid REFERENCES tracks(id) ON DELETE SET NULL,
  release_id uuid REFERENCES releases(id) ON DELETE SET NULL,
  registrant_code text,
  country_code text,
  year int,
  designation_code text,
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','assigned','retired')),
  assigned_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, isrc_code)
);
CREATE INDEX IF NOT EXISTS isrc_codes_org_idx ON isrc_codes(org_id);

-- =========================================================================
-- 6. Custom fields
-- =========================================================================
CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('release','track','writer','publisher')),
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','number','date','dropdown','boolean','multi_select','url','file')),
  options jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, entity_type, field_key)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(custom_field_id, entity_id)
);

-- =========================================================================
-- 7. Platform registrations + generated files + audit log
-- =========================================================================
CREATE TABLE IF NOT EXISTS generated_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  release_id uuid REFERENCES releases(id) ON DELETE SET NULL,
  platform text NOT NULL,
  file_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
CREATE INDEX IF NOT EXISTS generated_files_org_idx ON generated_files(org_id);
CREATE INDEX IF NOT EXISTS generated_files_release_idx ON generated_files(release_id);

CREATE TABLE IF NOT EXISTS platform_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  release_id uuid REFERENCES releases(id) ON DELETE CASCADE,
  track_id uuid REFERENCES tracks(id) ON DELETE CASCADE,
  platform text NOT NULL
    CHECK (platform IN ('bmi','mlc','songtrust','soundexchange','copyright','distributor','isrc','master')),
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','file_generated','ready_to_submit','submitted','confirmed','rejected','needs_correction','superseded','complete')),
  generated_file_id uuid REFERENCES generated_files(id) ON DELETE SET NULL,
  confirmation_number text,
  confirmation_url text,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_registrations_org_idx ON platform_registrations(org_id);
CREATE INDEX IF NOT EXISTS platform_registrations_release_idx ON platform_registrations(release_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);

-- =========================================================================
-- RLS — enabled on every table.
-- Owner: full. Admin: full except delete org. Editor: insert/update.
-- Collaborator: read + update on track_writers they're assigned to.
-- Viewer: select only. Service role bypasses RLS implicitly.
-- =========================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE writer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE publisher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_writers ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE isrc_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY orgs_select ON organizations FOR SELECT
  USING (is_publishing_org_member(id, 'viewer'));
CREATE POLICY orgs_insert ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY orgs_update ON organizations FOR UPDATE
  USING (is_publishing_org_member(id, 'admin'));
CREATE POLICY orgs_delete ON organizations FOR DELETE
  USING (is_publishing_org_member(id, 'owner'));

-- organization_members
CREATE POLICY members_select ON organization_members FOR SELECT
  USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY members_insert ON organization_members FOR INSERT
  WITH CHECK (is_publishing_org_member(org_id, 'admin') OR (
    NOT EXISTS (SELECT 1 FROM organization_members om WHERE om.org_id = organization_members.org_id)
    AND user_id = auth.uid() AND role = 'owner'
  ));
CREATE POLICY members_update ON organization_members FOR UPDATE
  USING (is_publishing_org_member(org_id, 'admin'));
CREATE POLICY members_delete ON organization_members FOR DELETE
  USING (is_publishing_org_member(org_id, 'admin'));

-- artist
CREATE POLICY artist_select ON artist_profiles FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY artist_iud    ON artist_profiles FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                                           WITH CHECK (is_publishing_org_member(org_id, 'editor'));
-- writer
CREATE POLICY writer_select ON writer_profiles FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY writer_iud    ON writer_profiles FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                                           WITH CHECK (is_publishing_org_member(org_id, 'editor'));
-- publisher
CREATE POLICY pub_select ON publisher_profiles FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY pub_iud    ON publisher_profiles FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                                           WITH CHECK (is_publishing_org_member(org_id, 'editor'));
-- releases
CREATE POLICY rel_select ON releases FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY rel_iud    ON releases FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                                 WITH CHECK (is_publishing_org_member(org_id, 'editor'));
-- tracks
CREATE POLICY trk_select ON tracks FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY trk_iud    ON tracks FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                               WITH CHECK (is_publishing_org_member(org_id, 'editor'));

-- track_writers — collaborators can update rows linked to their own writer profile
CREATE POLICY tw_select ON track_writers FOR SELECT
  USING (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'viewer')));
CREATE POLICY tw_insert ON track_writers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor')));
CREATE POLICY tw_update ON track_writers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor'))
    OR EXISTS (
      SELECT 1 FROM writer_profiles wp
      WHERE wp.id = writer_profile_id
        AND is_publishing_org_member(wp.org_id, 'collaborator')
    )
  );
CREATE POLICY tw_delete ON track_writers FOR DELETE
  USING (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor')));

-- track_publishers
CREATE POLICY tp_select ON track_publishers FOR SELECT
  USING (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'viewer')));
CREATE POLICY tp_iud ON track_publishers FOR ALL
  USING (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor')));

-- track_performers / producers
CREATE POLICY tperf_select ON track_performers FOR SELECT
  USING (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'viewer')));
CREATE POLICY tperf_iud ON track_performers FOR ALL
  USING (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor')));

CREATE POLICY tprod_select ON track_producers FOR SELECT
  USING (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'viewer')));
CREATE POLICY tprod_iud ON track_producers FOR ALL
  USING (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM tracks t WHERE t.id = track_id AND is_publishing_org_member(t.org_id, 'editor')));

-- isrc
CREATE POLICY isrc_select ON isrc_codes FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY isrc_iud    ON isrc_codes FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                                    WITH CHECK (is_publishing_org_member(org_id, 'editor'));

-- custom_fields
CREATE POLICY cf_select ON custom_fields FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY cf_iud    ON custom_fields FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                                     WITH CHECK (is_publishing_org_member(org_id, 'editor'));

CREATE POLICY cfv_select ON custom_field_values FOR SELECT
  USING (EXISTS (SELECT 1 FROM custom_fields cf WHERE cf.id = custom_field_id AND is_publishing_org_member(cf.org_id, 'viewer')));
CREATE POLICY cfv_iud ON custom_field_values FOR ALL
  USING (EXISTS (SELECT 1 FROM custom_fields cf WHERE cf.id = custom_field_id AND is_publishing_org_member(cf.org_id, 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM custom_fields cf WHERE cf.id = custom_field_id AND is_publishing_org_member(cf.org_id, 'editor')));

-- platform_registrations
CREATE POLICY reg_select ON platform_registrations FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY reg_iud    ON platform_registrations FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                                               WITH CHECK (is_publishing_org_member(org_id, 'editor'));

-- generated_files
CREATE POLICY files_select ON generated_files FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));
CREATE POLICY files_iud    ON generated_files FOR ALL    USING (is_publishing_org_member(org_id, 'editor'))
                                                          WITH CHECK (is_publishing_org_member(org_id, 'editor'));

-- audit_logs — select-only for any member; inserts done via service role only
CREATE POLICY audit_select ON audit_logs FOR SELECT USING (is_publishing_org_member(org_id, 'viewer'));

-- =========================================================================
-- Storage buckets: artwork and workbooks. Both private, gated by org_id path.
-- Path convention: <bucket>/<org_id>/<release_id>/...
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('mp-artwork', 'mp-artwork', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('mp-workbooks', 'mp-workbooks', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY mp_artwork_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'mp-artwork'
    AND is_publishing_org_member((storage.foldername(name))[1]::uuid, 'viewer')
  );
CREATE POLICY mp_artwork_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'mp-artwork'
    AND is_publishing_org_member((storage.foldername(name))[1]::uuid, 'editor')
  );
CREATE POLICY mp_artwork_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'mp-artwork'
    AND is_publishing_org_member((storage.foldername(name))[1]::uuid, 'editor')
  );
CREATE POLICY mp_artwork_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'mp-artwork'
    AND is_publishing_org_member((storage.foldername(name))[1]::uuid, 'admin')
  );

CREATE POLICY mp_workbooks_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'mp-workbooks'
    AND is_publishing_org_member((storage.foldername(name))[1]::uuid, 'viewer')
  );
CREATE POLICY mp_workbooks_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'mp-workbooks'
    AND is_publishing_org_member((storage.foldername(name))[1]::uuid, 'editor')
  );
CREATE POLICY mp_workbooks_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'mp-workbooks'
    AND is_publishing_org_member((storage.foldername(name))[1]::uuid, 'editor')
  );
CREATE POLICY mp_workbooks_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'mp-workbooks'
    AND is_publishing_org_member((storage.foldername(name))[1]::uuid, 'admin')
  );
