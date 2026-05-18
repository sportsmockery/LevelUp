import type { ReleaseContext } from '@/types/catalog';
import type { SoundExchangeRow } from './types';

export function mapSoundExchange(ctx: ReleaseContext): SoundExchangeRow[] {
  return ctx.tracks.map((t) => {
    const performers = ctx.performers[t.id] ?? [];
    const featured = performers.filter((p) => p.featured).map((p) => p.performer_name).join('; ');
    const nonFeatured = performers.filter((p) => !p.featured).map((p) => p.performer_name).join('; ');
    const producers = (ctx.producers[t.id] ?? []).map((p) => p.producer_name).join('; ');
    return {
      track_title: t.track_title,
      artist_name: ctx.release.primary_artist ?? '',
      featured_artist: featured,
      isrc: t.isrc ?? '',
      album_title: ctx.release.release_title,
      label: ctx.release.label_name ?? '',
      duration: t.duration_ms ? msToHms(t.duration_ms) : '',
      release_date: ctx.release.release_date ?? '',
      p_line_owner: ctx.release.p_line ?? '',
      rights_owner: ctx.release.p_line ?? '',
      featured_performer: featured,
      non_featured_performer: nonFeatured,
      producer: producers,
      country: ctx.release.language ?? 'US',
      notes: t.notes ?? '',
    };
  });
}

function msToHms(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
