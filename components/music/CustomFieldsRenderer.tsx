'use client';

// Dynamic renderer for custom_fields on a single entity (release/track/writer/publisher).
// Reads field definitions for the entity_type, reads existing values for entity_id,
// renders inputs, persists values via upsert on save.

import { useCallback, useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { CustomField, CustomFieldEntityType, CustomFieldValue } from '@/types/catalog';

export function CustomFieldsRenderer({ orgId, entityType, entityId }: { orgId: string | null; entityType: CustomFieldEntityType; entityId: string }) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({}); // keyed by custom_field_id
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!orgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    const [{ data: f }, { data: v }] = await Promise.all([
      sb.from('custom_fields').select('*').eq('org_id', orgId).eq('entity_type', entityType).order('field_label'),
      sb.from('custom_field_values').select('*').eq('entity_id', entityId),
    ]);
    const fieldList = (f as CustomField[]) ?? [];
    setFields(fieldList);
    const map: Record<string, unknown> = {};
    for (const r of (v as CustomFieldValue[]) ?? []) {
      map[r.custom_field_id] = r.value;
    }
    setValues(map);
  }, [orgId, entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const save = async (cfId: string, val: unknown) => {
    const sb = getBrowserClient();
    if (!sb) return;
    setSaving((s) => ({ ...s, [cfId]: true }));
    await sb.from('custom_field_values').upsert({ custom_field_id: cfId, entity_id: entityId, value: val }, { onConflict: 'custom_field_id,entity_id' });
    setSaving((s) => ({ ...s, [cfId]: false }));
  };

  if (fields.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <header className="flex justify-between items-baseline">
        <h2 className="font-heading text-lg font-semibold">Custom fields</h2>
        <span className="text-xs text-white/40">Defined in Settings → Custom fields</span>
      </header>
      <div className="grid md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <Field key={f.id} label={f.field_label + (saving[f.id] ? ' (saving…)' : '')}>
            <DynamicInput field={f} value={values[f.id]} onChange={(v) => { setValues((m) => ({ ...m, [f.id]: v })); save(f.id, v); }} />
          </Field>
        ))}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function DynamicInput({ field, value, onChange }: { field: CustomField; value: unknown; onChange: (v: unknown) => void }) {
  const base = 'w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm';
  switch (field.field_type) {
    case 'text':
    case 'url':
      return <input type={field.field_type === 'url' ? 'url' : 'text'} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={base} />;
    case 'number':
      return <input type="number" value={(value as number) ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className={base + ' font-mono'} />;
    case 'date':
      return <input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={base} />;
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm pt-2">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span>Yes</span>
        </label>
      );
    case 'dropdown':
      return (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">— select —</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'multi_select': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1">
          {field.options.map((o) => {
            const checked = arr.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked ? [...arr, o] : arr.filter((x) => x !== o);
                    onChange(next);
                  }}
                />
                <span>{o}</span>
              </label>
            );
          })}
        </div>
      );
    }
    case 'file':
      return <input type="text" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="paste file URL or path" className={base} />;
  }
}
