// MLC work registration — template-pending.
// Final DDEX field names will be added when the official MLC template is provided.

export interface MLCWorkPayload {
  work_title: string;
  writers: Array<{ name: string; ipi: string | null; share: number }>;
  publishers: Array<{ name: string; ipi: string | null; share: number }>;
  iswc: string | null;
  isrc: string | null;
  recording_title: string;
  recording_artist: string | null;
  release_title: string | null;
  duration: string | null;
  territory: string;
}
