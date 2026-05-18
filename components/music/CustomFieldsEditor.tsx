'use client';

// Settings UI for defining custom_fields per entity_type.

import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { CustomField, CustomFieldEntityType, CustomFieldType } from '@/types/catalog';

const ENTITY_TYPES: CustomFieldEntityType[] = ['release', 'track', 'writer', 'publisher'];
const FIELD_TYPES: CustomFieldType[] = ['text', 'number', 'date', 'dropdown', 'boolean', 'multi_select', 'url', 'file'];

export function CustomFieldsEditor({ orgId }: { orgId: string | null }) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({
    entity_type: 'track' as CustomFieldEntityType,
    field_key: '',
    field_label: '',
    field_type: 'text' as CustomFieldType,
    options: '',
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    sb.from('custom_fields').select('*').eq('org_id', orgId).order('entity_type').order('field_label').then(({ data }) => {
      setFields((data as CustomField[]) ?? []);
    });
  }, [orgId, refresh]);

  const create = async () => {
    setErr(null);
    if (!orgId || !form.field_label.trim()) return;
    const key = form.field_key.trim() || form.field_label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const opts = (form.field_type === 'dropdown' || form.field_type === 'multi_select')
      ? form.options.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    try {
      const sb = getBrowserClient();
      if (!sb) throw new Error('no client');
      const { error } = await sb.from('custom_fields').insert({
        org_id: orgId,
        entity_type: form.entity_type,
        field_key: key,
        field_label: form.field_label,
        field_type: form.field_type,
        options: opts,
      });
      if (error) throw error;
      setForm({ ...form, field_key: '', field_label: '', options: '' });
      setRefresh((k) => k + 1);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this custom field? All saved values for it will be lost.')) return;
    const sb = getBrowserClient();
    if (!sb) return;
    await sb.from('custom_fields').delete().eq('id', id);
    setRefresh((k) => k + 1);
  };

  const byEntity = ENTITY_TYPES.reduce<Record<CustomFieldEntityType, CustomField[]>>((acc, t) => {
    acc[t] = fields.filter((f) => f.entity_type === t);
    return acc;
  }, { release: [], track: [], writer: [], publisher: [] });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="grid md:grid-cols-5 gap-2 items-end">
          <Field label="Entity type">
            <select value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value as CustomFieldEntityType })} className="inp">
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Label *">
            <input value={form.field_label} onChange={(e) => setForm({ ...form, field_label: e.target.value })} placeholder="e.g. Sync Hold Date" className="inp" />
          </Field>
          <Field label="Key (auto if blank)">
            <input value={form.field_key} onChange={(e) => setForm({ ...form, field_key: e.target.value })} placeholder="sync_hold_date" className="inp font-mono" />
          </Field>
          <Field label="Type">
            <select value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value as CustomFieldType })} className="inp">
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <button onClick={create} disabled={!form.field_label} className="rounded-full bg-emerald-400 text-black px-4 py-2 text-sm font-medium hover:bg-emerald-300 disabled:opacity-40">Add field</button>
        </div>
        {(form.field_type === 'dropdown' || form.field_type === 'multi_select') && (
          <Field label="Options (comma-separated)">
            <input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder="Option A, Option B, Option C" className="inp" />
          </Field>
        )}
        {err && <div className="text-red-300 text-sm">{err}</div>}
      </div>

      <div className="space-y-3">
        {ENTITY_TYPES.map((t) => (
          <div key={t} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/45 mb-2">{t} ({byEntity[t].length})</div>
            {byEntity[t].length === 0 ? (
              <p className="text-xs text-white/35">No custom fields on {t}s.</p>
            ) : (
              <ul className="space-y-1">
                {byEntity[t].map((f) => (
                  <li key={f.id} className="flex justify-between items-center text-sm">
                    <span><span className="font-medium">{f.field_label}</span> <span className="text-white/40 font-mono text-xs">·{f.field_key}</span> <span className="text-white/40 text-xs">[{f.field_type}]</span> {f.options.length > 0 && <span className="text-white/40 text-xs">({f.options.length} options)</span>}</span>
                    <button onClick={() => remove(f.id)} className="text-xs text-red-300 hover:underline">delete</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <style jsx>{`.inp { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; width: 100%; color: inherit; }`}</style>
    </div>
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
