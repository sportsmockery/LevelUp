// POST /api/publishing/releases/:releaseId/artwork
// multipart upload — writes to mp-artwork bucket, updates release.artwork_path.

import { NextResponse } from 'next/server';
import { requireUser } from '../../../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { uploadArtwork } from '@/lib/files/artworkUpload';
import { createAuditLog } from '@/lib/audit/createAuditLog';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: Request, { params }: { params: Promise<{ releaseId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { releaseId } = await params;

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: rel } = await svc.from('releases').select('org_id, artwork_path').eq('id', releaseId).maybeSingle();
  if (!rel) return NextResponse.json({ error: 'release_not_found' }, { status: 404 });

  const role = await getUserRole(rel.org_id, auth.user.id);
  if (!roleAtLeast(role, 'editor')) return NextResponse.json({ error: 'requires_editor' }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'expected_multipart' }, { status: 400 });
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 });

  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file_too_large', max: MAX_BYTES }, { status: 413 });
  if (!ACCEPTED.has(file.type)) return NextResponse.json({ error: 'unsupported_type', accepted: [...ACCEPTED] }, { status: 415 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadArtwork({
      orgId: rel.org_id,
      releaseId,
      fileName: file.name || 'artwork',
      buffer,
      contentType: file.type,
    });
    if (!uploaded) return NextResponse.json({ error: 'upload_failed' }, { status: 500 });

    const { error: updErr } = await svc.from('releases').update({ artwork_path: uploaded.path }).eq('id', releaseId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    await createAuditLog({
      orgId: rel.org_id,
      userId: auth.user.id,
      entityType: 'release',
      entityId: releaseId,
      action: 'artwork_uploaded',
      oldValue: { artwork_path: rel.artwork_path },
      newValue: { artwork_path: uploaded.path, file_name: file.name, size: file.size },
    });

    return NextResponse.json({ artwork_path: uploaded.path });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
