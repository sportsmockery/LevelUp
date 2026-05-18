import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const orgId = request.nextUrl.searchParams.get('org');
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 400 });
  if (!supabaseServer) return NextResponse.json({ members: [] });
  const check = await requireRole(orgId, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data } = await supabaseServer
    .from('organization_members')
    .select('*')
    .eq('organization_id', orgId);
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  const { orgId, userId, role } = body;
  if (!orgId || !userId || !role) {
    return NextResponse.json({ error: 'orgId, userId, role required' }, { status: 400 });
  }
  const check = await requireRole(orgId, auth.user.id, 'admin');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const { data, error } = await supabaseServer
    .from('organization_members')
    .insert({ organization_id: orgId, user_id: userId, role, invited_by: auth.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createAuditLog({
    orgId, userId: auth.user.id, entityType: 'organization_member',
    entityId: data.id, action: 'member_invited', newValue: data,
  });
  return NextResponse.json({ member: data });
}
