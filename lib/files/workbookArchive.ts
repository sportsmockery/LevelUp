// Music Publishing — every generated file flows through here.
// Uploads to the mp-workbooks Supabase Storage bucket and records a row in generated_files.

import { getServiceClient } from '@/lib/supabase-publishing-server';
import { createAuditLog } from '@/lib/audit/createAuditLog';
import type { GeneratedFile, GeneratedFileType } from '@/types/exports';

export interface ArchiveInput {
  orgId: string;
  releaseId: string | null;
  platform: string;
  fileName: string;
  fileType: GeneratedFileType;
  buffer: Buffer | Uint8Array;
  contentType: string;
  createdBy: string | null;
  notes?: string;
}

export async function archiveFile(input: ArchiveInput): Promise<GeneratedFile | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  // Version = (existing files for this org/release/platform/file_name) + 1.
  let version = 1;
  if (input.releaseId) {
    const { count } = await supabase
      .from('generated_files')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', input.orgId)
      .eq('release_id', input.releaseId)
      .eq('platform', input.platform)
      .eq('file_name', input.fileName);
    version = (count ?? 0) + 1;
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const releaseSegment = input.releaseId ?? 'no-release';
  const filePath = `${input.orgId}/${releaseSegment}/${input.platform}/${ts}/${input.fileName}`;

  const uploadBody: Uint8Array =
    input.buffer instanceof Uint8Array ? input.buffer : new Uint8Array(input.buffer);

  const { error: uploadErr } = await supabase.storage
    .from('mp-workbooks')
    .upload(filePath, uploadBody, { contentType: input.contentType, upsert: false });
  if (uploadErr) {
    throw new Error(`workbookArchive upload failed: ${uploadErr.message}`);
  }

  const { data: row, error: insertErr } = await supabase
    .from('generated_files')
    .insert({
      org_id: input.orgId,
      release_id: input.releaseId,
      platform: input.platform,
      file_type: input.fileType,
      file_name: input.fileName,
      file_path: filePath,
      version,
      created_by: input.createdBy,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (insertErr) {
    throw new Error(`workbookArchive insert failed: ${insertErr.message}`);
  }

  await createAuditLog({
    orgId: input.orgId,
    userId: input.createdBy,
    entityType: 'generated_file',
    entityId: row.id,
    action: 'file_generated',
    newValue: { platform: input.platform, file_name: input.fileName, version },
  });

  return row as GeneratedFile;
}

export async function signedDownloadUrl(filePath: string, expiresInSeconds = 600): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.storage.from('mp-workbooks').createSignedUrl(filePath, expiresInSeconds);
  return data?.signedUrl ?? null;
}
