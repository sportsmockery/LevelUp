export interface DistributorRow {
  release_title: string;
  track_title: string;
  primary_artist: string;
  featured_artists: string;
  isrc: string;
  upc: string;
  label: string;
  release_date: string;
  genre: string;
  language: string;
  explicit: 'yes' | 'no';
  duration: string;
  p_line: string;
  c_line: string;
  lyrics: string;
  writer_credits: string;
  producer_credits: string;
  publisher_credits: string;
}
