// POST /api/publishing/releases/:releaseId/exports/:platform
// Validates, dispatches to the platform adapter, archives files.

import { NextResponse } from 'next/server';
import { requireUser, loadReleaseContext } from '../../../../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { validateRelease, blockingIssues } from '@/lib/validation/catalog-validation';
import { validateForPlatform } from '@/lib/validation/platform-validation';
import { bmiMap, bmiGenerate } from '@/lib/platform-adapters/bmi';
import { distributorGenerate } from '@/lib/platform-adapters/distributor';
import { soundexchangeGenerate } from '@/lib/platform-adapters/soundexchange';
import { songtrustGenerate } from '@/lib/platform-adapters/songtrust';
import { mlcGenerate } from '@/lib/platform-adapters/mlc';
import { copyrightGenerate } from '@/lib/platform-adapters/copyright';
import { createAuditLog } from '@/lib/audit/createAuditLog';
import type { PlatformId } from '@/types/platforms';
import type { GeneratedFile } from '@/types/exports';

const SUPPORTED = new Set<PlatformId>(['bmi', 'distributor', 'soundexchange', 'songtrust', 'mlc', 'copyright']);

export async function POST(_req: Request, { params }: { params: Promise<{ releaseId: string; platform: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { releaseId, platform } = await params;
  const platformId = platform as PlatformId;

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: rel } = await svc.from('releases').select('org_id').eq('id', releaseId).maybeSingle();
  if (!rel) return NextResponse.json({ error: 'release_not_found' }, { status: 404 });

  const role = await getUserRole(rel.org_id, auth.user.id);
  if (!roleAtLeast(role, 'editor')) return NextResponse.json({ error: 'requires_editor' }, { status: 403 });

  const loaded = await loadReleaseContext(rel.org_id, releaseId);
  if (!loaded) return NextResponse.json({ error: 'release_load_failed' }, { status: 500 });

  if (!SUPPORTED.has(platformId)) {
    return NextResponse.json({ error: `${platform}_adapter_not_yet_implemented` }, { status: 501 });
  }

  const generalBlockers = blockingIssues(validateRelease(loaded.ctx));
  const platformIssues = validateForPlatform(platformId, loaded.ctx);
  const platformBlockers = platformIssues.filter((i) => i.blocking);
  const allBlockers = [...generalBlockers, ...platformBlockers];
  if (allBlockers.length > 0) {
    return NextResponse.json({ error: 'validation_blocked', blockers: allBlockers }, { status: 422 });
  }

  try {
    let files: GeneratedFile[] = [];
    const shared = { orgId: rel.org_id, releaseId, createdBy: auth.user.id, ctx: loaded.ctx };
    switch (platformId) {
      case 'bmi': {
        const packet = bmiMap(loaded.orgName, loaded.ctx);
        files = await bmiGenerate({ orgId: rel.org_id, releaseId, createdBy: auth.user.id, packet });
        break;
      }
      case 'distributor':   files = await distributorGenerate(shared); break;
      case 'soundexchange': files = await soundexchangeGenerate(shared); break;
      case 'songtrust':     files = await songtrustGenerate(shared); break;
      case 'mlc':           files = await mlcGenerate(shared); break;
      case 'copyright':     files = await copyrightGenerate({ ...shared, orgName: loaded.orgName }); break;
    }

    // Two rows possible (PA + SR for copyright) — link the first generated file.
    await svc.from('platform_registrations').upsert(
      {
        org_id: rel.org_id,
        release_id: releaseId,
        platform: platformId,
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
      newValue: { platform: platformId, files: files.map((f) => ({ id: f.id, file_name: f.file_name, version: f.version })) },
    });

    return NextResponse.json({ files });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
