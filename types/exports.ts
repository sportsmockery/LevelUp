import type { PlatformId } from './platforms';

export type GeneratedFileType =
  | 'pdf'
  | 'txt'
  | 'xlsx'
  | 'csv'
  | 'json'
  | 'zip';

export interface GeneratedFile {
  id: string;
  organization_id: string;
  release_id: string | null;
  platform: PlatformId;
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
  organization_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
}

export interface GeneratedArtifact {
  fileName: string;
  fileType: GeneratedFileType;
  buffer: Buffer;
  notes?: string;
}
