import ExcelJS from 'exceljs';
import type { MLCWorkPayload } from './types';
import type { GeneratedArtifact } from '@/types/exports';

const COLUMNS = [
  { header: 'Work Title', key: 'work_title', width: 32 },
  { header: 'Recording Title', key: 'recording_title', width: 32 },
  { header: 'Recording Artist', key: 'recording_artist', width: 28 },
  { header: 'Release Title', key: 'release_title', width: 28 },
  { header: 'ISWC', key: 'iswc', width: 18 },
  { header: 'ISRC', key: 'isrc', width: 18 },
  { header: 'Duration', key: 'duration', width: 12 },
  { header: 'Territory', key: 'territory', width: 10 },
  { header: 'Writers (name | IPI | share)', key: 'writers', width: 50 },
  { header: 'Publishers (name | IPI | share)', key: 'publishers', width: 50 },
];

export async function generateMLC(works: MLCWorkPayload[]): Promise<GeneratedArtifact[]> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Music Publishing Suite';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('MLC Works');
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };

  for (const w of works) {
    sheet.addRow({
      work_title: w.work_title,
      recording_title: w.recording_title,
      recording_artist: w.recording_artist ?? '',
      release_title: w.release_title ?? '',
      iswc: w.iswc ?? '',
      isrc: w.isrc ?? '',
      duration: w.duration ?? '',
      territory: w.territory,
      writers: w.writers
        .map((wr) => `${wr.name} | ${wr.ipi ?? 'MISSING'} | ${wr.share}%`)
        .join('\n'),
      publishers: w.publishers
        .map((p) => `${p.name} | ${p.ipi ?? 'MISSING'} | ${p.share}%`)
        .join('\n'),
    });
  }

  const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const json = Buffer.from(JSON.stringify(works, null, 2), 'utf8');

  return [
    { fileName: 'MLC_Work_Registration_Workbook.xlsx', fileType: 'xlsx', buffer: xlsxBuffer, notes: 'Template pending — verify field mapping' },
    { fileName: 'MLC_Work_Registration_Data.json', fileType: 'json', buffer: json },
  ];
}
