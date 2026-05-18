// POST /api/publishing/releases/:releaseId/exports/:platform
// Validates, generates files via the platform adapter, archives them.

import { NextResponse } from 'next/server';
import { requireUser, loadReleaseContext } from '../../../../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { validateRelease, blockingIssues } from '@/lib/validation/catalog-validation';
import { validateForPlatform } from '@/lib/validation/platform-validation';
import { bmiMap, bmiGenerate } from '@/lib/platform-adapters/bmi';
import { createAuditLog } from '@/lib/audit/createAuditLog';
import type { PlatformId } from '@/types/platforms';

export async function POST(_req: Request, { params }: { params: Promise<{ releaseId: string; platform: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { releaseId, platform } = await params;

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: rel } = await svc.from('releases').select('org_id').eq('id', releaseId).maybeSingle();
  if (!rel) return NextResponse.json({ error: 'release_not_found' }, { status: 404 });

  const role = await getUserRole(rel.org_id, auth.user.id);
  if (!roleAtLeast(role, 'editor')) return NextResponse.json({ error: 'requires_editor' }, { status: 403 });

  const loaded = await loadReleaseContext(rel.org_id, releaseId);
  if (!loaded) return NextResponse.json({ error: 'release_load_failed' }, { status: 500 });

  const generalBlockers = blockingIssues(validateRelease(loaded.ctx));
  const platformIssues = validateForPlatform(platform as PlatformId, loaded.ctx);
  const platformBlockers = platformIssues.filter((i) => i.blocking);
  const allBlockers = [...generalBlockers, ...platformBlockers];
  if (allBlockers.length > 0) {
    return NextResponse.json({ error: 'validation_blocked', blockers: allBlockers }, { status: 422 });
  }

  if (platform !== 'bmi') {
    return NextResponse.json({ error: `${platform}_adapter_not_yet_implemented` }, { status: 501 });
  }

  try {
    const packet = bmiMap(loaded.orgName, loaded.ctx);
    const files = await bmiGenerate({
      orgId: rel.org_id,
      releaseId,
      createdBy: auth.user.id,
      packet,
    });

    // Upsert a platform_registrations row showing file_generated status.
    await svc.from('platform_registrations').upsert(
      {
        org_id: rel.org_id,
        release_id: releaseId,
        platform: 'bmi',
        status: 'file_generated',
        generated_file_id: files[0]?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,release_id,platform', ignoreDuplicates: false },
    ).select();

    await createAuditLog({
      orgId: rel.org_id,
      userId: auth.user.id,
      entityType: 'release',
      entityId: releaseId,
      action: 'platform_files_generated',
      newValue: { platform: 'bmi', files: files.map((f) => ({ id: f.id, file_name: f.file_name, version: f.version })) },
    });

    return NextResponse.json({ files });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
