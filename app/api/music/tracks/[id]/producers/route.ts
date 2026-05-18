import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

async function getTrack(trackId: string) {
  if (!supabaseServer) throw new Error('no supabase');
  const { data } = await supabaseServer.from('tracks').select('*').eq('id', trackId).single();
  return data;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!supabaseServer) return NextResponse.json({ producers: [] });
  const track = await getTrack(id);
  if (!track) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const check = await requireRole(track.organization_id, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data } = await supabaseServer.from('track_producers').select('*').eq('track_id', id);
  return NextResponse.json({ producers: data ?? [] });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const track = await getTrack(id);
  if (!track) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const check = await requireRole(track.organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const body = await request.json();
  const producers: Array<{ producer_name: string; role?: string; notes?: string }> = body.producers ?? [];
  await supabaseServer.from('track_producers').delete().eq('track_id', id);
  const rows = producers.map((p) => ({ ...p, track_id: id }));
  const { data, error } = rows.length
    ? await supabaseServer.from('track_producers').insert(rows).select()
    : { data: [], error: null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await createAuditLog({
    orgId: track.organization_id, userId: auth.user.id, entityType: 'track_producers',
    entityId: id, action: 'producers_updated', newValue: data,
  });
  return NextResponse.json({ producers: data ?? [] });
}
