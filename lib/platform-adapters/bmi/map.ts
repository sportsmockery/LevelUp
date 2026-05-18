// Map our ReleaseContext into the shape the BMI packet generator expects.

import type { ReleaseContext } from '@/lib/validation/catalog-validation';
import type { BmiPacket, BmiWork } from '@/lib/platform-adapters/bmi/types';

export function bmiMap(orgName: string, ctx: ReleaseContext): BmiPacket {
  const writerById = new Map(ctx.writers.map((w) => [w.id, w]));
  const publisherById = new Map(ctx.publishers.map((p) => [p.id, p]));

  const works: BmiWork[] = ctx.tracks.map((track) => {
    const writers = ctx.trackWriters
      .filter((tw) => tw.track_id === track.id)
      .map((tw) => {
        const w = writerById.get(tw.writer_profile_id);
        return {
          legal_name: w?.legal_name ?? 'UNKNOWN',
          ipi_number: w?.ipi_number ?? null,
          pro: w?.pro ?? null,
          role: tw.role,
          share_percent: Number(tw.share_percent),
          approval_status: tw.approval_status,
        };
      });
    const publishers = ctx.trackPublishers
      .filter((tp) => tp.track_id === track.id)
      .map((tp) => {
        const p = publisherById.get(tp.publisher_profile_id);
        return {
          publisher_name: p?.publisher_name ?? 'UNKNOWN',
          ipi_number: p?.ipi_number ?? null,
          pro: p?.pro ?? null,
          share_percent: Number(tp.share_percent),
        };
      });
    return {
      track_title: track.track_title,
      duration_ms: track.duration_ms,
      isrc: track.isrc,
      iswc: track.iswc,
      performer: ctx.release.primary_artist ?? 'UNKNOWN',
      writers,
      publishers,
    };
  });

  return {
    org_name: orgName,
    release_title: ctx.release.release_title,
    release_type: ctx.release.release_type,
    primary_artist: ctx.release.primary_artist ?? 'UNKNOWN',
    copyright_year: ctx.release.copyright_year,
    p_line: ctx.release.p_line,
    c_line: ctx.release.c_line,
    works,
    generated_at: new Date().toISOString(),
  };
}
