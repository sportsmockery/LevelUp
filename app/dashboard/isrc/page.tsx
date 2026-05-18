'use client';

import { useEffect, useState } from 'react';
import { OrgPicker, useActiveOrg } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';
import { validateISRC } from '@/lib/validation/catalog-validation';
import type { ISRCCode } from '@/types/catalog';

export default function ISRCPage() {
  const orgId = useActiveOrg();
  const [isrcs, setIsrcs] = useState<ISRCCode[]>([]);
  const [bulk, setBulk] = useState('');
  const [single, setSingle] = useState({ isrc_code: '', status: 'reserved' as ISRCCode['status'] });
  const [filter, setFilter] = useState<'all' | ISRCCode['status']>('all');

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/music/isrc?org=${orgId}`).then((r) => r.json()).then((d) => setIsrcs(d.isrcs ?? []));
  }, [orgId]);

  async function addSingle() {
    if (!orgId || !single.isrc_code) return;
    if (!validateISRC(single.isrc_code.toUpperCase())) {
      alert(`Invalid ISRC "${single.isrc_code}" — expected CCXXXYYNNNNN`);
      return;
    }
    const res = await fetch('/api/music/isrc', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ organization_id: orgId, ...single }),
    });
    if (res.ok) {
      const d = await res.json();
      setIsrcs((xs) => [...d.isrcs, ...xs]);
      setSingle({ isrc_code: '', status: 'reserved' });
    } else alert((await res.json()).error);
  }

  async function bulkImport() {
    if (!orgId || !bulk.trim()) return;
    const codes = bulk.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    const items = codes.map((c) => ({ isrc_code: c, status: 'reserved' }));
    const res = await fetch('/api/music/isrc', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ organization_id: orgId, items }),
    });
    if (res.ok) {
      const d = await res.json();
      setIsrcs((xs) => [...d.isrcs, ...xs]);
      setBulk('');
    } else alert((await res.json()).error);
  }

  const filtered = filter === 'all' ? isrcs : isrcs.filter((i) => i.status === filter);

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-heading tracking-tight mb-4">ISRC Ledger</h1>
      <OrgPicker />

      <GovernedStep
        title="Manage your ISRC inventory"
        whatThisIs="A ledger of ISRC codes you have reserved or assigned. Each recording version needs a unique ISRC."
        whyItMatters="ISRCs are the unique identifier streaming platforms use to attribute plays and royalties to a specific recording."
        whatYouNeed={['Your registrant code (3 chars) from usisrc.org or your label', 'Country code (2 letters)', '2-digit year', 'A 5-digit designation per recording']}
        estimatedTime="5 min initial setup, then 30 sec per ISRC"
        commonMistakes={['Reusing the same designation code', 'Generating ISRCs without an official registrant code']}
      >
        <h3 className="font-medium mb-2 mt-2">Add one</h3>
        <div className="flex gap-2 mb-3">
          <input className="flex-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm font-mono"
            placeholder="USABC2600001" value={single.isrc_code}
            onChange={(e) => setSingle({ ...single, isrc_code: e.target.value.toUpperCase() })} />
          <select value={single.status}
            onChange={(e) => setSingle({ ...single, status: e.target.value as ISRCCode['status'] })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm">
            <option value="reserved">reserved</option>
            <option value="assigned">assigned</option>
            <option value="retired">retired</option>
          </select>
          <button onClick={addSingle} className="rounded-md bg-zinc-100 text-zinc-900 text-sm px-3">Add</button>
        </div>
        <h3 className="font-medium mb-2">Bulk import (whitespace or comma separated)</h3>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)}
          placeholder="USABC2600001 USABC2600002 USABC2600003"
          className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm font-mono" rows={3} />
        <button onClick={bulkImport} className="mt-2 rounded-md bg-zinc-100 text-zinc-900 text-sm px-3 py-1.5">Import</button>
      </GovernedStep>

      <TrainingBlock topic="isrc" />

      <section className="mt-6">
        <div className="flex justify-between items-baseline mb-2">
          <h2 className="text-xl font-heading">Ledger ({filtered.length})</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs">
            <option value="all">all</option>
            <option value="reserved">reserved</option>
            <option value="assigned">assigned</option>
            <option value="retired">retired</option>
          </select>
        </div>
        <ul className="space-y-1">
          {filtered.map((i) => (
            <li key={i.id} className="text-sm rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 flex justify-between">
              <span className="font-mono">{i.isrc_code}</span>
              <span className="text-zinc-500">{i.status} {i.assigned_date && `· ${i.assigned_date}`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
