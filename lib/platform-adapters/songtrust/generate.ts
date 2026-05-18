import type { ReleaseContext } from '@/lib/validation/catalog-validation';
import { archiveFile } from '@/lib/files/workbookArchive';
import { buildCsv, buildXlsx, fmtDuration, safeSlug } from '@/lib/export/spreadsheet';
import type { GeneratedFile } from '@/types/exports';

// Generic per-work catalog row. One row per track + writer pairing.
const HEADERS = [
  'work_title', 'alternate_titles', 'iswc',
  'recording_isrc', 'recording_artist', 'recording_release_date', 'duration',
  'writer_legal_name', 'writer_pro', 'writer_ipi', 'writer_role', 'writer_share_percent',
  'writer_publisher_name', 'writer_publisher_ipi', 'writer_publisher_pro', 'writer_publisher_share_percent',
  'territory', 'admin_notes',
];

function rowsFor(ctx: ReleaseContext) {
  const writerById = new Map(ctx.writers.map((w) => [w.id, w]));
  const publisherById = new Map(ctx.publishers.map((p) => [p.id, p]));
  const rows: Record<string, unknown>[] = [];
  for (const t of ctx.tracks) {
    const wRows = ctx.trackWriters.filter((tw) => tw.track_id === t.id);
    const pRows = ctx.trackPublishers.filter((tp) => tp.track_id === t.id);
    if (wRows.length === 0) continue;
    for (let i = 0; i < wRows.length; i++) {
      const w = writerById.get(wRows[i].writer_profile_id);
      // pair writer with publisher of same index when present, otherwise leave blank
      const p = pRows[i] ? publisherById.get(pRows[i].publisher_profile_id) : null;
      rows.push({
        work_title: t.track_title,
        alternate_titles: t.version,
        iswc: t.iswc,
        recording_isrc: t.isrc,
        recording_artist: ctx.release.primary_artist,
        recording_release_date: ctx.release.release_date,
        duration: fmtDuration(t.duration_ms),
        writer_legal_name: w?.legal_name,
        writer_pro: w?.pro,
        writer_ipi: w?.ipi_number,
        writer_role: wRows[i].role,
        writer_share_percent: Number(wRows[i].share_percent).toFixed(2),
        writer_publisher_name: p?.publisher_name ?? '',
        writer_publisher_ipi: p?.ipi_number ?? '',
        writer_publisher_pro: p?.pro ?? '',
        writer_publisher_share_percent: pRows[i] ? Number(pRows[i].share_percent).toFixed(2) : '',
        territory: p?.territory ?? 'World',
        admin_notes: w?.notes ?? '',
      });
    }
  }
  return rows;
}

export async function songtrustGenerate(opts: { orgId: string; releaseId: string; createdBy: string | null; ctx: ReleaseContext }): Promise<GeneratedFile[]> {
  const rows = rowsFor(opts.ctx);
  const slug = safeSlug(opts.ctx.release.release_title);
  const csv = buildCsv(HEADERS, rows);
  const xlsx = await buildXlsx([{ name: 'Catalog', headers: HEADERS, rows }]);

  const csvFile = await archiveFile({
    orgId: opts.orgId, releaseId: opts.releaseId, platform: 'songtrust',
    fileName: `Songtrust_Catalog_${slug}.csv`, fileType: 'data_csv',
    buffer: Buffer.from(csv, 'utf-8'), contentType: 'text/csv; charset=utf-8',
    createdBy: opts.createdBy,
  });
  const xlsxFile = await archiveFile({
    orgId: opts.orgId, releaseId: opts.releaseId, platform: 'songtrust',
    fileName: `Songtrust_Catalog_${slug}.xlsx`, fileType: 'workbook_xlsx',
    buffer: xlsx, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdBy: opts.createdBy,
  });
  return [csvFile, xlsxFile].filter((f): f is GeneratedFile => !!f);
}
