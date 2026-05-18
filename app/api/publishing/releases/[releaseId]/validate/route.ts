// GET /api/publishing/releases/:releaseId/validate
// Runs catalog + platform validation and returns aggregated issues.

import { NextResponse } from 'next/server';
import { requireUser, loadReleaseContext } from '../../../_helpers';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { validateRelease } from '@/lib/validation/catalog-validation';
import { validateForPlatform } from '@/lib/validation/platform-validation';
import type { PlatformId, ValidationIssue } from '@/types/platforms';

const PLATFORMS: PlatformId[] = ['bmi', 'mlc', 'songtrust', 'soundexchange', 'copyright', 'distributor', 'master'];

export async function GET(_req: Request, { params }: { params: Promise<{ releaseId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { releaseId } = await params;

  // Find org from release (service client, then check membership).
  const { getServiceClient } = await import('@/lib/supabase-publishing-server');
  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });
  const { data: rel } = await svc.from('releases').select('org_id').eq('id', releaseId).maybeSingle();
  if (!rel) return NextResponse.json({ error: 'release_not_found' }, { status: 404 });

  const role = await getUserRole(rel.org_id, auth.user.id);
  if (!roleAtLeast(role, 'viewer')) return NextResponse.json({ error: 'not_a_member' }, { status: 403 });

  const loaded = await loadReleaseContext(rel.org_id, releaseId);
  if (!loaded) return NextResponse.json({ error: 'release_load_failed' }, { status: 500 });

  const issues = validateRelease(loaded.ctx);
  const byPlatform: Record<string, ValidationIssue[]> = {};
  for (const p of PLATFORMS) {
    byPlatform[p] = validateForPlatform(p, loaded.ctx);
  }

  return NextResponse.json({ issues, byPlatform });
}
