import { supabaseServer } from '../supabase-server';
import { createAuditLog } from '../audit/createAuditLog';
import type { GeneratedFile, GeneratedFileType } from '@/types/exports';
import type { PlatformId } from '@/types/platforms';

export interface ArchiveInput {
  orgId: string;
  releaseId: string | null;
  platform: PlatformId;
  fileName: string;
  fileType: GeneratedFileType;
  buffer: Buffer;
  createdBy: string | null;
  notes?: string;
}

export interface ArchiveResult {
  filePath: string;
  generatedFile: GeneratedFile;
}

export async function archiveFile(input: ArchiveInput): Promise<ArchiveResult> {
  if (!supabaseServer) {
    throw new Error('Supabase server client not configured');
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const releaseSegment = input.releaseId ?? 'org';
  const filePath = `${input.orgId}/${releaseSegment}/${input.platform}/${timestamp}/${input.fileName}`;

  const upload = await supabaseServer.storage
    .from('workbooks')
    .upload(filePath, input.buffer, {
      contentType: contentTypeFor(input.fileType),
      upsert: false,
    });
  if (upload.error) throw upload.error;

  // Versioning: count existing records of the same name for this release+platform.
  const { count } = await supabaseServer
    .from('generated_files')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', input.orgId)
    .eq('platform', input.platform)
    .eq('file_name', input.fileName);
  const version = (count ?? 0) + 1;

  const { data, error } = await supabaseServer
    .from('generated_files')
    .insert({
      organization_id: input.orgId,
      release_id: input.releaseId,
      platform: input.platform,
      file_type: input.fileType,
      file_name: input.fileName,
      file_path: filePath,
      version,
      created_by: input.createdBy,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await createAuditLog({
    orgId: input.orgId,
    userId: input.createdBy,
    entityType: 'generated_file',
    entityId: data.id,
    action: 'file_generated',
    newValue: { platform: input.platform, fileName: input.fileName, version },
  });

  return { filePath, generatedFile: data as GeneratedFile };
}

export async function signedDownloadUrl(
  filePath: string,
  expiresIn = 60 * 5,
): Promise<string | null> {
  if (!supabaseServer) return null;
  const { data } = await supabaseServer.storage
    .from('workbooks')
    .createSignedUrl(filePath, expiresIn);
  return data?.signedUrl ?? null;
}

function contentTypeFor(fileType: GeneratedFileType): string {
  switch (fileType) {
    case 'pdf':
      return 'application/pdf';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'txt':
      return 'text/plain';
    case 'zip':
      return 'application/zip';
  }
}
