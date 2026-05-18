import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-check';
import { supabaseServer } from '@/lib/supabase-server';
import { requireRole } from '@/lib/permissions/roles';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  if (!supabaseServer) return NextResponse.json({ files: [] });
  const orgId = request.nextUrl.searchParams.get('org');
  const releaseId = request.nextUrl.searchParams.get('release');
  if (!orgId) return NextResponse.json({ error: 'org required' }, { status: 400 });
  const check = await requireRole(orgId, auth.user.id, 'viewer');
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
  let query = supabaseServer.from('generated_files').select('*')
    .eq('organization_id', orgId).order('created_at', { ascending: false });
  if (releaseId) query = query.eq('release_id', releaseId);
  const { data } = await query;
  return NextResponse.json({ files: data ?? [] });
}
