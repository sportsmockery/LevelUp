// Distributor adapter — produces a generic DDEX-ish metadata sheet (CSV + XLSX).
// Compatible with most distributors (DistroKid, TuneCore, CD Baby) as a reference doc.

import type { ReleaseContext } from '@/lib/validation/catalog-validation';
import { archiveFile } from '@/lib/files/workbookArchive';
import { buildCsv, buildXlsx, fmtDuration, safeSlug } from '@/lib/export/spreadsheet';
import type { GeneratedFile } from '@/types/exports';

const HEADERS = [
  'release_title', 'release_type', 'primary_artist', 'featured_artists',
  'label', 'upc', 'catalog_number', 'release_date', 'original_release_date',
  'language', 'genre', 'sub_genre', 'copyright_year', 'p_line', 'c_line',
  'track_number', 'disc_number', 'track_title', 'version', 'duration', 'duration_ms',
  'isrc', 'iswc', 'explicit', 'instrumental', 'bpm', 'key',
  'writers', 'publishers', 'producers', 'performers',
];

function rowsFor(ctx: ReleaseContext): Record<string, unknown>[] {
  const r = ctx.release;
  const writerById = new Map(ctx.writers.map((w) => [w.id, w]));
  const publisherById = new Map(ctx.publishers.map((p) => [p.id, p]));

  return ctx.tracks.map((t) => {
    const wTxt = ctx.trackWriters
      .filter((tw) => tw.track_id === t.id)
      .map((tw) => `${writerById.get(tw.writer_profile_id)?.legal_name ?? 'Unknown'} (${Number(tw.share_percent).toFixed(2)}%)`)
      .join('; ');
    const pTxt = ctx.trackPublishers
      .filter((tp) => tp.track_id === t.id)
      .map((tp) => `${publisherById.get(tp.publisher_profile_id)?.publisher_name ?? 'Unknown'} (${Number(tp.share_percent).toFixed(2)}%)`)
      .join('; ');
    return {
      release_title: r.release_title,
      release_type: r.release_type,
      primary_artist: r.primary_artist,
      featured_artists: (r.featured_artists ?? []).join('; '),
      label: r.label_name,
      upc: r.upc,
      catalog_number: r.catalog_number,
      release_date: r.release_date,
      original_release_date: r.original_release_date,
      language: r.language,
      genre: r.genre,
      sub_genre: r.sub_genre,
      copyright_year: r.copyright_year,
      p_line: r.p_line,
      c_line: r.c_line,
      track_number: t.track_number,
      disc_number: t.disc_number,
      track_title: t.track_title,
      version: t.version,
      duration: fmtDuration(t.duration_ms),
      duration_ms: t.duration_ms,
      isrc: t.isrc,
      iswc: t.iswc,
      explicit: t.explicit,
      instrumental: t.instrumental,
      bpm: t.bpm,
      key: t.musical_key,
      writers: wTxt,
      publishers: pTxt,
      producers: '', // populated only if track_producers rows are loaded into context
      performers: '',
    };
  });
}

export async function distributorGenerate(opts: { orgId: string; releaseId: string; createdBy: string | null; ctx: ReleaseContext }): Promise<GeneratedFile[]> {
  const rows = rowsFor(opts.ctx);
  const slug = safeSlug(opts.ctx.release.release_title);
  const csv = buildCsv(HEADERS, rows);
  const xlsx = await buildXlsx([{ name: 'Tracks', headers: HEADERS, rows }]);

  const csvFile = await archiveFile({
    orgId: opts.orgId, releaseId: opts.releaseId, platform: 'distributor',
    fileName: `Distributor_Metadata_${slug}.csv`, fileType: 'data_csv',
    buffer: Buffer.from(csv, 'utf-8'), contentType: 'text/csv; charset=utf-8',
    createdBy: opts.createdBy,
  });
  const xlsxFile = await archiveFile({
    orgId: opts.orgId, releaseId: opts.releaseId, platform: 'distributor',
    fileName: `Distributor_Metadata_${slug}.xlsx`, fileType: 'workbook_xlsx',
    buffer: xlsx, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdBy: opts.createdBy,
  });
  return [csvFile, xlsxFile].filter((f): f is GeneratedFile => !!f);
}
