// BMI registration packet — copy-paste format, not bulk CSV.
// Source spec: locked product requirement. Per Phase 16, no bulk CSV
// until an official BMI bulk template is provided.

export interface BMIWorkRow {
  workTitle: string;
  alternateTitles: string[];
  durationSeconds: number | null;
  language: string | null;
  genre: string | null;
  writers: Array<{
    name: string;
    ipi: string | null;
    pro: string;
    share: number;
  }>;
  publishers: Array<{
    name: string;
    ipi: string | null;
    pro: string;
    share: number;
  }>;
  recordingArtist: string | null;
  isrc: string | null;
  releaseTitle: string | null;
  notes: string | null;
}

export interface BMIPacket {
  works: BMIWorkRow[];
}
