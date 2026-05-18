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

export function safeSlug(s: string, maxLen = 64): string {
  return s.replace(/[^a-z0-9-_]+/gi, '_').slice(0, maxLen) || 'release';
}
