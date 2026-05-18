import type { ReleaseContext } from '@/types/catalog';
import type { BMIPacket, BMIWorkRow } from './types';

export function mapBMI(ctx: ReleaseContext): BMIPacket {
  const works: BMIWorkRow[] = ctx.tracks.map((t) => {
    const writers = (ctx.writers[t.id] ?? []).map((w) => {
      const profile = w.writer_profile_id ? ctx.writerProfiles[w.writer_profile_id] : null;
      return {
        name: profile?.legal_name || 'Unknown writer',
        ipi: profile?.ipi_number ?? null,
        pro: profile?.pro ?? 'Unknown',
        share: Number(w.share_percent),
      };
    });
    const publishers = (ctx.publishers[t.id] ?? []).map((p) => {
      const profile = p.publisher_profile_id ? ctx.publisherProfiles[p.publisher_profile_id] : null;
      return {
        name: profile?.publisher_name || 'Unknown publisher',
        ipi: profile?.ipi_number ?? null,
        pro: profile?.pro ?? 'Unknown',
        share: Number(p.share_percent),
      };
    });
    return {
      workTitle: t.track_title,
      alternateTitles: [],
      durationSeconds: t.duration_ms ? Math.round(t.duration_ms / 1000) : null,
      language: t.language,
      genre: ctx.release.genre,
      writers,
      publishers,
      recordingArtist: ctx.release.primary_artist,
      isrc: t.isrc,
      releaseTitle: ctx.release.release_title,
      notes: t.notes,
    };
  });
  return { works };
}
