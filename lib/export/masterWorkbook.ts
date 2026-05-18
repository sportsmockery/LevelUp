import ExcelJS from 'exceljs';
import type { ReleaseContext } from '@/types/catalog';
import type { GeneratedArtifact, GeneratedFile, AuditLog } from '@/types/exports';
import type { PlatformRegistration } from '@/types/platforms';

export interface MasterWorkbookInput {
  context: ReleaseContext;
  registrations: PlatformRegistration[];
  generatedFiles: GeneratedFile[];
  auditLogs: AuditLog[];
}

export async function buildMasterWorkbook(
  input: MasterWorkbookInput,
): Promise<GeneratedArtifact> {
  const { context: ctx, registrations, generatedFiles, auditLogs } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Music Publishing Suite';
  wb.created = new Date();

  // 1. Release Info
  {
    const sheet = wb.addWorksheet('Release Info');
    sheet.columns = [
      { header: 'Field', key: 'k', width: 28 },
      { header: 'Value', key: 'v', width: 48 },
    ];
    const r = ctx.release;
    const rows: Array<[string, string | number | null | undefined]> = [
      ['Release Title', r.release_title],
      ['Release Type', r.release_type],
      ['Primary Artist', r.primary_artist],
      ['Featured Artists', (r.featured_artists ?? []).join('; ')],
      ['Label', r.label_name],
      ['UPC', r.upc],
      ['Catalog Number', r.catalog_number],
      ['Release Date', r.release_date],
      ['Original Release Date', r.original_release_date],
      ['Language', r.language],
      ['Genre', r.genre],
      ['Sub-Genre', r.sub_genre],
      ['Copyright Year', r.copyright_year],
      ['P-line', r.p_line],
      ['C-line', r.c_line],
      ['Distributor', r.distributor],
      ['Artwork Path', r.artwork_path],
      ['Notes', r.notes],
    ];
    for (const [k, v] of rows) sheet.addRow({ k, v: v ?? '' });
    sheet.getRow(1).font = { bold: true };
  }

  // 2. Tracks
  {
    const sheet = wb.addWorksheet('Tracks');
    sheet.columns = [
      { header: 'Track #', key: 'n', width: 8 },
      { header: 'Title', key: 't', width: 28 },
      { header: 'Version', key: 'v', width: 14 },
      { header: 'Duration (ms)', key: 'd', width: 12 },
      { header: 'ISRC', key: 'i', width: 16 },
      { header: 'ISWC', key: 'w', width: 16 },
      { header: 'Explicit', key: 'e', width: 8 },
      { header: 'BPM', key: 'b', width: 6 },
      { header: 'Key', key: 'k', width: 8 },
      { header: 'Recording Date', key: 'rd', width: 14 },
      { header: 'P-line', key: 'p', width: 24 },
      { header: 'C-line', key: 'c', width: 24 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const t of ctx.tracks) {
      sheet.addRow({
        n: t.track_number, t: t.track_title, v: t.version, d: t.duration_ms,
        i: t.isrc, w: t.iswc, e: t.explicit, b: t.bpm, k: t.musical_key,
        rd: t.recording_date, p: t.p_line, c: t.c_line,
      });
    }
  }

  // 3. Writers
  {
    const sheet = wb.addWorksheet('Writers');
    sheet.columns = [
      { header: 'Legal Name', key: 'n', width: 28 },
      { header: 'Stage Name', key: 's', width: 22 },
      { header: 'IPI', key: 'i', width: 14 },
      { header: 'PRO', key: 'p', width: 10 },
      { header: 'Email', key: 'e', width: 26 },
      { header: 'Country', key: 'c', width: 10 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const w of Object.values(ctx.writerProfiles)) {
      sheet.addRow({ n: w.legal_name, s: w.stage_name, i: w.ipi_number, p: w.pro, e: w.email, c: w.country });
    }
  }

  // 4. Publishers
  {
    const sheet = wb.addWorksheet('Publishers');
    sheet.columns = [
      { header: 'Publisher Name', key: 'n', width: 28 },
      { header: 'Legal Entity', key: 'l', width: 28 },
      { header: 'IPI', key: 'i', width: 14 },
      { header: 'PRO', key: 'p', width: 10 },
      { header: 'Type', key: 't', width: 20 },
      { header: 'Admin Company', key: 'a', width: 22 },
      { header: 'Territory', key: 'tr', width: 14 },
      { header: 'Ownership %', key: 'o', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const p of Object.values(ctx.publisherProfiles)) {
      sheet.addRow({
        n: p.publisher_name, l: p.legal_entity_name, i: p.ipi_number, p: p.pro,
        t: p.publisher_type, a: p.admin_company, tr: p.territory, o: p.ownership_percentage,
      });
    }
  }

  // 5. Splits
  {
    const sheet = wb.addWorksheet('Splits');
    sheet.columns = [
      { header: 'Track', key: 't', width: 28 },
      { header: 'Type', key: 'ty', width: 10 },
      { header: 'Name', key: 'n', width: 28 },
      { header: 'IPI', key: 'i', width: 14 },
      { header: 'Role', key: 'r', width: 18 },
      { header: 'Share %', key: 's', width: 10 },
      { header: 'Approval', key: 'a', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const track of ctx.tracks) {
      for (const w of ctx.writers[track.id] ?? []) {
        const profile = w.writer_profile_id ? ctx.writerProfiles[w.writer_profile_id] : null;
        sheet.addRow({
          t: track.track_title, ty: 'Writer', n: profile?.legal_name ?? '',
          i: profile?.ipi_number ?? '', r: w.role, s: w.share_percent,
          a: w.approval_status,
        });
      }
      for (const p of ctx.publishers[track.id] ?? []) {
        const profile = p.publisher_profile_id ? ctx.publisherProfiles[p.publisher_profile_id] : null;
        sheet.addRow({
          t: track.track_title, ty: 'Publisher', n: profile?.publisher_name ?? '',
          i: profile?.ipi_number ?? '', r: '', s: p.share_percent, a: '',
        });
      }
    }
  }

  // 6. ISRC Ledger
  {
    const sheet = wb.addWorksheet('ISRC Ledger');
    sheet.columns = [
      { header: 'ISRC', key: 'i', width: 16 },
      { header: 'Status', key: 's', width: 12 },
      { header: 'Track ID', key: 't', width: 38 },
      { header: 'Assigned Date', key: 'd', width: 14 },
      { header: 'Notes', key: 'n', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const i of ctx.isrcs) {
      sheet.addRow({ i: i.isrc_code, s: i.status, t: i.track_id, d: i.assigned_date, n: i.notes });
    }
  }

  // 7. Platform Status
  {
    const sheet = wb.addWorksheet('Platform Status');
    sheet.columns = [
      { header: 'Platform', key: 'p', width: 16 },
      { header: 'Status', key: 's', width: 18 },
      { header: 'Confirmation #', key: 'c', width: 22 },
      { header: 'Submitted At', key: 'sa', width: 22 },
      { header: 'Confirmed At', key: 'ca', width: 22 },
      { header: 'Notes', key: 'n', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const r of registrations) {
      sheet.addRow({
        p: r.platform, s: r.status, c: r.confirmation_number ?? '',
        sa: r.submitted_at ?? '', ca: r.confirmed_at ?? '', n: r.notes ?? '',
      });
    }
  }

  // 8. Custom Fields
  {
    const sheet = wb.addWorksheet('Custom Fields');
    sheet.columns = [
      { header: 'Entity Type', key: 'e', width: 14 },
      { header: 'Field Key', key: 'k', width: 22 },
      { header: 'Field Label', key: 'l', width: 28 },
      { header: 'Type', key: 't', width: 14 },
      { header: 'Options', key: 'o', width: 32 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const f of ctx.customFields) {
      sheet.addRow({ e: f.entity_type, k: f.field_key, l: f.field_label, t: f.field_type, o: (f.options ?? []).join(', ') });
    }
  }

  // 9. Generated Files
  {
    const sheet = wb.addWorksheet('Generated Files');
    sheet.columns = [
      { header: 'Platform', key: 'p', width: 16 },
      { header: 'File Name', key: 'f', width: 38 },
      { header: 'Type', key: 't', width: 8 },
      { header: 'Version', key: 'v', width: 8 },
      { header: 'Created At', key: 'c', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const f of generatedFiles) {
      sheet.addRow({ p: f.platform, f: f.file_name, t: f.file_type, v: f.version, c: f.created_at });
    }
  }

  // 10. Audit Log
  {
    const sheet = wb.addWorksheet('Audit Log');
    sheet.columns = [
      { header: 'When', key: 'w', width: 22 },
      { header: 'Action', key: 'a', width: 28 },
      { header: 'Entity', key: 'e', width: 18 },
      { header: 'Entity ID', key: 'i', width: 38 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const log of auditLogs) {
      sheet.addRow({ w: log.created_at, a: log.action, e: log.entity_type, i: log.entity_id ?? '' });
    }
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return {
    fileName: 'Master_Registration_Workbook.xlsx',
    fileType: 'xlsx',
    buffer,
  };
}
