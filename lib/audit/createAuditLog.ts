import { supabaseServer } from '../supabase-server';

export interface AuditInput {
  orgId: string;
  userId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function createAuditLog(input: AuditInput): Promise<void> {
  if (!supabaseServer) return;
  await supabaseServer.from('audit_logs').insert({
    organization_id: input.orgId,
    user_id: input.userId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
  });
}
