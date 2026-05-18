import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const { data, error } = await supabaseServer.from('tracks').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const check = await requireRole(data.organization_id, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  return NextResponse.json({ track: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  const { data: existing } = await supabaseServer.from('tracks').select('*').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const check = await requireRole(existing.organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data, error } = await supabaseServer
    .from('tracks').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await createAuditLog({
    orgId: data.organization_id, userId: auth.user.id, entityType: 'track', entityId: id,
    action: 'track_updated', oldValue: existing, newValue: data,
  });
  return NextResponse.json({ track: data });
}
