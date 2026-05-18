// GET /api/publishing/releases/:releaseId/artwork/url — signed URL for the current artwork.

import { NextResponse } from 'next/server';
import { requireUser } from '../../../../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { artworkSignedUrl } from '@/lib/files/artworkUpload';

export async function GET(_req: Request, { params }: { params: Promise<{ releaseId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { releaseId } = await params;

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: rel } = await svc.from('releases').select('org_id, artwork_path').eq('id', releaseId).maybeSingle();
  if (!rel) return NextResponse.json({ error: 'release_not_found' }, { status: 404 });

  const role = await getUserRole(rel.org_id, auth.user.id);
  if (!roleAtLeast(role, 'viewer')) return NextResponse.json({ error: 'not_a_member' }, { status: 403 });

  if (!rel.artwork_path) return NextResponse.json({ url: null });
  const url = await artworkSignedUrl(rel.artwork_path, 1200);
  return NextResponse.json({ url });
}
