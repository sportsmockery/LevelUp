import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { DistributorRow } from './types';
import type { GeneratedArtifact } from '@/types/exports';

const HEADERS: Array<keyof DistributorRow> = [
  'release_title',
  'track_title',
  'primary_artist',
  'featured_artists',
  'isrc',
  'upc',
  'label',
  'release_date',
  'genre',
  'language',
  'explicit',
  'duration',
  'p_line',
  'c_line',
  'lyrics',
  'writer_credits',
  'producer_credits',
  'publisher_credits',
];

export async function generateDistributor(rows: DistributorRow[]): Promise<GeneratedArtifact[]> {
  const csv = Papa.unparse({ fields: HEADERS as string[], data: rows.map((r) => HEADERS.map((h) => r[h])) });
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Music Publishing Suite';
  wb.created = new Date();
  const sheet = wb.addWorksheet('Distributor Metadata');
  sheet.addRow(HEADERS as string[]);
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) sheet.addRow(HEADERS.map((h) => r[h]));
  const xlsx = Buffer.from(await wb.xlsx.writeBuffer());
  return [
    { fileName: 'Distributor_Metadata.csv', fileType: 'csv', buffer: Buffer.from(csv, 'utf8') },
    { fileName: 'Distributor_Metadata.xlsx', fileType: 'xlsx', buffer: xlsx },
  ];
}
