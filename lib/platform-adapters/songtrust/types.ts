// Songtrust catalog upload — template-pending.
// Marked pending until the official Songtrust CSV template is provided.

export interface SongtrustRow {
  song_title: string;
  alternate_title: string;
  writer_legal_name: string;
  writer_ipi: string;
  writer_pro: string;
  writer_share: number;
  publisher_name: string;
  publisher_ipi: string;
  publisher_share: number;
  isrc: string;
  iswc: string;
  artist: string;
  release_title: string;
  duration: string;
  lyrics: string;
  notes: string;
}
