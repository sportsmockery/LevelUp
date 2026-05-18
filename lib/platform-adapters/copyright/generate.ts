// US Copyright — Form PA (composition) + Form SR (sound recording) packets.
// Each is a PDF + .txt for self-filing at eCO. Verbatim review warning included.

import { jsPDF } from 'jspdf';
import type { ReleaseContext } from '@/lib/validation/catalog-validation';
import { archiveFile } from '@/lib/files/workbookArchive';
import { fmtDuration, safeSlug } from '@/lib/export/spreadsheet';
import type { GeneratedFile } from '@/types/exports';

const REVIEW_WARNING =
  'REVIEW BEFORE FILING — This packet is a structured copy of your catalog data. ' +
  'You must review every field on the US Copyright Office eCO system before submitting. ' +
  'LevelUp does not file on your behalf and is not a legal certification of authorship.';

function pdf(title: string, lines: string[]): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 54;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  const newPage = (need: number) => {
    if (y + need > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
  };
  const write = (text: string, size: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, maxWidth);
    for (const ln of wrapped) {
      newPage(size * 1.3);
      doc.text(ln, margin, y);
      y += size * 1.3;
    }
  };

  write(title, 18, true);
  y += 8;
  write(REVIEW_WARNING, 9);
  y += 12;
  for (const ln of lines) {
    if (ln.startsWith('# ')) { y += 6; write(ln.slice(2), 13, true); }
    else if (ln === '') { y += 4; }
    else write(ln, 10);
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

function buildPA(ctx: ReleaseContext): { lines: string[]; text: string } {
  const r = ctx.release;
  const writerById = new Map(ctx.writers.map((w) => [w.id, w]));
  const publisherById = new Map(ctx.publishers.map((p) => [p.id, p]));
  const lines: string[] = [];

  lines.push(`Release: ${r.release_title} (${r.release_type})`);
  lines.push(`Primary artist: ${r.primary_artist ?? '—'}`);
  lines.push(`Year of first publication: ${r.copyright_year ?? '—'}`);
  lines.push(`© Line: ${r.c_line ?? '—'}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  for (let i = 0; i < ctx.tracks.length; i++) {
    const t = ctx.tracks[i];
    lines.push(`# Work ${i + 1}: "${t.track_title}"`);
    lines.push(`Duration: ${fmtDuration(t.duration_ms)}    ISWC: ${t.iswc ?? '—'}    Language: ${t.language ?? '—'}`);
    lines.push('');

    lines.push('Authors (writers of the musical work):');
    for (const tw of ctx.trackWriters.filter((x) => x.track_id === t.id)) {
      const w = writerById.get(tw.writer_profile_id);
      if (!w) continue;
      lines.push(`  • ${w.legal_name} — ${tw.role} — ${Number(tw.share_percent).toFixed(2)}% — IPI ${w.ipi_number ?? '—'} — PRO ${w.pro ?? '—'}`);
    }
    lines.push('');

    lines.push('Claimants (entities asserting copyright in the composition):');
    const pRows = ctx.trackPublishers.filter((x) => x.track_id === t.id);
    if (pRows.length === 0) {
      lines.push(`  • ${r.c_line ?? r.primary_artist ?? 'UNKNOWN'} (per © line)`);
    } else {
      for (const tp of pRows) {
        const p = publisherById.get(tp.publisher_profile_id);
        if (!p) continue;
        lines.push(`  • ${p.publisher_name} — ${Number(tp.share_percent).toFixed(2)}% — IPI ${p.ipi_number ?? '—'}`);
      }
    }
    lines.push('');

    if (t.lyrics) {
      lines.push('Lyrics excerpt (first 600 chars):');
      lines.push(t.lyrics.slice(0, 600));
      lines.push('');
    }
  }

  return { lines, text: lines.join('\n') };
}

function buildSR(ctx: ReleaseContext): { lines: string[]; text: string } {
  const r = ctx.release;
  const lines: string[] = [];

  lines.push(`Release: ${r.release_title} (${r.release_type})`);
  lines.push(`Year of fixation / first publication: ${r.copyright_year ?? '—'}`);
  lines.push(`℗ Line (master rights claimant): ${r.p_line ?? '—'}`);
  lines.push(`Label: ${r.label_name ?? '—'}`);
  lines.push(`UPC: ${r.upc ?? '—'}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  for (let i = 0; i < ctx.tracks.length; i++) {
    const t = ctx.tracks[i];
    lines.push(`# Recording ${i + 1}: "${t.track_title}"`);
    lines.push(`ISRC: ${t.isrc ?? '—'}    Duration: ${fmtDuration(t.duration_ms)}`);
    lines.push(`Performer (featured): ${r.primary_artist ?? '—'}`);
    lines.push(`Producer(s): ${t.recording_engineer ?? '—'}`);
    lines.push(`Engineer(s): mixing=${t.mixing_engineer ?? '—'}, mastering=${t.mastering_engineer ?? '—'}`);
    lines.push(`Recording date / location: ${t.recording_date ?? '—'} / ${t.recording_location ?? '—'} (${t.studio_name ?? '—'})`);
    lines.push('');
    lines.push(`Claimant (per ℗ line): ${r.p_line ?? r.label_name ?? r.primary_artist ?? 'UNKNOWN'}`);
    lines.push('');
  }

  return { lines, text: lines.join('\n') };
}

export async function copyrightGenerate(opts: { orgId: string; releaseId: string; createdBy: string | null; orgName: string; ctx: ReleaseContext }): Promise<GeneratedFile[]> {
  const slug = safeSlug(opts.ctx.release.release_title);

  const pa = buildPA(opts.ctx);
  const sr = buildSR(opts.ctx);

  const paPdf = pdf('Copyright Form PA — Composition', pa.lines);
  const srPdf = pdf('Copyright Form SR — Sound Recording', sr.lines);

  const files: GeneratedFile[] = [];
  const archived = await Promise.all([
    archiveFile({ orgId: opts.orgId, releaseId: opts.releaseId, platform: 'copyright', fileName: `Copyright_FormPA_${slug}.pdf`, fileType: 'packet_pdf', buffer: paPdf, contentType: 'application/pdf', createdBy: opts.createdBy }),
    archiveFile({ orgId: opts.orgId, releaseId: opts.releaseId, platform: 'copyright', fileName: `Copyright_FormPA_${slug}.txt`, fileType: 'packet_txt', buffer: Buffer.from(REVIEW_WARNING + '\n\n' + pa.text, 'utf-8'), contentType: 'text/plain; charset=utf-8', createdBy: opts.createdBy }),
    archiveFile({ orgId: opts.orgId, releaseId: opts.releaseId, platform: 'copyright', fileName: `Copyright_FormSR_${slug}.pdf`, fileType: 'packet_pdf', buffer: srPdf, contentType: 'application/pdf', createdBy: opts.createdBy }),
    archiveFile({ orgId: opts.orgId, releaseId: opts.releaseId, platform: 'copyright', fileName: `Copyright_FormSR_${slug}.txt`, fileType: 'packet_txt', buffer: Buffer.from(REVIEW_WARNING + '\n\n' + sr.text, 'utf-8'), contentType: 'text/plain; charset=utf-8', createdBy: opts.createdBy }),
  ]);
  for (const f of archived) if (f) files.push(f);
  return files;
}
