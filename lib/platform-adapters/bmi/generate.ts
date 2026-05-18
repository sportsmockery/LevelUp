// Build BMI registration packet — PDF (jspdf) + plain-text version.
// Both are archived via workbookArchive.

import { jsPDF } from 'jspdf';
import type { BmiPacket, BmiWork } from '@/lib/platform-adapters/bmi/types';
import { archiveFile } from '@/lib/files/workbookArchive';
import type { GeneratedFile } from '@/types/exports';

const REVIEW_WARNING =
  'REVIEW BEFORE FILING — This packet is a structured copy of your catalog data. ' +
  'You must review every field on BMI Songview before submitting. LevelUp does not ' +
  'file on your behalf, and incorrect data filed at a PRO may take months to correct.';

function fmtDuration(ms: number | null): string {
  if (!ms || ms <= 0) return '—';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function workToText(w: BmiWork, i: number): string {
  const lines: string[] = [];
  lines.push(`---- WORK ${i + 1}: ${w.track_title} ----`);
  lines.push(`Performer:   ${w.performer}`);
  lines.push(`Duration:    ${fmtDuration(w.duration_ms)}`);
  lines.push(`ISRC:        ${w.isrc ?? '—'}`);
  lines.push(`ISWC:        ${w.iswc ?? '—'}`);
  lines.push('');
  lines.push('Writers:');
  for (const wr of w.writers) {
    lines.push(
      `  - ${wr.legal_name}  [${wr.role}]  ${wr.share_percent.toFixed(2)}%  IPI=${wr.ipi_number ?? '—'}  PRO=${wr.pro ?? '—'}  status=${wr.approval_status}`,
    );
  }
  lines.push('Publishers:');
  if (w.publishers.length === 0) {
    lines.push('  (none)');
  } else {
    for (const p of w.publishers) {
      lines.push(`  - ${p.publisher_name}  ${p.share_percent.toFixed(2)}%  IPI=${p.ipi_number ?? '—'}  PRO=${p.pro ?? '—'}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function packetToText(packet: BmiPacket): string {
  const lines: string[] = [];
  lines.push('BMI WORK REGISTRATION PACKET');
  lines.push('============================');
  lines.push('');
  lines.push(REVIEW_WARNING);
  lines.push('');
  lines.push(`Organization:   ${packet.org_name}`);
  lines.push(`Release:        ${packet.release_title}  (${packet.release_type})`);
  lines.push(`Primary artist: ${packet.primary_artist}`);
  lines.push(`℗ ${packet.copyright_year ?? '—'} ${packet.p_line ?? ''}`.trim());
  lines.push(`© ${packet.copyright_year ?? '—'} ${packet.c_line ?? ''}`.trim());
  lines.push(`Generated:      ${packet.generated_at}`);
  lines.push('');
  packet.works.forEach((w, i) => lines.push(workToText(w, i)));
  return lines.join('\n');
}

function packetToPdf(packet: BmiPacket): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 54; // 0.75"
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const lineHeight = (size: number) => size * 1.25;
  const newPageIfNeeded = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const write = (text: string, size: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      newPageIfNeeded(lineHeight(size));
      doc.text(line, margin, y);
      y += lineHeight(size);
    }
  };

  write('BMI Work Registration Packet', 18, true);
  y += 6;
  write(REVIEW_WARNING, 9);
  y += 12;
  write(`Organization:    ${packet.org_name}`, 11);
  write(`Release:         ${packet.release_title}  (${packet.release_type})`, 11);
  write(`Primary artist:  ${packet.primary_artist}`, 11);
  write(`Copyright year:  ${packet.copyright_year ?? '—'}`, 11);
  write(`℗ Line:          ${packet.p_line ?? '—'}`, 11);
  write(`© Line:          ${packet.c_line ?? '—'}`, 11);
  write(`Generated:       ${packet.generated_at}`, 9);
  y += 12;

  packet.works.forEach((w, i) => {
    newPageIfNeeded(60);
    write(`Work ${i + 1}: ${w.track_title}`, 14, true);
    write(`Performer: ${w.performer}    Duration: ${fmtDuration(w.duration_ms)}    ISRC: ${w.isrc ?? '—'}    ISWC: ${w.iswc ?? '—'}`, 10);
    y += 6;
    write('Writers', 11, true);
    for (const wr of w.writers) {
      write(
        `  • ${wr.legal_name} — ${wr.role} — ${wr.share_percent.toFixed(2)}% — IPI ${wr.ipi_number ?? '—'} — PRO ${wr.pro ?? '—'} — ${wr.approval_status}`,
        10,
      );
    }
    y += 4;
    write('Publishers', 11, true);
    if (w.publishers.length === 0) {
      write('  (none)', 10);
    } else {
      for (const p of w.publishers) {
        write(
          `  • ${p.publisher_name} — ${p.share_percent.toFixed(2)}% — IPI ${p.ipi_number ?? '—'} — PRO ${p.pro ?? '—'}`,
          10,
        );
      }
    }
    y += 14;
  });

  // jsPDF returns ArrayBuffer when output('arraybuffer'); convert to Uint8Array.
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

export async function bmiGenerate(opts: {
  orgId: string;
  releaseId: string;
  createdBy: string | null;
  packet: BmiPacket;
}): Promise<GeneratedFile[]> {
  const pdfBytes = packetToPdf(opts.packet);
  const txt = packetToText(opts.packet);

  const safeTitle = opts.packet.release_title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 64) || 'release';

  const pdfFile = await archiveFile({
    orgId: opts.orgId,
    releaseId: opts.releaseId,
    platform: 'bmi',
    fileName: `BMI_Registration_${safeTitle}.pdf`,
    fileType: 'packet_pdf',
    buffer: pdfBytes,
    contentType: 'application/pdf',
    createdBy: opts.createdBy,
  });

  const txtFile = await archiveFile({
    orgId: opts.orgId,
    releaseId: opts.releaseId,
    platform: 'bmi',
    fileName: `BMI_Registration_${safeTitle}.txt`,
    fileType: 'packet_txt',
    buffer: Buffer.from(txt, 'utf-8'),
    contentType: 'text/plain; charset=utf-8',
    createdBy: opts.createdBy,
  });

  return [pdfFile, txtFile].filter((f): f is GeneratedFile => !!f);
}
