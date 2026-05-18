import type { ReleaseContext } from '@/types/catalog';
import type { DistributorRow } from './types';

export function mapDistributor(ctx: ReleaseContext): DistributorRow[] {
  return ctx.tracks.map((t) => {
    const writers = (ctx.writers[t.id] ?? [])
      .map((w) => {
        const p = w.writer_profile_id ? ctx.writerProfiles[w.writer_profile_id] : null;
        return p ? `${p.legal_name} (${w.share_percent}%)` : `Unknown (${w.share_percent}%)`;
      })
      .join('; ');
    const producers = (ctx.producers[t.id] ?? []).map((p) => p.producer_name).join('; ');
    const publishers = (ctx.publishers[t.id] ?? [])
      .map((p) => {
        const pp = p.publisher_profile_id ? ctx.publisherProfiles[p.publisher_profile_id] : null;
        return pp ? `${pp.publisher_name} (${p.share_percent}%)` : `Unknown (${p.share_percent}%)`;
      })
      .join('; ');
    return {
      release_title: ctx.release.release_title,
      track_title: t.track_title,
      primary_artist: ctx.release.primary_artist ?? '',
      featured_artists: (ctx.release.featured_artists ?? []).join('; '),
      isrc: t.isrc ?? '',
      upc: ctx.release.upc ?? '',
      label: ctx.release.label_name ?? '',
      release_date: ctx.release.release_date ?? '',
      genre: ctx.release.genre ?? '',
      language: t.language ?? ctx.release.language ?? '',
      explicit: t.explicit ? 'yes' : 'no',
      duration: t.duration_ms ? msToHms(t.duration_ms) : '',
      p_line: t.p_line ?? ctx.release.p_line ?? '',
      c_line: t.c_line ?? ctx.release.c_line ?? '',
      lyrics: t.lyrics ?? '',
      writer_credits: writers,
      producer_credits: producers,
      publisher_credits: publishers,
    };
  });
}

function msToHms(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
