// MLC adapter — produces a 4-tab XLSX workbook + a JSON dump of the same data.

import type { ReleaseContext } from '@/lib/validation/catalog-validation';
import { archiveFile } from '@/lib/files/workbookArchive';
import { buildXlsx, fmtDuration, safeSlug, type Sheet } from '@/lib/export/spreadsheet';
import type { GeneratedFile } from '@/types/exports';

const WORK_HEADERS = ['work_title', 'iswc', 'duration', 'language', 'instrumental', 'lyrics_excerpt'];
const WRITER_HEADERS = ['work_title', 'legal_name', 'pro', 'ipi_number', 'role', 'share_percent', 'approval_status', 'country', 'email'];
const PUBLISHER_HEADERS = ['work_title', 'publisher_name', 'pro', 'ipi_number', 'territory', 'share_percent', 'admin_company'];
const RECORDING_HEADERS = ['work_title', 'recording_title', 'isrc', 'duration', 'release_title', 'release_date', 'label', 'upc', 'featured_artist'];

function build(ctx: ReleaseContext) {
  const writerById = new Map(ctx.writers.map((w) => [w.id, w]));
  const publisherById = new Map(ctx.publishers.map((p) => [p.id, p]));
  const r = ctx.release;

  const works: Record<string, unknown>[] = [];
  const writers: Record<string, unknown>[] = [];
  const publishers: Record<string, unknown>[] = [];
  const recordings: Record<string, unknown>[] = [];

  for (const t of ctx.tracks) {
    works.push({
      work_title: t.track_title,
      iswc: t.iswc,
      duration: fmtDuration(t.duration_ms),
      language: t.language,
      instrumental: t.instrumental,
      lyrics_excerpt: (t.lyrics ?? '').slice(0, 200),
    });

    for (const tw of ctx.trackWriters.filter((x) => x.track_id === t.id)) {
      const w = writerById.get(tw.writer_profile_id);
      if (!w) continue;
      writers.push({
        work_title: t.track_title,
        legal_name: w.legal_name,
        pro: w.pro,
        ipi_number: w.ipi_number,
        role: tw.role,
        share_percent: Number(tw.share_percent).toFixed(2),
        approval_status: tw.approval_status,
        country: w.country,
        email: w.email,
      });
    }

    for (const tp of ctx.trackPublishers.filter((x) => x.track_id === t.id)) {
      const p = publisherById.get(tp.publisher_profile_id);
      if (!p) continue;
      publishers.push({
        work_title: t.track_title,
        publisher_name: p.publisher_name,
        pro: p.pro,
        ipi_number: p.ipi_number,
        territory: p.territory ?? 'World',
        share_percent: Number(tp.share_percent).toFixed(2),
        admin_company: p.admin_company,
      });
    }

    recordings.push({
      work_title: t.track_title,
      recording_title: t.track_title,
      isrc: t.isrc,
      duration: fmtDuration(t.duration_ms),
      release_title: r.release_title,
      release_date: r.release_date,
      label: r.label_name,
      upc: r.upc,
      featured_artist: r.primary_artist,
    });
  }

  const sheets: Sheet[] = [
    { name: 'Works', headers: WORK_HEADERS, rows: works },
    { name: 'Writers', headers: WRITER_HEADERS, rows: writers },
    { name: 'Publishers', headers: PUBLISHER_HEADERS, rows: publishers },
    { name: 'Recordings', headers: RECORDING_HEADERS, rows: recordings },
  ];

  const json = {
    generated_at: new Date().toISOString(),
    release: {
      title: r.release_title,
      type: r.release_type,
      artist: r.primary_artist,
      release_date: r.release_date,
      upc: r.upc,
      label: r.label_name,
    },
    works,
    writers,
    publishers,
    recordings,
  };

  return { sheets, json };
}

export async function mlcGenerate(opts: { orgId: string; releaseId: string; createdBy: string | null; ctx: ReleaseContext }): Promise<GeneratedFile[]> {
  const { sheets, json } = build(opts.ctx);
  const slug = safeSlug(opts.ctx.release.release_title);
  const xlsx = await buildXlsx(sheets);

  const xlsxFile = await archiveFile({
    orgId: opts.orgId, releaseId: opts.releaseId, platform: 'mlc',
    fileName: `MLC_Work_Registration_${slug}.xlsx`, fileType: 'workbook_xlsx',
    buffer: xlsx, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdBy: opts.createdBy,
  });
  const jsonFile = await archiveFile({
    orgId: opts.orgId, releaseId: opts.releaseId, platform: 'mlc',
    fileName: `MLC_Work_Registration_${slug}.json`, fileType: 'data_json',
    buffer: Buffer.from(JSON.stringify(json, null, 2), 'utf-8'),
    contentType: 'application/json; charset=utf-8',
    createdBy: opts.createdBy,
  });
  return [xlsxFile, jsonFile].filter((f): f is GeneratedFile => !!f);
}
