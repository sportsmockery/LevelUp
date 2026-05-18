// Music Publishing — shared spreadsheet helpers (CSV + XLSX).
// Adapters call buildCsv/buildXlsx with column headers + row dicts,
// then archive both outputs through workbookArchive.

import ExcelJS from 'exceljs';
import Papa from 'papaparse';

export interface Sheet {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export function buildCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const data = rows.map((r) => headers.map((h) => stringify(r[h])));
  return Papa.unparse({ fields: headers, data });
}

export async function buildXlsx(sheets: Sheet[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LevelUp Publishing';
  wb.created = new Date();
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31)); // Excel limit
    ws.addRow(sheet.headers);
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFEEEEEE' },
    };
    for (const row of sheet.rows) {
      ws.addRow(sheet.headers.map((h) => stringifyForExcel(row[h])));
    }
    ws.columns.forEach((col) => {
      let max = 8;
      col.eachCell?.((cell) => {
        const v = String(cell.value ?? '');
        max = Math.max(max, v.length + 2);
      });
      col.width = Math.min(max, 48);
    });
  }
  const ab = await wb.xlsx.writeBuffer();
  return new Uint8Array(ab as ArrayBuffer);
}

function stringify(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function stringifyForExcel(v: unknown): string | number | boolean | Date | null {
  if (v == null) return null;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v;
  return String(v);
}

export function fmtDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// HH:MM:SS — what SoundExchange and MLC bulk templates require.
export function fmtDurationHHMMSS(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Best-effort split of a legal_name into first + middle + last for templates
// that require name parts. Handles "Last, First Middle" and "First Middle Last".
export function splitName(legalName: string): { first: string; middle: string; last: string } {
  const trimmed = (legalName ?? '').trim();
  if (!trimmed) return { first: '', middle: '', last: '' };
  if (trimmed.includes(',')) {
    const [last, rest = ''] = trimmed.split(',').map((s) => s.trim());
    const restParts = rest.split(/\s+/).filter(Boolean);
    return { first: restParts[0] ?? '', middle: restParts.slice(1).join(' '), last };
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: '', middle: '', last: parts[0] };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}

// MLC capacity codes (their template glossary):
// CA = composer & author (music + lyrics)
// C  = composer (music only)
// A  = author (lyrics only)
export function mlcCapacityFromRole(role: string): 'CA' | 'C' | 'A' {
  if (role === 'composer') return 'C';
  if (role === 'lyricist') return 'A';
  return 'CA';
}

export function safeSlug(s: string, maxLen = 64): string {
  return s.replace(/[^a-z0-9-_]+/gi, '_').slice(0, maxLen) || 'release';
}
