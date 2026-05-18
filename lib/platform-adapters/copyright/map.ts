import type { ReleaseContext } from '@/types/catalog';
import type { CopyrightPacketEntry } from './types';

export function mapCopyright(ctx: ReleaseContext): CopyrightPacketEntry[] {
  return ctx.tracks.map((t) => {
    const authors = (ctx.writers[t.id] ?? []).map((w) => {
      const profile = w.writer_profile_id ? ctx.writerProfiles[w.writer_profile_id] : null;
      return {
        name: profile?.legal_name ?? 'Unknown author',
        role: w.role,
      };
    });
    return {
      title_of_work: t.track_title,
      type_of_work: 'both',
      authors,
      claimants: [ctx.release.c_line, ctx.release.p_line].filter((v): v is string => !!v),
      year_of_completion: ctx.release.copyright_year,
      date_of_publication: ctx.release.release_date,
      nation_of_publication: 'United States',
      sound_recording_owner: ctx.release.p_line,
      composition_owner: ctx.release.c_line,
      lyrics: t.lyrics,
      deposit_material_notes: 'Submit final master audio and lyric sheet as deposit copy.',
      rights_and_permissions_contact: ctx.release.label_name,
    };
  });
}
