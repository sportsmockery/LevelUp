// Music Publishing — generated files + audit log.

export type GeneratedFileType =
  | 'workbook_xlsx'
  | 'packet_pdf'
  | 'packet_txt'
  | 'data_csv'
  | 'data_json';

export interface GeneratedFile {
  id: string;
  org_id: string;
  release_id: string | null;
  platform: string;
  file_type: GeneratedFileType;
  file_name: string;
  file_path: string;
  version: number;
  created_by: string | null;
  created_at: string;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}
