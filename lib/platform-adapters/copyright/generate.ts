import PDFDocument from 'pdfkit';
import type { CopyrightPacketEntry } from './types';
import type { GeneratedArtifact } from '@/types/exports';

export const COPYRIGHT_REVIEW_WARNING =
  'IMPORTANT: The user must personally review and submit copyright applications. ' +
  'The system does not certify legal statements on behalf of the user.';

export function renderCopyrightText(entries: CopyrightPacketEntry[]): string {
  const lines: string[] = [];
  lines.push('U.S. COPYRIGHT eCO PACKET');
  lines.push(COPYRIGHT_REVIEW_WARNING);
  lines.push('='.repeat(60));
  entries.forEach((e, i) => {
    lines.push('');
    lines.push(`--- Work ${i + 1}: ${e.title_of_work} ---`);
    lines.push(`Type of Work: ${e.type_of_work}`);
    lines.push('Authors:');
    e.authors.forEach((a) => lines.push(`  - ${a.name} (${a.role})`));
    lines.push(`Claimants: ${e.claimants.join('; ') || 'MISSING'}`);
    lines.push(`Year of Completion: ${e.year_of_completion ?? 'MISSING'}`);
    lines.push(`Date of Publication: ${e.date_of_publication ?? 'unpublished'}`);
    lines.push(`Nation of Publication: ${e.nation_of_publication ?? ''}`);
    lines.push(`Sound Recording Owner: ${e.sound_recording_owner ?? 'MISSING'}`);
    lines.push(`Composition Owner: ${e.composition_owner ?? 'MISSING'}`);
    lines.push(`Rights & Permissions Contact: ${e.rights_and_permissions_contact ?? ''}`);
    lines.push(`Deposit Material Notes: ${e.deposit_material_notes ?? ''}`);
    if (e.lyrics) {
      lines.push('Lyrics:');
      lines.push(e.lyrics);
    }
  });
  return lines.join('\n');
}

export async function renderCopyrightPdf(entries: CopyrightPacketEntry[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.fontSize(18).text('U.S. Copyright eCO Packet', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#a00').text(COPYRIGHT_REVIEW_WARNING);
  doc.fillColor('#000');

  entries.forEach((e, i) => {
    doc.moveDown(1);
    doc.fontSize(13).text(`Work ${i + 1}: ${e.title_of_work}`);
    doc.fontSize(10);
    doc.text(`Type of Work: ${e.type_of_work}`);
    doc.text('Authors:');
    e.authors.forEach((a) => doc.text(`  • ${a.name} (${a.role})`));
    doc.text(`Claimants: ${e.claimants.join('; ') || 'MISSING'}`);
    doc.text(`Year of Completion: ${e.year_of_completion ?? 'MISSING'}`);
    doc.text(`Date of Publication: ${e.date_of_publication ?? 'unpublished'}`);
    doc.text(`Nation of Publication: ${e.nation_of_publication ?? ''}`);
    doc.text(`Sound Recording Owner: ${e.sound_recording_owner ?? 'MISSING'}`);
    doc.text(`Composition Owner: ${e.composition_owner ?? 'MISSING'}`);
    doc.text(`Rights & Permissions Contact: ${e.rights_and_permissions_contact ?? ''}`);
    doc.text(`Deposit Material Notes: ${e.deposit_material_notes ?? ''}`);
    if (e.lyrics) {
      doc.moveDown(0.3);
      doc.text('Lyrics:');
      doc.text(e.lyrics, { width: 480 });
    }
  });

  doc.end();
  return done;
}

export async function generateCopyright(entries: CopyrightPacketEntry[]): Promise<GeneratedArtifact[]> {
  const pdf = await renderCopyrightPdf(entries);
  const txt = renderCopyrightText(entries);
  return [
    { fileName: 'Copyright_eCO_Packet.pdf', fileType: 'pdf', buffer: pdf },
    { fileName: 'Copyright_eCO_Packet.txt', fileType: 'txt', buffer: Buffer.from(txt, 'utf8') },
  ];
}
