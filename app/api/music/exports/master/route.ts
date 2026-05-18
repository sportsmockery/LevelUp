import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { loadReleaseContext } from '@/lib/export/loadContext';
import { buildMasterWorkbook } from '@/lib/export/masterWorkbook';
import { archiveFile } from '@/lib/files/workbookArchive';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const { release_id } = await request.json();
  if (!release_id) return NextResponse.json({ error: 'release_id required' }, { status: 400 });
  const ctx = await loadReleaseContext(release_id);
  const check = await requireRole(ctx.release.organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const [{ data: regs }, { data: files }, { data: logs }] = await Promise.all([
    supabaseServer.from('platform_registrations').select('*').eq('release_id', release_id),
    supabaseServer.from('generated_files').select('*').eq('release_id', release_id),
    supabaseServer.from('audit_logs').select('*').eq('organization_id', ctx.release.organization_id)
      .order('created_at', { ascending: false }).limit(500),
  ]);

  const artifact = await buildMasterWorkbook({
    context: ctx,
    registrations: regs ?? [],
    generatedFiles: files ?? [],
    auditLogs: logs ?? [],
  });
  const result = await archiveFile({
    orgId: ctx.release.organization_id,
    releaseId: ctx.release.id,
    platform: 'master',
    fileName: artifact.fileName,
    fileType: artifact.fileType,
    buffer: artifact.buffer,
    createdBy: auth.user.id,
  });
  return NextResponse.json({ file: result.generatedFile });
}
