// Music Publishing — general catalog validation (platform-agnostic).
// Returns ValidationIssue[] that the UI can render inline and that gates exports.

import type { Release, Track, TrackPublisher, TrackWriter, WriterProfile, PublisherProfile } from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';

const ISRC_REGEX = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;
const IPI_REGEX = /^\d{6,11}$/;

export interface ReleaseContext {
  release: Release;
  tracks: Track[];
  writers: WriterProfile[];
  publishers: PublisherProfile[];
  trackWriters: TrackWriter[];
  trackPublishers: TrackPublisher[];
}

export function validateRelease(ctx: ReleaseContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { release, tracks, trackWriters, trackPublishers, writers, publishers } = ctx;

  if (!release.release_title?.trim()) {
    issues.push({ platform: 'general', severity: 'error', field: 'release_title', message: 'Release title is required.', blocking: true });
  }
  if (!release.primary_artist?.trim()) {
    issues.push({ platform: 'general', severity: 'error', field: 'primary_artist', message: 'Primary artist is required.', blocking: true });
  }
  if (!release.copyright_year) {
    issues.push({ platform: 'general', severity: 'error', field: 'copyright_year', message: 'Copyright year is required for ℗ and © lines.', blocking: true });
  }
  if (!release.p_line) {
    issues.push({ platform: 'general', severity: 'warning', field: 'p_line', message: 'No ℗ line set — distributors will reject without it.', blocking: false });
  }
  if (!release.c_line) {
    issues.push({ platform: 'general', severity: 'warning', field: 'c_line', message: 'No © line set — Copyright eCO filing will be incomplete.', blocking: false });
  }
  if (!release.artwork_path) {
    issues.push({ platform: 'general', severity: 'warning', field: 'artwork_path', message: 'No artwork uploaded — distributors require 3000×3000 RGB JPG/PNG.', blocking: false });
  }
  if (tracks.length === 0) {
    issues.push({ platform: 'general', severity: 'error', field: 'tracks', message: 'Release has no tracks.', blocking: true });
  }

  const writerById = new Map(writers.map((w) => [w.id, w]));
  const publisherById = new Map(publishers.map((p) => [p.id, p]));

  for (const track of tracks) {
    const prefix = `Track "${track.track_title || track.id}"`;

    if (!track.track_title?.trim()) {
      issues.push({ platform: 'general', severity: 'error', field: `track.${track.id}.title`, message: `${prefix}: title is required.`, blocking: true });
    }
    if (!track.duration_ms || track.duration_ms < 1000) {
      issues.push({ platform: 'general', severity: 'error', field: `track.${track.id}.duration_ms`, message: `${prefix}: duration must be at least 1 second.`, blocking: true });
    }
    if (track.isrc && !ISRC_REGEX.test(track.isrc)) {
      issues.push({ platform: 'general', severity: 'error', field: `track.${track.id}.isrc`, message: `${prefix}: ISRC "${track.isrc}" is not valid format (CC-XXX-YY-NNNNN).`, blocking: true });
    }
    if (!track.isrc) {
      issues.push({ platform: 'general', severity: 'warning', field: `track.${track.id}.isrc`, message: `${prefix}: no ISRC assigned.`, blocking: false });
    }

    const wRows = trackWriters.filter((tw) => tw.track_id === track.id);
    const pRows = trackPublishers.filter((tp) => tp.track_id === track.id);

    if (wRows.length === 0) {
      issues.push({ platform: 'general', severity: 'error', field: `track.${track.id}.writers`, message: `${prefix}: at least one writer is required.`, blocking: true });
    } else {
      const sum = wRows.reduce((a, r) => a + Number(r.share_percent ?? 0), 0);
      if (Math.abs(sum - 100) > 0.01) {
        issues.push({ platform: 'general', severity: 'error', field: `track.${track.id}.writer_splits`, message: `${prefix}: writer shares sum to ${sum.toFixed(2)}%, must equal 100%.`, blocking: true });
      }
      const unapproved = wRows.filter((r) => r.approval_status !== 'approved');
      if (unapproved.length > 0) {
        issues.push({ platform: 'general', severity: 'warning', field: `track.${track.id}.writer_approvals`, message: `${prefix}: ${unapproved.length} writer split(s) not yet approved.`, blocking: false });
      }
      for (const r of wRows) {
        const writer = writerById.get(r.writer_profile_id);
        if (!writer) continue;
        if (!writer.ipi_number) {
          issues.push({ platform: 'general', severity: 'warning', field: `writer.${writer.id}.ipi`, message: `Writer "${writer.legal_name}" has no IPI number — required for PRO registration.`, blocking: false });
        } else if (!IPI_REGEX.test(writer.ipi_number)) {
          issues.push({ platform: 'general', severity: 'error', field: `writer.${writer.id}.ipi`, message: `Writer "${writer.legal_name}" IPI "${writer.ipi_number}" is not 6-11 digits.`, blocking: true });
        }
        if (!writer.pro) {
          issues.push({ platform: 'general', severity: 'warning', field: `writer.${writer.id}.pro`, message: `Writer "${writer.legal_name}" has no PRO set (ASCAP/BMI/SESAC/etc.).`, blocking: false });
        }
      }
    }

    if (pRows.length > 0) {
      const sum = pRows.reduce((a, r) => a + Number(r.share_percent ?? 0), 0);
      if (Math.abs(sum - 100) > 0.01) {
        issues.push({ platform: 'general', severity: 'error', field: `track.${track.id}.publisher_splits`, message: `${prefix}: publisher shares sum to ${sum.toFixed(2)}%, must equal 100% of publisher side.`, blocking: true });
      }
      for (const r of pRows) {
        const pub = publisherById.get(r.publisher_profile_id);
        if (!pub) continue;
        if (!pub.ipi_number) {
          issues.push({ platform: 'general', severity: 'warning', field: `publisher.${pub.id}.ipi`, message: `Publisher "${pub.publisher_name}" has no IPI number.`, blocking: false });
        }
      }
    }
  }

  return issues;
}

export function blockingIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((i) => i.blocking);
}
