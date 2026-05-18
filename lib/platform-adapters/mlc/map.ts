import type { ReleaseContext } from '@/types/catalog';
import type { MLCWorkPayload } from './types';

export function mapMLC(ctx: ReleaseContext): MLCWorkPayload[] {
  return ctx.tracks.map((t) => ({
    work_title: t.track_title,
    writers: (ctx.writers[t.id] ?? []).map((w) => {
      const profile = w.writer_profile_id ? ctx.writerProfiles[w.writer_profile_id] : null;
      return {
        name: profile?.legal_name ?? 'Unknown writer',
        ipi: profile?.ipi_number ?? null,
        share: Number(w.share_percent),
      };
    }),
    publishers: (ctx.publishers[t.id] ?? []).map((p) => {
      const profile = p.publisher_profile_id ? ctx.publisherProfiles[p.publisher_profile_id] : null;
      return {
        name: profile?.publisher_name ?? 'Unknown publisher',
        ipi: profile?.ipi_number ?? null,
        share: Number(p.share_percent),
      };
    }),
    iswc: t.iswc,
    isrc: t.isrc,
    recording_title: t.track_title,
    recording_artist: ctx.release.primary_artist,
    release_title: ctx.release.release_title,
    duration: t.duration_ms ? msToHms(t.duration_ms) : null,
    territory: 'US',
  }));
}

function msToHms(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
