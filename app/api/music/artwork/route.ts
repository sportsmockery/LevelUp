import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { uploadArtwork } from '@/lib/files/artworkUpload';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const form = await request.formData();
  const releaseId = form.get('release_id') as string | null;
  const file = form.get('file') as File | null;
  if (!releaseId || !file) {
    return NextResponse.json({ error: 'release_id and file required' }, { status: 400 });
  }
  const { data: release } = await supabaseServer.from('releases').select('*').eq('id', releaseId).single();
  if (!release) return NextResponse.json({ error: 'release not found' }, { status: 404 });
  const check = await requireRole(release.organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = await uploadArtwork({
    orgId: release.organization_id,
    releaseId,
    file: buffer,
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
  });
  await supabaseServer.from('releases').update({ artwork_path: path, updated_at: new Date().toISOString() }).eq('id', releaseId);
  await createAuditLog({
    orgId: release.organization_id, userId: auth.user.id, entityType: 'release',
    entityId: releaseId, action: 'artwork_uploaded', newValue: { path },
  });
  return NextResponse.json({ artwork_path: path });
}
