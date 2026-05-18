import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ tracks: [] });
  const releaseId = request.nextUrl.searchParams.get('release');
  if (!releaseId) return NextResponse.json({ error: 'release required' }, { status: 400 });
  const { data: release } = await supabaseServer.from('releases').select('organization_id').eq('id', releaseId).single();
  if (!release) return NextResponse.json({ error: 'release not found' }, { status: 404 });
  const check = await requireRole(release.organization_id, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data } = await supabaseServer
    .from('tracks').select('*').eq('release_id', releaseId)
    .order('track_number', { ascending: true });
  return NextResponse.json({ tracks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  if (!body.release_id || !body.organization_id) {
    return NextResponse.json({ error: 'release_id and organization_id required' }, { status: 400 });
  }
  const check = await requireRole(body.organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data, error } = await supabaseServer
    .from('tracks').insert({ ...body, created_by: auth.user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await createAuditLog({
    orgId: body.organization_id, userId: auth.user.id, entityType: 'track',
    entityId: data.id, action: 'track_created', newValue: data,
  });
  return NextResponse.json({ track: data });
}
