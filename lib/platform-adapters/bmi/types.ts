// Music Publishing — BMI adapter types.
// BMI does not publish a public bulk-upload spec; this packet is a structured
// dossier the user submits via BMI's Songview self-registration UI.

export interface BmiWriterRow {
  legal_name: string;
  ipi_number: string | null;
  pro: string | null;
  role: 'composer' | 'lyricist' | 'composer_lyricist';
  share_percent: number;
  approval_status: 'approved' | 'pending' | 'rejected' | 'needs_changes';
}

export interface BmiPublisherRow {
  publisher_name: string;
  ipi_number: string | null;
  pro: string | null;
  share_percent: number;
}

export interface BmiWork {
  track_title: string;
  duration_ms: number | null;
  isrc: string | null;
  iswc: string | null;
  performer: string;
  writers: BmiWriterRow[];
  publishers: BmiPublisherRow[];
}

export interface BmiPacket {
  org_name: string;
  release_title: string;
  release_type: string;
  primary_artist: string;
  copyright_year: number | null;
  p_line: string | null;
  c_line: string | null;
  works: BmiWork[];
  generated_at: string;
}
