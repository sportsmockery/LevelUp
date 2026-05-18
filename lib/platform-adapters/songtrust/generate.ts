import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { SongtrustRow } from './types';
import type { GeneratedArtifact } from '@/types/exports';

const HEADERS: Array<keyof SongtrustRow> = [
  'song_title',
  'alternate_title',
  'writer_legal_name',
  'writer_ipi',
  'writer_pro',
  'writer_share',
  'publisher_name',
  'publisher_ipi',
  'publisher_share',
  'isrc',
  'iswc',
  'artist',
  'release_title',
  'duration',
  'lyrics',
  'notes',
];

export async function generateSongtrust(rows: SongtrustRow[]): Promise<GeneratedArtifact[]> {
  const csv = Papa.unparse({ fields: HEADERS as string[], data: rows.map((r) => HEADERS.map((h) => r[h])) });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Music Publishing Suite';
  wb.created = new Date();
  const sheet = wb.addWorksheet('Songtrust Catalog');
  sheet.addRow(HEADERS as string[]);
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) sheet.addRow(HEADERS.map((h) => r[h]));

  const xlsx = Buffer.from(await wb.xlsx.writeBuffer());

  return [
    { fileName: 'Songtrust_Catalog_Upload.csv', fileType: 'csv', buffer: Buffer.from(csv, 'utf8'), notes: 'Template pending' },
    { fileName: 'Songtrust_Catalog_Upload.xlsx', fileType: 'xlsx', buffer: xlsx, notes: 'Template pending' },
  ];
}
