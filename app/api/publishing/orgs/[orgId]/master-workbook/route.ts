// POST /api/publishing/orgs/:orgId/master-workbook
// Builds the 10-tab Master Workbook across the entire org's catalog.

import { NextResponse } from 'next/server';
import { requireUser } from '../../../_helpers';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { buildMasterWorkbook } from '@/lib/export/masterWorkbook';

export async function POST(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { orgId } = await params;

  const role = await getUserRole(orgId, auth.user.id);
  if (!roleAtLeast(role, 'editor')) return NextResponse.json({ error: 'requires_editor' }, { status: 403 });

  try {
    const file = await buildMasterWorkbook(orgId, auth.user.id);
    if (!file) return NextResponse.json({ error: 'build_failed' }, { status: 500 });
    return NextResponse.json({ file });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
