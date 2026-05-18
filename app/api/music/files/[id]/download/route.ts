import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';
import { signedDownloadUrl } from '@/lib/files/workbookArchive';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const { data: file, error } = await supabaseServer
    .from('generated_files').select('*').eq('id', id).single();
  if (error || !file) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const check = await requireRole(file.organization_id, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const url = await signedDownloadUrl(file.file_path);
  if (!url) return NextResponse.json({ error: 'download failed' }, { status: 500 });
  await createAuditLog({
    orgId: file.organization_id, userId: auth.user.id, entityType: 'generated_file',
    entityId: id, action: 'file_downloaded', newValue: { fileName: file.file_name },
  });
  return NextResponse.json({ url });
}
