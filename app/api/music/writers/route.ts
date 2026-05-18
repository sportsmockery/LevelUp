import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ writers: [] });
  const orgId = request.nextUrl.searchParams.get('org');
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 400 });
  const check = await requireRole(orgId, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data } = await supabaseServer
    .from('writer_profiles').select('*').eq('organization_id', orgId)
    .order('legal_name', { ascending: true });
  return NextResponse.json({ writers: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  if (!body.organization_id || !body.legal_name) {
    return NextResponse.json({ error: 'organization_id and legal_name required' }, { status: 400 });
  }
  const check = await requireRole(body.organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data, error } = await supabaseServer.from('writer_profiles').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await createAuditLog({
    orgId: body.organization_id, userId: auth.user.id, entityType: 'writer_profile',
    entityId: data.id, action: 'writer_added', newValue: data,
  });
  return NextResponse.json({ writer: data });
}
