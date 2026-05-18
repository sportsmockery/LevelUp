// GET /api/publishing/releases/:releaseId/checklist
// Returns the 14-step state for this release.

import { NextResponse } from 'next/server';
import { requireUser } from '../../../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { getChecklist } from '@/lib/permissions/order-of-operations';

export async function GET(_req: Request, { params }: { params: Promise<{ releaseId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { releaseId } = await params;

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: rel } = await svc.from('releases').select('org_id').eq('id', releaseId).maybeSingle();
  if (!rel) return NextResponse.json({ error: 'release_not_found' }, { status: 404 });

  const role = await getUserRole(rel.org_id, auth.user.id);
  if (!roleAtLeast(role, 'viewer')) return NextResponse.json({ error: 'not_a_member' }, { status: 403 });

  const checklist = await getChecklist(rel.org_id, releaseId);
  return NextResponse.json({ checklist });
}
