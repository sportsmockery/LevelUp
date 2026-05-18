// POST /api/publishing/releases/:releaseId/override
// Mark a step "completed outside system" with a written reason.

import { NextResponse } from 'next/server';
import { requireUser } from '../../../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { overrideStep, type StepId, STEPS } from '@/lib/permissions/order-of-operations';

const VALID_STEPS = new Set<StepId>(STEPS.map((s) => s.id));

export async function POST(req: Request, { params }: { params: Promise<{ releaseId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { releaseId } = await params;

  const body = await req.json().catch(() => ({}));
  const step = String(body.step ?? '') as StepId;
  const reason = String(body.reason ?? '').trim();
  if (!VALID_STEPS.has(step)) return NextResponse.json({ error: 'invalid_step' }, { status: 400 });
  if (!reason) return NextResponse.json({ error: 'reason_required' }, { status: 400 });

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: rel } = await svc.from('releases').select('org_id').eq('id', releaseId).maybeSingle();
  if (!rel) return NextResponse.json({ error: 'release_not_found' }, { status: 404 });

  const role = await getUserRole(rel.org_id, auth.user.id);
  if (!roleAtLeast(role, 'editor')) return NextResponse.json({ error: 'requires_editor' }, { status: 403 });

  await overrideStep({ orgId: rel.org_id, releaseId, step, reason, userId: auth.user.id });
  return NextResponse.json({ ok: true });
}
