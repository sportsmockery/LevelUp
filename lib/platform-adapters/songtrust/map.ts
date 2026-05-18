import type { ReleaseContext } from '@/types/catalog';
import type { SongtrustRow } from './types';

export function mapSongtrust(ctx: ReleaseContext): SongtrustRow[] {
  const rows: SongtrustRow[] = [];
  for (const t of ctx.tracks) {
    const writers = ctx.writers[t.id] ?? [];
    const publishers = ctx.publishers[t.id] ?? [];
    if (writers.length === 0) {
      rows.push(blankRow(t.track_title, ctx));
      continue;
    }
    for (const w of writers) {
      const writerProfile = w.writer_profile_id ? ctx.writerProfiles[w.writer_profile_id] : null;
      for (const p of publishers.length ? publishers : [null]) {
        const publisherProfile = p?.publisher_profile_id ? ctx.publisherProfiles[p.publisher_profile_id] : null;
        rows.push({
          song_title: t.track_title,
          alternate_title: '',
          writer_legal_name: writerProfile?.legal_name ?? '',
          writer_ipi: writerProfile?.ipi_number ?? '',
          writer_pro: writerProfile?.pro ?? 'Unknown',
          writer_share: Number(w.share_percent),
          publisher_name: publisherProfile?.publisher_name ?? '',
          publisher_ipi: publisherProfile?.ipi_number ?? '',
          publisher_share: p ? Number(p.share_percent) : 0,
          isrc: t.isrc ?? '',
          iswc: t.iswc ?? '',
          artist: ctx.release.primary_artist ?? '',
          release_title: ctx.release.release_title,
          duration: t.duration_ms ? msToHms(t.duration_ms) : '',
          lyrics: t.lyrics ?? '',
          notes: t.notes ?? '',
        });
      }
    }
  }
  return rows;
}

function blankRow(title: string, ctx: ReleaseContext): SongtrustRow {
  return {
    song_title: title,
    alternate_title: '',
    writer_legal_name: '',
    writer_ipi: '',
    writer_pro: 'Unknown',
    writer_share: 0,
    publisher_name: '',
    publisher_ipi: '',
    publisher_share: 0,
    isrc: '',
    iswc: '',
    artist: ctx.release.primary_artist ?? '',
    release_title: ctx.release.release_title,
    duration: '',
    lyrics: '',
    notes: '',
  };
}

function msToHms(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
