import type { ReleaseContext } from '@/lib/validation/catalog-validation';
import { archiveFile } from '@/lib/files/workbookArchive';
import { buildCsv, buildXlsx, fmtDuration, safeSlug } from '@/lib/export/spreadsheet';
import type { GeneratedFile } from '@/types/exports';

const HEADERS = [
  'isrc', 'recording_title', 'version', 'duration', 'duration_ms',
  'release_title', 'release_date', 'label',
  'featured_artist', 'master_rights_owner', 'p_line',
  'genre', 'language', 'upc', 'catalog_number',
];

function rowsFor(ctx: ReleaseContext) {
  const r = ctx.release;
  return ctx.tracks.map((t) => ({
    isrc: t.isrc,
    recording_title: t.track_title,
    version: t.version,
    duration: fmtDuration(t.duration_ms),
    duration_ms: t.duration_ms,
    release_title: r.release_title,
    release_date: r.release_date,
    label: r.label_name,
    featured_artist: r.primary_artist,
    master_rights_owner: r.p_line || r.label_name || r.primary_artist,
    p_line: r.copyright_year ? `${r.copyright_year} ${r.p_line ?? ''}`.trim() : r.p_line,
    genre: r.genre,
    language: r.language,
    upc: r.upc,
    catalog_number: r.catalog_number,
  }));
}

export async function soundexchangeGenerate(opts: { orgId: string; releaseId: string; createdBy: string | null; ctx: ReleaseContext }): Promise<GeneratedFile[]> {
  const rows = rowsFor(opts.ctx);
  const slug = safeSlug(opts.ctx.release.release_title);
  const csv = buildCsv(HEADERS, rows);
  const xlsx = await buildXlsx([{ name: 'Recordings', headers: HEADERS, rows }]);

  const csvFile = await archiveFile({
    orgId: opts.orgId, releaseId: opts.releaseId, platform: 'soundexchange',
    fileName: `SoundExchange_Repertoire_${slug}.csv`, fileType: 'data_csv',
    buffer: Buffer.from(csv, 'utf-8'), contentType: 'text/csv; charset=utf-8',
    createdBy: opts.createdBy,
  });
  const xlsxFile = await archiveFile({
    orgId: opts.orgId, releaseId: opts.releaseId, platform: 'soundexchange',
    fileName: `SoundExchange_Repertoire_${slug}.xlsx`, fileType: 'workbook_xlsx',
    buffer: xlsx, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdBy: opts.createdBy,
  });
  return [csvFile, xlsxFile].filter((f): f is GeneratedFile => !!f);
}
