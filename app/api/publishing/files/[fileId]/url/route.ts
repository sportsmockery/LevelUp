// GET /api/publishing/files/:fileId/url — issue a short-lived signed URL.

import { NextResponse } from 'next/server';
import { requireUser } from '../../../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { signedDownloadUrl } from '@/lib/files/workbookArchive';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { fileId } = await params;

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: file } = await svc.from('generated_files').select('*').eq('id', fileId).maybeSingle();
  if (!file) return NextResponse.json({ error: 'file_not_found' }, { status: 404 });

  const role = await getUserRole(file.org_id, auth.user.id);
  if (!roleAtLeast(role, 'viewer')) return NextResponse.json({ error: 'not_a_member' }, { status: 403 });

  const url = await signedDownloadUrl(file.file_path, 600);
  if (!url) return NextResponse.json({ error: 'sign_failed' }, { status: 500 });

  await createAuditLog({
    orgId: file.org_id,
    userId: auth.user.id,
    entityType: 'generated_file',
    entityId: file.id,
    action: 'file_downloaded',
    newValue: { file_name: file.file_name },
  });

  return NextResponse.json({ url });
}
