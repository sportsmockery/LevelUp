import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ orgs: [] });

  const { data, error } = await supabaseServer
    .from('organization_members')
    .select('role, organization:organizations(*)')
    .eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orgs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const { data: org, error } = await supabaseServer
    .from('organizations')
    .insert({ name: body.name, slug: body.slug ?? null, created_by: auth.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: mErr } = await supabaseServer.from('organization_members').insert({
    organization_id: org.id,
    user_id: auth.user.id,
    role: 'owner',
    invited_by: auth.user.id,
  });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  await createAuditLog({
    orgId: org.id,
    userId: auth.user.id,
    entityType: 'organization',
    entityId: org.id,
    action: 'organization_created',
    newValue: org,
  });
  return NextResponse.json({ organization: org });
}
