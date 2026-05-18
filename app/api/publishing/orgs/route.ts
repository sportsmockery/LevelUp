// POST /api/publishing/orgs — create org + add creator as owner.

import { NextResponse } from 'next/server';
import { requireUser } from '../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { createAuditLog } from '@/lib/audit/createAuditLog';

export async function POST(req: Request) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const slug = String(body.slug ?? '').trim();
  if (!name || !slug) {
    return NextResponse.json({ error: 'name_and_slug_required' }, { status: 400 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service_client' }, { status: 500 });

  // Slug must be unique.
  const { data: existing } = await svc.from('organizations').select('id').eq('slug', slug).maybeSingle();
  if (existing) return NextResponse.json({ error: 'slug_taken' }, { status: 409 });

  const { data: org, error: orgErr } = await svc
    .from('organizations')
    .insert({ name, slug, created_by: auth.user.id })
    .select('*')
    .single();
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

  const { error: memberErr } = await svc.from('organization_members').insert({
    org_id: org.id,
    user_id: auth.user.id,
    role: 'owner',
  });
  if (memberErr) {
    return NextResponse.json({ error: 'org_created_but_membership_failed: ' + memberErr.message }, { status: 500 });
  }

  await createAuditLog({
    orgId: org.id,
    userId: auth.user.id,
    entityType: 'organization',
    entityId: org.id,
    action: 'organization_created',
    newValue: { name, slug },
  });

  return NextResponse.json({ org });
}
