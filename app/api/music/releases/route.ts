import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ releases: [] });
  const orgId = request.nextUrl.searchParams.get('org');
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 400 });
  const check = await requireRole(orgId, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data } = await supabaseServer
    .from('releases')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return NextResponse.json({ releases: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  const orgId = body.organization_id;
  if (!orgId) return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
  const check = await requireRole(orgId, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const { data, error } = await supabaseServer
    .from('releases')
    .insert({ ...body, created_by: auth.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await createAuditLog({
    orgId, userId: auth.user.id, entityType: 'release', entityId: data.id,
    action: 'release_created', newValue: data,
  });
  return NextResponse.json({ release: data });
}
