import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ fields: [], values: [] });
  const orgId = request.nextUrl.searchParams.get('org');
  const entityId = request.nextUrl.searchParams.get('entity');
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 400 });
  const check = await requireRole(orgId, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data: fields } = await supabaseServer
    .from('custom_fields').select('*').eq('organization_id', orgId);
  let values: unknown[] = [];
  if (entityId && fields && fields.length) {
    const { data } = await supabaseServer
      .from('custom_field_values').select('*')
      .in('custom_field_id', fields.map((f) => f.id))
      .eq('entity_id', entityId);
    values = data ?? [];
  }
  return NextResponse.json({ fields: fields ?? [], values });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  const { organization_id, entity_type, field_key, field_label, field_type, options } = body;
  if (!organization_id || !entity_type || !field_key || !field_label || !field_type) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }
  const check = await requireRole(organization_id, auth.user.id, 'admin');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data, error } = await supabaseServer.from('custom_fields').insert({
    organization_id, entity_type, field_key, field_label, field_type,
    options: options ?? [],
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await createAuditLog({
    orgId: organization_id, userId: auth.user.id, entityType: 'custom_field',
    entityId: data.id, action: 'custom_field_created', newValue: data,
  });
  return NextResponse.json({ field: data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  const { custom_field_id, entity_id, value, organization_id } = body;
  if (!custom_field_id || !entity_id || !organization_id) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  const check = await requireRole(organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data, error } = await supabaseServer
    .from('custom_field_values')
    .upsert(
      { custom_field_id, entity_id, value, updated_at: new Date().toISOString() },
      { onConflict: 'custom_field_id,entity_id' },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await createAuditLog({
    orgId: organization_id, userId: auth.user.id, entityType: 'custom_field_value',
    entityId: data.id, action: 'custom_field_updated', newValue: data,
  });
  return NextResponse.json({ value: data });
}
