import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { requireRole } from '@/lib/permissions/roles';
import { loadReleaseContext } from '@/lib/export/loadContext';
import { validateCatalog } from '@/lib/validation/catalog-validation';
import { validatePlatform } from '@/lib/validation/platform-validation';
import type { PlatformId } from '@/types/platforms';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const releaseId = request.nextUrl.searchParams.get('release');
  if (!releaseId) return NextResponse.json({ error: 'release required' }, { status: 400 });
  const ctx = await loadReleaseContext(releaseId);
  const check = await requireRole(ctx.release.organization_id, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const writersByTrack = ctx.writers;
  const publishersByTrack = ctx.publishers;
  const catalog = validateCatalog({
    release: ctx.release,
    tracks: ctx.tracks,
    writersByTrack,
    publishersByTrack,
    writerProfiles: ctx.writerProfiles,
    publisherProfiles: ctx.publisherProfiles,
  });

  const platforms: PlatformId[] = ['bmi', 'mlc', 'songtrust', 'soundexchange', 'copyright', 'distributor'];
  const perPlatform: Record<string, ReturnType<typeof validatePlatform>> = {};
  for (const p of platforms) perPlatform[p] = validatePlatform(p, ctx);

  return NextResponse.json({ catalog, perPlatform });
}
