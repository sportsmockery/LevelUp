import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ registrations: [] });
  const orgId = request.nextUrl.searchParams.get('org');
  const releaseId = request.nextUrl.searchParams.get('release');
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 400 });
  const check = await requireRole(orgId, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  let query = supabaseServer.from('platform_registrations').select('*').eq('organization_id', orgId);
  if (releaseId) query = query.eq('release_id', releaseId);
  const { data } = await query.order('updated_at', { ascending: false });
  return NextResponse.json({ registrations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ error: 'no supabase' }, { status: 500 });
  const body = await request.json();
  const { organization_id, release_id, track_id, platform, status,
    confirmation_number, confirmation_url, submitted_at, confirmed_at, notes,
    generated_file_id } = body;
  if (!organization_id || !platform || !status) {
    return NextResponse.json({ error: 'organization_id, platform, status required' }, { status: 400 });
  }
  const check = await requireRole(organization_id, auth.user.id, 'editor');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  // upsert by (org, release, platform) where release is provided.
  const filter: Record<string, unknown> = { organization_id, platform };
  if (release_id) filter.release_id = release_id;
  if (track_id) filter.track_id = track_id;

  const { data: existing } = await supabaseServer
    .from('platform_registrations')
    .select('*')
    .match(filter)
    .maybeSingle();

  const payload = {
    organization_id, release_id, track_id, platform, status,
    confirmation_number, confirmation_url, submitted_at, confirmed_at, notes,
    generated_file_id, updated_at: new Date().toISOString(),
  };

  let data;
  if (existing) {
    const result = await supabaseServer
      .from('platform_registrations')
      .update(payload).eq('id', existing.id).select().single();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    data = result.data;
  } else {
    const result = await supabaseServer
      .from('platform_registrations').insert(payload).select().single();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    data = result.data;
  }

  await createAuditLog({
    orgId: organization_id, userId: auth.user.id, entityType: 'platform_registration',
    entityId: data.id, action: 'registration_status_updated',
    oldValue: existing, newValue: data,
  });
  return NextResponse.json({ registration: data });
}
