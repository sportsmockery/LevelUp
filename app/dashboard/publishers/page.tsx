'use client';

import { useEffect, useState } from 'react';
import { OrgPicker, useActiveOrg } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';
import type { PublisherProfile } from '@/types/catalog';

const PROS = ['BMI', 'ASCAP', 'SESAC', 'SOCAN', 'PRS', 'Other', 'Unknown'];
const TYPES = [
  'self_published', 'owned_publishing_company', 'songtrust_admin',
  'third_party_admin', 'label_publisher', 'unknown',
];

export default function PublishersPage() {
  const orgId = useActiveOrg();
  const [publishers, setPublishers] = useState<PublisherProfile[]>([]);
  const [form, setForm] = useState<Partial<PublisherProfile>>({ pro: 'Unknown', publisher_type: 'unknown' });

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/music/publishers?org=${orgId}`).then((r) => r.json()).then((d) => setPublishers(d.publishers ?? []));
  }, [orgId]);

  async function add() {
    if (!orgId || !form.publisher_name) return;
    const res = await fetch('/api/music/publishers', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ organization_id: orgId, ...form }),
    });
    if (res.ok) {
      const d = await res.json();
      setPublishers((p) => [d.publisher, ...p]);
      setForm({ pro: 'Unknown', publisher_type: 'unknown' });
    } else alert((await res.json()).error);
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-heading tracking-tight mb-4">Publishers</h1>
      <OrgPicker />
      <GovernedStep
        title="Who publishes this work?"
        whatThisIs="A publisher profile records the entity that administers the composition: self, a company you own, a third-party admin (Songtrust, Sentric), or a label-affiliated publisher."
        whyItMatters="Performance and mechanical royalties on the publisher side cannot be collected without a registered publisher with an IPI."
        whatYouNeed={['Publisher name (must match PRO records)', 'Publisher IPI/CAE number', 'Affiliated PRO', 'Type (self / admin / label)']}
        estimatedTime="2 min per publisher"
        commonMistakes={['Listing a writer as their own publisher without registering a publisher entity', 'Using the wrong PRO']}
      >
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Publisher name *" value={form.publisher_name ?? ''}
            onChange={(e) => setForm({ ...form, publisher_name: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Legal entity name" value={form.legal_entity_name ?? ''}
            onChange={(e) => setForm({ ...form, legal_entity_name: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="IPI / CAE" value={form.ipi_number ?? ''}
            onChange={(e) => setForm({ ...form, ipi_number: e.target.value })} />
          <select value={form.pro ?? 'Unknown'} onChange={(e) => setForm({ ...form, pro: e.target.value as PublisherProfile['pro'] })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm">
            {PROS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={form.publisher_type ?? 'unknown'}
            onChange={(e) => setForm({ ...form, publisher_type: e.target.value as PublisherProfile['publisher_type'] })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Admin company (if any)" value={form.admin_company ?? ''}
            onChange={(e) => setForm({ ...form, admin_company: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Territory" value={form.territory ?? ''}
            onChange={(e) => setForm({ ...form, territory: e.target.value })} />
          <input type="number" step="0.001" min="0" max="100"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Ownership %" value={form.ownership_percentage ?? ''}
            onChange={(e) => setForm({ ...form, ownership_percentage: Number(e.target.value) })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Phone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <textarea className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm col-span-2"
            placeholder="Address" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <textarea className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm col-span-2"
            placeholder="Notes" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button onClick={add} className="col-span-2 rounded-md bg-zinc-100 text-zinc-900 text-sm py-2">Add publisher</button>
        </div>
      </GovernedStep>

      <TrainingBlock topic="publisher_share" />
      <TrainingBlock topic="publishing_admin" />

      <section className="mt-6">
        <h2 className="text-xl font-heading mb-2">Existing publishers</h2>
        <ul className="space-y-2">
          {publishers.map((p) => (
            <li key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
              <p className="font-medium">{p.publisher_name}</p>
              <p className="text-xs text-zinc-400">
                {p.publisher_type} · {p.pro} {p.ipi_number ? `· IPI ${p.ipi_number}` : '· IPI missing'}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
