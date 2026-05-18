import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { SoundExchangeRow } from './types';
import type { GeneratedArtifact } from '@/types/exports';

const HEADERS: Array<keyof SoundExchangeRow> = [
  'track_title',
  'artist_name',
  'featured_artist',
  'isrc',
  'album_title',
  'label',
  'duration',
  'release_date',
  'p_line_owner',
  'rights_owner',
  'featured_performer',
  'non_featured_performer',
  'producer',
  'country',
  'notes',
];

export async function generateSoundExchange(rows: SoundExchangeRow[]): Promise<GeneratedArtifact[]> {
  const csv = Papa.unparse({ fields: HEADERS as string[], data: rows.map((r) => HEADERS.map((h) => r[h])) });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Music Publishing Suite';
  wb.created = new Date();
  const sheet = wb.addWorksheet('SoundExchange');
  sheet.addRow(HEADERS as string[]);
  sheet.getRow(1).font = { bold: true };
  for (const r of rows) sheet.addRow(HEADERS.map((h) => r[h]));
  const xlsx = Buffer.from(await wb.xlsx.writeBuffer());

  return [
    { fileName: 'SoundExchange_Repertoire.csv', fileType: 'csv', buffer: Buffer.from(csv, 'utf8') },
    { fileName: 'SoundExchange_Repertoire.xlsx', fileType: 'xlsx', buffer: xlsx },
  ];
}
