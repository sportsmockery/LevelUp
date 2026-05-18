import type { OrgRole } from '@/types/catalog';
import { supabaseServer } from '../supabase-server';

const RANK: Record<OrgRole, number> = {
  viewer: 1,
  collaborator: 2,
  editor: 3,
  admin: 4,
  owner: 5,
};

export function meetsRole(actual: OrgRole, required: OrgRole): boolean {
  return RANK[actual] >= RANK[required];
}

export async function getUserRole(
  orgId: string,
  userId: string,
): Promise<OrgRole | null> {
  if (!supabaseServer) return null;
  const { data } = await supabaseServer
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.role as OrgRole) ?? null;
}

export async function requireRole(
  orgId: string,
  userId: string,
  minRole: OrgRole,
): Promise<{ ok: true; role: OrgRole } | { ok: false; reason: string }> {
  const role = await getUserRole(orgId, userId);
  if (!role) return { ok: false, reason: 'not a member of this organization' };
  if (!meetsRole(role, minRole)) {
    return { ok: false, reason: `requires ${minRole}, have ${role}` };
  }
  return { ok: true, role };
}
