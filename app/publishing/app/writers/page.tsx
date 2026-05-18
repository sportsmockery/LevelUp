'use client';

import { useEffect, useState } from 'react';
import { useOrg } from '../_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { WriterProfile, PublisherProfile } from '@/types/catalog';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';

export default function WritersAndPublishersPage() {
  const { activeOrgId } = useOrg();
  const [writers, setWriters] = useState<WriterProfile[]>([]);
  const [publishers, setPublishers] = useState<PublisherProfile[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!activeOrgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    (async () => {
      const [w, p] = await Promise.all([
        sb.from('writer_profiles').select('*').eq('org_id', activeOrgId).order('legal_name'),
        sb.from('publisher_profiles').select('*').eq('org_id', activeOrgId).order('publisher_name'),
      ]);
      setWriters((w.data as WriterProfile[]) ?? []);
      setPublishers((p.data as PublisherProfile[]) ?? []);
    })();
  }, [activeOrgId, refreshKey]);

  return (
    <div className="space-y-10 pt-2">
      <header>
        <h1 className="font-heading text-3xl font-bold">Writers &amp; Publishers</h1>
        <p className="text-white/60 text-sm mt-1">Profiles used on track splits.</p>
      </header>

      <GovernedStep
        title="Writers"
        whatThisIs="A writer is a songwriter — anyone with a creative contribution to the composition. Each writer needs a PRO affiliation (BMI, ASCAP, SESAC, etc.) and an IPI number to be paid."
        whyItMatters="PROs match royalties to writers by IPI. A writer with no IPI listed cannot be paid for performance royalties anywhere in the world."
        whatYouNeed={['Legal name (as it appears at the PRO)', 'PRO affiliation', 'IPI number (6-11 digits)']}
        estimatedTime="~2 minutes per writer"
        commonMistakes={[
          'Using a stage name instead of legal name at the PRO.',
          'Listing the same writer with multiple PROs.',
          'Forgetting the IPI — it\'s the unique identifier that makes payment possible.',
        ]}
      >
        <WriterForm orgId={activeOrgId} onCreated={() => setRefreshKey((k) => k + 1)} />
      </GovernedStep>

      <section>
        <h2 className="font-heading text-xl font-semibold mb-3">All writers ({writers.length})</h2>
        <div className="space-y-2">
          {writers.length === 0 && <p className="text-sm text-white/50">No writers yet.</p>}
          {writers.map((w) => (
            <div key={w.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-medium">{w.legal_name}{w.stage_name ? <span className="text-white/50"> · "{w.stage_name}"</span> : null}</div>
                  <div className="text-xs text-white/55 mt-0.5">
                    PRO: {w.pro ?? '—'} · IPI: <span className="font-mono">{w.ipi_number ?? '—'}</span> · {w.country ?? '—'}
                  </div>
                </div>
                {w.email && <span className="text-xs text-white/55">{w.email}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <TrainingBlock topic="pro" />

      <GovernedStep
        title="Publishers"
        whatThisIs="A publisher is the entity that collects the publisher-share of royalties. Even self-published writers should set up a publishing entity with its own IPI."
        whyItMatters="Without a registered publisher, the 50% publisher-side of royalties is forfeited at the PRO and MLC."
        whatYouNeed={['Publisher name', 'PRO affiliation (often same as writer\'s)', 'Publisher IPI', 'Optional: legal entity name, territory, ownership %']}
        estimatedTime="~2 minutes per publisher"
        commonMistakes={[
          'Listing the writer\'s personal name as the publisher.',
          'Forgetting that the publisher IPI is a different number than the writer IPI.',
        ]}
      >
        <PublisherForm orgId={activeOrgId} onCreated={() => setRefreshKey((k) => k + 1)} />
      </GovernedStep>

      <section>
        <h2 className="font-heading text-xl font-semibold mb-3">All publishers ({publishers.length})</h2>
        <div className="space-y-2">
          {publishers.length === 0 && <p className="text-sm text-white/50">No publishers yet.</p>}
          {publishers.map((p) => (
            <div key={p.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm">
              <div className="font-medium">{p.publisher_name}</div>
              <div className="text-xs text-white/55 mt-0.5">
                PRO: {p.pro ?? '—'} · IPI: <span className="font-mono">{p.ipi_number ?? '—'}</span> · {p.territory ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <TrainingBlock topic="publishing_admin" />
    </div>
  );
}

function WriterForm({ orgId, onCreated }: { orgId: string | null; onCreated: () => void }) {
  const [form, setForm] = useState({ legal_name: '', stage_name: '', pro: 'BMI', ipi_number: '', country: 'US', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!orgId) return;
    setSaving(true);
    try {
      const sb = getBrowserClient();
      if (!sb) throw new Error('No supabase client');
      const { error } = await sb.from('writer_profiles').insert({ org_id: orgId, ...form });
      if (error) throw error;
      setForm({ legal_name: '', stage_name: '', pro: 'BMI', ipi_number: '', country: 'US', email: '' });
      onCreated();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-3 max-w-2xl">
      <TextField label="Legal name *" value={form.legal_name} onChange={(v) => setForm({ ...form, legal_name: v })} />
      <TextField label="Stage name" value={form.stage_name} onChange={(v) => setForm({ ...form, stage_name: v })} />
      <SelectField label="PRO" value={form.pro} onChange={(v) => setForm({ ...form, pro: v })} options={['BMI', 'ASCAP', 'SESAC', 'GMR', 'Other']} />
      <TextField label="IPI number" value={form.ipi_number} onChange={(v) => setForm({ ...form, ipi_number: v })} mono />
      <TextField label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
      <TextField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
      {error && <div className="text-red-300 text-sm md:col-span-2">{error}</div>}
      <button onClick={save} disabled={!form.legal_name || saving} className="md:col-span-2 rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-emerald-300">
        {saving ? 'Saving…' : 'Add writer'}
      </button>
    </div>
  );
}

function PublisherForm({ orgId, onCreated }: { orgId: string | null; onCreated: () => void }) {
  const [form, setForm] = useState({ publisher_name: '', legal_entity_name: '', pro: 'BMI', ipi_number: '', territory: 'World' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!orgId) return;
    setSaving(true);
    try {
      const sb = getBrowserClient();
      if (!sb) throw new Error('No supabase client');
      const { error } = await sb.from('publisher_profiles').insert({ org_id: orgId, ...form });
      if (error) throw error;
      setForm({ publisher_name: '', legal_entity_name: '', pro: 'BMI', ipi_number: '', territory: 'World' });
      onCreated();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-3 max-w-2xl">
      <TextField label="Publisher name *" value={form.publisher_name} onChange={(v) => setForm({ ...form, publisher_name: v })} />
      <TextField label="Legal entity name" value={form.legal_entity_name} onChange={(v) => setForm({ ...form, legal_entity_name: v })} />
      <SelectField label="PRO" value={form.pro} onChange={(v) => setForm({ ...form, pro: v })} options={['BMI', 'ASCAP', 'SESAC', 'GMR', 'Other']} />
      <TextField label="Publisher IPI" value={form.ipi_number} onChange={(v) => setForm({ ...form, ipi_number: v })} mono />
      <TextField label="Territory" value={form.territory} onChange={(v) => setForm({ ...form, territory: v })} />
      {error && <div className="text-red-300 text-sm md:col-span-2">{error}</div>}
      <button onClick={save} disabled={!form.publisher_name || saving} className="md:col-span-2 rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-emerald-300">
        {saving ? 'Saving…' : 'Add publisher'}
      </button>
    </div>
  );
}

function TextField({ label, value, onChange, mono = false }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={'w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm ' + (mono ? 'font-mono' : '')} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
