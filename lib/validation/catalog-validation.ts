import type {
  Release,
  Track,
  TrackWriter,
  TrackPublisher,
  WriterProfile,
  PublisherProfile,
} from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';

export const ISRC_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

const issue = (
  field: string,
  message: string,
  opts: { severity?: 'error' | 'warning'; blocking?: boolean } = {},
): ValidationIssue => ({
  platform: 'catalog',
  severity: opts.severity ?? 'error',
  field,
  message,
  blocking: opts.blocking ?? opts.severity !== 'warning',
});

export function validateISRC(code: string): boolean {
  return ISRC_PATTERN.test(code);
}

export function sumShares(rows: { share_percent: number }[]): number {
  return rows.reduce((acc, r) => acc + Number(r.share_percent || 0), 0);
}

export function validateRelease(release: Release): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!release.release_title?.trim()) {
    issues.push(issue('release_title', 'Release title is required'));
  }
  if (!release.primary_artist?.trim()) {
    issues.push(issue('primary_artist', 'Primary artist is required'));
  }
  if (!release.artwork_path) {
    issues.push(issue('artwork_path', 'Artwork is recommended before distribution', { severity: 'warning', blocking: false }));
  }
  if (!release.p_line) {
    issues.push(issue('p_line', 'P-line (sound recording copyright) is required', { severity: 'warning', blocking: false }));
  }
  if (!release.c_line) {
    issues.push(issue('c_line', 'C-line (composition copyright) is required', { severity: 'warning', blocking: false }));
  }
  if (!release.copyright_year) {
    issues.push(issue('copyright_year', 'Copyright year is required for registration', { severity: 'warning', blocking: false }));
  }
  return issues;
}

export function validateTrack(track: Track): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!track.track_title?.trim()) {
    issues.push(issue(`track:${track.id}.title`, 'Track title is required'));
  }
  if (track.isrc && !validateISRC(track.isrc)) {
    issues.push(
      issue(`track:${track.id}.isrc`, `ISRC "${track.isrc}" is invalid — expected format CCXXXYYNNNNN`),
    );
  }
  return issues;
}

export function validateWriterSplits(
  track: Track,
  writers: TrackWriter[],
  writerProfiles: Record<string, WriterProfile>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (writers.length === 0) {
    issues.push(issue(`track:${track.id}.writers`, `Track "${track.track_title}" has no writers`));
    return issues;
  }
  const total = sumShares(writers);
  // Allow 3 decimal places of tolerance.
  if (Math.round(total * 1000) !== 100000) {
    issues.push(
      issue(
        `track:${track.id}.writer_splits`,
        `Track "${track.track_title}": writer shares total ${total.toFixed(3)}% (must equal 100%)`,
      ),
    );
  }
  for (const w of writers) {
    if (!w.writer_profile_id) {
      issues.push(
        issue(`track_writer:${w.id}.writer_profile_id`, 'Writer is not linked to a writer profile', {
          severity: 'warning',
          blocking: false,
        }),
      );
      continue;
    }
    const profile = writerProfiles[w.writer_profile_id];
    if (profile && !profile.ipi_number) {
      issues.push(
        issue(`writer_profile:${profile.id}.ipi`, `Writer "${profile.legal_name}" is missing an IPI number`, {
          severity: 'warning',
          blocking: false,
        }),
      );
    }
  }
  return issues;
}

export function validatePublisherSplits(
  track: Track,
  publishers: TrackPublisher[],
  publisherProfiles: Record<string, PublisherProfile>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (publishers.length === 0) {
    issues.push(
      issue(`track:${track.id}.publishers`, `Track "${track.track_title}" has no publishers`, {
        severity: 'warning',
        blocking: false,
      }),
    );
    return issues;
  }
  const total = sumShares(publishers);
  if (Math.round(total * 1000) !== 100000) {
    issues.push(
      issue(
        `track:${track.id}.publisher_splits`,
        `Track "${track.track_title}": publisher shares total ${total.toFixed(3)}% (must equal 100%)`,
      ),
    );
  }
  for (const p of publishers) {
    if (!p.publisher_profile_id) continue;
    const profile = publisherProfiles[p.publisher_profile_id];
    if (profile && !profile.ipi_number) {
      issues.push(
        issue(`publisher_profile:${profile.id}.ipi`, `Publisher "${profile.publisher_name}" is missing an IPI number`, {
          severity: 'warning',
          blocking: false,
        }),
      );
    }
  }
  return issues;
}

export interface CatalogValidationInput {
  release: Release;
  tracks: Track[];
  writersByTrack: Record<string, TrackWriter[]>;
  publishersByTrack: Record<string, TrackPublisher[]>;
  writerProfiles: Record<string, WriterProfile>;
  publisherProfiles: Record<string, PublisherProfile>;
}

export function validateCatalog(input: CatalogValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  issues.push(...validateRelease(input.release));
  for (const track of input.tracks) {
    issues.push(...validateTrack(track));
    issues.push(
      ...validateWriterSplits(
        track,
        input.writersByTrack[track.id] ?? [],
        input.writerProfiles,
      ),
    );
    issues.push(
      ...validatePublisherSplits(
        track,
        input.publishersByTrack[track.id] ?? [],
        input.publisherProfiles,
      ),
    );
  }
  return issues;
}
