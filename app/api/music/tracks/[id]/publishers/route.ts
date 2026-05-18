import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';
import { sumShares } from '@/lib/validation/catalog-validation';

async function getTrack(trackId: string) {
  if (!supabaseServer) throw new Error('no supabase');
  const { data } = await supabaseServer.from('tracks').select('*').eq('id', trackId).single();
  return data;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!supabaseServer) return NextResponse.json({ publishers: [] });
  const track = await getTrack(id);
  if (!track) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const check = await requireRole(track.organization_id, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  const { data } = await supabaseServer.from('track_publishers').select('*').eq('track_id', id);
  return NextResponse.json({ publishers: data ?? [] });
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
  const publishers: Array<{ publisher_profile_id: string | null; share_percent: number; notes?: string }> =
    body.publishers ?? [];

  // Publishers are optional, but if any exist they must total 100.
  if (publishers.length > 0) {
    const total = sumShares(publishers);
    if (Math.round(total * 1000) !== 100000) {
      return NextResponse.json(
        { error: `publisher shares must total 100% (got ${total.toFixed(3)}%)` },
        { status: 400 },
      );
    }
  }

  const { data: before } = await supabaseServer.from('track_publishers').select('*').eq('track_id', id);
  await supabaseServer.from('track_publishers').delete().eq('track_id', id);
  const rows = publishers.map((p) => ({ ...p, track_id: id }));
  const { data, error } = rows.length
    ? await supabaseServer.from('track_publishers').insert(rows).select()
    : { data: [], error: null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createAuditLog({
    orgId: track.organization_id, userId: auth.user.id, entityType: 'track_publishers',
    entityId: id, action: 'split_updated', oldValue: before, newValue: data,
  });
  return NextResponse.json({ publishers: data ?? [] });
}
