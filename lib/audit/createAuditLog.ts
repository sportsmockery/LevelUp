// Music Publishing — single entry point for writing audit log rows.
// Always called server-side via the service role so RLS doesn't block inserts.

import { getServiceClient } from '@/lib/supabase-publishing-server';

export interface AuditLogInput {
  orgId: string;
  userId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  await supabase.from('audit_logs').insert({
    org_id: input.orgId,
    user_id: input.userId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
  });
}
