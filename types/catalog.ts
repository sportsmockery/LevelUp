// Music Publishing — catalog types. Mirror the SQL schema in 20260517000000_music_publishing.sql.

export type OrgRole = 'owner' | 'admin' | 'editor' | 'collaborator' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  joined_at: string;
}

export interface ArtistProfile {
  id: string;
  org_id: string;
  legal_name: string;
  stage_name: string | null;
  isni: string | null;
  country: string | null;
  bio: string | null;
  notes: string | null;
  created_at: string;
}

export interface WriterProfile {
  id: string;
  org_id: string;
  legal_name: string;
  stage_name: string | null;
  ipi_number: string | null;
  pro: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  role: string | null;
  notes: string | null;
  created_at: string;
}

export interface PublisherProfile {
  id: string;
  org_id: string;
  publisher_name: string;
  legal_entity_name: string | null;
  ipi_number: string | null;
  pro: string | null;
  publisher_type: string | null;
  admin_company: string | null;
  territory: string | null;
  ownership_percentage: number | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export type ReleaseType = 'single' | 'ep' | 'album' | 'compilation';

export interface Release {
  id: string;
  org_id: string;
  release_title: string;
  release_type: ReleaseType;
  primary_artist: string | null;
  featured_artists: string[];
  label_name: string | null;
  upc: string | null;
  catalog_number: string | null;
  release_date: string | null;
  original_release_date: string | null;
  language: string | null;
  genre: string | null;
  sub_genre: string | null;
  copyright_year: number | null;
  p_line: string | null;
  c_line: string | null;
  distributor: string | null;
  artwork_path: string | null;
  step_overrides: Record<string, { reason: string; by: string; at: string }>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  org_id: string;
  release_id: string;
  track_title: string;
  version: string | null;
  track_number: number | null;
  disc_number: number;
  duration_ms: number | null;
  isrc: string | null;
  iswc: string | null;
  language: string | null;
  explicit: boolean;
  instrumental: boolean;
  bpm: number | null;
  musical_key: string | null;
  mood_tags: string[];
  recording_date: string | null;
  recording_location: string | null;
  studio_name: string | null;
  recording_engineer: string | null;
  mixing_engineer: string | null;
  mastering_engineer: string | null;
  p_line: string | null;
  c_line: string | null;
  lyrics: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type WriterRole = 'composer' | 'lyricist' | 'composer_lyricist';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'needs_changes';

export interface TrackWriter {
  id: string;
  track_id: string;
  writer_profile_id: string;
  role: WriterRole;
  share_percent: number;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface TrackPublisher {
  id: string;
  track_id: string;
  publisher_profile_id: string;
  share_percent: number;
  notes: string | null;
  created_at: string;
}

export interface TrackPerformer {
  id: string;
  track_id: string;
  performer_name: string;
  featured: boolean;
  role: string | null;
  notes: string | null;
  created_at: string;
}

export interface TrackProducer {
  id: string;
  track_id: string;
  producer_name: string;
  role: string | null;
  notes: string | null;
  created_at: string;
}

export type ISRCStatus = 'reserved' | 'assigned' | 'retired';

export interface ISRCCode {
  id: string;
  org_id: string;
  isrc_code: string;
  track_id: string | null;
  release_id: string | null;
  registrant_code: string | null;
  country_code: string | null;
  year: number | null;
  designation_code: string | null;
  status: ISRCStatus;
  assigned_date: string | null;
  notes: string | null;
  created_at: string;
}

export type CustomFieldEntityType = 'release' | 'track' | 'writer' | 'publisher';
export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'boolean'
  | 'multi_select'
  | 'url'
  | 'file';

export interface CustomField {
  id: string;
  org_id: string;
  entity_type: CustomFieldEntityType;
  field_key: string;
  field_label: string;
  field_type: CustomFieldType;
  options: string[];
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  entity_id: string;
  value: unknown;
  created_at: string;
}
