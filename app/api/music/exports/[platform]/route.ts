import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { requireRole } from '@/lib/permissions/roles';
import { ADAPTERS } from '@/lib/platform-adapters';
import { loadReleaseContext } from '@/lib/export/loadContext';
import { archiveFile } from '@/lib/files/workbookArchive';
import { validatePlatform, isBlocked } from '@/lib/validation/platform-validation';
import type { PlatformId } from '@/types/platforms';

const SUPPORTED = ['bmi', 'mlc', 'songtrust', 'soundexchange', 'copyright', 'distributor'] as const;
type SupportedPlatform = typeof SUPPORTED[number];

function isSupported(platform: string): platform is SupportedPlatform {
  return (SUPPORTED as readonly string[]).includes(platform);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { platform } = await params;
  if (!isSupported(platform)) {
    return NextResponse.json({ error: 'unsupported platform' }, { status: 400 });
  }
  const body = await request.json();
  const { release_id, force } = body;
  if (!release_id) return NextResponse.json({ error: 'release_id required' }, { status: 400 });

  const ctx = await loadReleaseContext(release_id);
  const check = await requireRole(ctx.release.organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const issues = validatePlatform(platform as PlatformId, ctx);
  if (isBlocked(issues) && !force) {
    return NextResponse.json({ blocked: true, issues }, { status: 422 });
  }

  const adapter = ADAPTERS[platform];
  const artifacts = await adapter.generate(ctx);
  const archived = [];
  for (const a of artifacts) {
    const result = await archiveFile({
      orgId: ctx.release.organization_id,
      releaseId: ctx.release.id,
      platform: platform as PlatformId,
      fileName: a.fileName,
      fileType: a.fileType,
      buffer: a.buffer,
      createdBy: auth.user.id,
      notes: a.notes,
    });
    archived.push(result.generatedFile);
  }

  return NextResponse.json({ files: archived, issues });
}
