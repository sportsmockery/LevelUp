import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const { step, reason } = await request.json();
  if (!step || !reason) return NextResponse.json({ error: 'step and reason required' }, { status: 400 });

  const { data: release } = await supabaseServer.from('releases').select('*').eq('id', id).single();
  if (!release) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const check = await requireRole(release.organization_id, auth.user.id, 'admin');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const overrides = { ...(release.step_overrides ?? {}) };
  overrides[step] = { reason, by: auth.user.id, at: new Date().toISOString() };
  const { data, error } = await supabaseServer
    .from('releases')
    .update({ step_overrides: overrides, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createAuditLog({
    orgId: release.organization_id, userId: auth.user.id,
    entityType: 'release', entityId: id, action: 'step_override_recorded',
    newValue: { step, reason },
  });
  return NextResponse.json({ release: data });
}
