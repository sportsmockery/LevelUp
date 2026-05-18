// /api/publishing/orgs/:orgId/members
// GET    — list members (with email lookups)
// POST   — invite by email (user must already have an auth account)
// PATCH  — change a member's role
// DELETE — remove a member (?id=memberRowId)

import { NextResponse } from 'next/server';
import { requireUser } from '../../../_helpers';
import { getServiceClient } from '@/lib/supabase-publishing-server';
import { getUserRole, roleAtLeast } from '@/lib/permissions/roles';
import { createAuditLog } from '@/lib/audit/createAuditLog';
import type { OrgRole } from '@/types/catalog';

const VALID_ROLES: OrgRole[] = ['owner', 'admin', 'editor', 'collaborator', 'viewer'];

export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { orgId } = await params;
  const role = await getUserRole(orgId, auth.user.id);
  if (!roleAtLeast(role, 'viewer')) return NextResponse.json({ error: 'not_a_member' }, { status: 403 });

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: members } = await svc
    .from('organization_members')
    .select('*')
    .eq('org_id', orgId)
    .order('joined_at');

  // Map user_ids to emails via auth admin API.
  const ids = (members ?? []).map((m: any) => m.user_id);
  const emails = new Map<string, string | null>();
  for (const id of ids) {
    const { data } = await svc.auth.admin.getUserById(id);
    emails.set(id, data?.user?.email ?? null);
  }

  return NextResponse.json({
    members: (members ?? []).map((m: any) => ({ ...m, email: emails.get(m.user_id) ?? null })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { orgId } = await params;

  const callerRole = await getUserRole(orgId, auth.user.id);
  if (!roleAtLeast(callerRole, 'admin')) return NextResponse.json({ error: 'requires_admin' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const role = String(body.role ?? 'collaborator') as OrgRole;
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });
  if (!VALID_ROLES.includes(role) || role === 'owner') return NextResponse.json({ error: 'invalid_role' }, { status: 400 });

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  // Look up user by email. Paginate through users (admin API doesn't support exact-match lookup directly).
  let userId: string | null = null;
  let page = 1;
  while (page < 20 && !userId) {
    const { data } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data) break;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) userId = found.id;
    if (data.users.length < 1000) break;
    page++;
  }

  if (!userId) {
    return NextResponse.json({ error: 'user_not_found', hint: 'They must create a LevelUp account first.' }, { status: 404 });
  }

  const { data: existing } = await svc.from('organization_members').select('id').eq('org_id', orgId).eq('user_id', userId).maybeSingle();
  if (existing) return NextResponse.json({ error: 'already_a_member' }, { status: 409 });

  const { data: row, error } = await svc.from('organization_members').insert({
    org_id: orgId, user_id: userId, role, invited_by: auth.user.id,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createAuditLog({
    orgId, userId: auth.user.id, entityType: 'organization_member', entityId: row.id,
    action: 'member_added', newValue: { email, role },
  });

  return NextResponse.json({ member: row });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { orgId } = await params;
  const callerRole = await getUserRole(orgId, auth.user.id);
  if (!roleAtLeast(callerRole, 'admin')) return NextResponse.json({ error: 'requires_admin' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const role = String(body.role ?? '') as OrgRole;
  if (!id || !VALID_ROLES.includes(role)) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  // Don't allow demoting the last owner.
  if (role !== 'owner') {
    const { data: target } = await svc.from('organization_members').select('role').eq('id', id).maybeSingle();
    if (target?.role === 'owner') {
      const { count } = await svc.from('organization_members').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'owner');
      if ((count ?? 0) <= 1) return NextResponse.json({ error: 'cannot_demote_last_owner' }, { status: 400 });
    }
  }

  const { data: prev } = await svc.from('organization_members').select('role').eq('id', id).maybeSingle();
  const { error } = await svc.from('organization_members').update({ role }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createAuditLog({
    orgId, userId: auth.user.id, entityType: 'organization_member', entityId: id,
    action: 'member_role_changed', oldValue: { role: prev?.role }, newValue: { role },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { orgId } = await params;
  const callerRole = await getUserRole(orgId, auth.user.id);
  if (!roleAtLeast(callerRole, 'admin')) return NextResponse.json({ error: 'requires_admin' }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'no_service' }, { status: 500 });

  const { data: target } = await svc.from('organization_members').select('role,user_id').eq('id', id).maybeSingle();
  if (target?.role === 'owner') {
    const { count } = await svc.from('organization_members').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'owner');
    if ((count ?? 0) <= 1) return NextResponse.json({ error: 'cannot_remove_last_owner' }, { status: 400 });
  }

  const { error } = await svc.from('organization_members').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await createAuditLog({
    orgId, userId: auth.user.id, entityType: 'organization_member', entityId: id,
    action: 'member_removed', oldValue: { role: target?.role, user_id: target?.user_id },
  });
  return NextResponse.json({ ok: true });
}
