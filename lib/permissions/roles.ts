// Music Publishing — role hierarchy and capability checks.

import type { OrgRole } from '@/types/catalog';
import { getServiceClient } from '@/lib/supabase-publishing-server';

const RANK: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  collaborator: 2,
  viewer: 1,
};

export function roleAtLeast(role: OrgRole | null | undefined, min: OrgRole): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export async function getUserRole(orgId: string, userId: string): Promise<OrgRole | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.role as OrgRole | undefined) ?? null;
}

export async function requireRole(
  orgId: string,
  userId: string,
  min: OrgRole,
): Promise<{ ok: true; role: OrgRole } | { ok: false; reason: string }> {
  const role = await getUserRole(orgId, userId);
  if (!role) return { ok: false, reason: 'not_a_member' };
  if (!roleAtLeast(role, min)) return { ok: false, reason: `requires_${min}` };
  return { ok: true, role };
}
