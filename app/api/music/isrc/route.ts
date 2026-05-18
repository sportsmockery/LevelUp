import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';
import { validateISRC } from '@/lib/validation/catalog-validation';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ isrcs: [] });
  const orgId = request.nextUrl.searchParams.get('org');
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 400 });
  const check = await requireRole(orgId, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data } = await supabaseServer
    .from('isrc_codes').select('*').eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return NextResponse.json({ isrcs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  const items: Array<Record<string, unknown>> = Array.isArray(body.items) ? body.items : [body];
  if (!body.organization_id) return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
  const check = await requireRole(body.organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const invalid: string[] = [];
  for (const it of items) {
    const code = String(it.isrc_code || '').toUpperCase();
    if (!validateISRC(code)) invalid.push(code || '(empty)');
  }
  if (invalid.length) {
    return NextResponse.json(
      { error: `Invalid ISRC format: ${invalid.join(', ')} — expected CCXXXYYNNNNN` },
      { status: 400 },
    );
  }
  const rows = items.map((it) => ({
    ...it,
    isrc_code: String(it.isrc_code).toUpperCase(),
    organization_id: body.organization_id,
  }));
  const { data, error } = await supabaseServer.from('isrc_codes').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  for (const row of data ?? []) {
    await createAuditLog({
      orgId: body.organization_id, userId: auth.user.id, entityType: 'isrc_code',
      entityId: row.id, action: 'isrc_assigned', newValue: row,
    });
  }
  return NextResponse.json({ isrcs: data ?? [] });
}
