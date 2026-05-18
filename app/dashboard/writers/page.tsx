'use client';

import { useEffect, useState } from 'react';
import { OrgPicker, useActiveOrg } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';
import type { WriterProfile } from '@/types/catalog';

const PROS = ['BMI', 'ASCAP', 'SESAC', 'SOCAN', 'PRS', 'Other', 'Unknown'];

export default function WritersPage() {
  const orgId = useActiveOrg();
  const [writers, setWriters] = useState<WriterProfile[]>([]);
  const [form, setForm] = useState<Partial<WriterProfile>>({ pro: 'Unknown' });

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/music/writers?org=${orgId}`).then((r) => r.json()).then((d) => setWriters(d.writers ?? []));
  }, [orgId]);

  async function add() {
    if (!orgId || !form.legal_name) return;
    const res = await fetch('/api/music/writers', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ organization_id: orgId, ...form }),
    });
    if (res.ok) {
      const d = await res.json();
      setWriters((w) => [d.writer, ...w]);
      setForm({ pro: 'Unknown' });
    } else alert((await res.json()).error);
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-heading tracking-tight mb-4">Writers</h1>
      <OrgPicker />
      <GovernedStep
        title="Add every songwriter on the release"
        whatThisIs="A writer profile is the canonical record for one songwriter — their legal name, IPI number, and PRO."
        whyItMatters="Every BMI/ASCAP/MLC registration needs the writer's IPI number. Missing IPIs are the single most common cause of rejected work registrations."
        whatYouNeed={['Legal name (matches IRS records)', 'IPI/CAE number (from PRO membership page)', 'Affiliated PRO']}
        estimatedTime="2 min per writer"
        commonMistakes={['Using a stage name in legal_name', 'Leaving IPI blank — registrations will be rejected']}
      >
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Legal name *" value={form.legal_name ?? ''}
            onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Stage name" value={form.stage_name ?? ''}
            onChange={(e) => setForm({ ...form, stage_name: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="IPI / CAE number" value={form.ipi_number ?? ''}
            onChange={(e) => setForm({ ...form, ipi_number: e.target.value })} />
          <select value={form.pro ?? 'Unknown'} onChange={(e) => setForm({ ...form, pro: e.target.value as WriterProfile['pro'] })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm">
            {PROS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Phone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Country" value={form.country ?? ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Role (e.g. composer)" value={form.role ?? ''} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <textarea className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm col-span-2"
            placeholder="Notes" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button onClick={add} className="col-span-2 rounded-md bg-zinc-100 text-zinc-900 text-sm py-2">Add writer</button>
        </div>
      </GovernedStep>

      <TrainingBlock topic="writer_share" />
      <TrainingBlock topic="pro" />

      <section className="mt-6">
        <h2 className="text-xl font-heading mb-2">Existing writers</h2>
        <ul className="space-y-2">
          {writers.map((w) => (
            <li key={w.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm flex justify-between">
              <div>
                <p className="font-medium">{w.legal_name} {w.stage_name && <span className="text-zinc-500">aka {w.stage_name}</span>}</p>
                <p className="text-xs text-zinc-400">{w.pro} {w.ipi_number ? `· IPI ${w.ipi_number}` : '· IPI missing'}</p>
              </div>
              {w.email && <span className="text-xs text-zinc-500">{w.email}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
