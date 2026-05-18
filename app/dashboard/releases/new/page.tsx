'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrgPicker, useActiveOrg } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';
import type { Release, ReleaseType } from '@/types/catalog';

const TYPES: ReleaseType[] = ['single', 'ep', 'album', 'compilation'];

export default function NewReleasePage() {
  const router = useRouter();
  const orgId = useActiveOrg();
  const [form, setForm] = useState<Partial<Release>>({ release_type: 'single', featured_artists: [] });
  const [featuredText, setFeaturedText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!orgId || !form.release_title) return;
    setSaving(true);
    const payload = {
      ...form,
      organization_id: orgId,
      featured_artists: featuredText ? featuredText.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    const res = await fetch('/api/music/releases', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert((await res.json()).error);
      setSaving(false);
      return;
    }
    const d = await res.json();
    const releaseId = d.release.id;
    const file = fileRef.current?.files?.[0];
    if (file) {
      const fd = new FormData();
      fd.append('release_id', releaseId);
      fd.append('file', file);
      await fetch('/api/music/artwork', { method: 'POST', body: fd });
    }
    router.push(`/dashboard/releases/${releaseId}`);
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-heading tracking-tight mb-4">New release</h1>
      <OrgPicker />
      <GovernedStep
        title="Release metadata"
        whatThisIs="Identifying info about the published product. Carries across to every platform export."
        whyItMatters="Distributors and stores use this exact metadata to display the release. Errors here propagate to every store page."
        whatYouNeed={['Title (final, not provisional)', 'Type', 'Primary artist', 'Genre / sub-genre', 'P-line and C-line', 'Cover artwork file']}
        estimatedTime="10-15 min"
        commonMistakes={['Inconsistent capitalization between releases', 'Forgetting to set copyright_year']}
      >
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm col-span-2"
            placeholder="Release title *" value={form.release_title ?? ''}
            onChange={(e) => setForm({ ...form, release_title: e.target.value })} />
          <select value={form.release_type} onChange={(e) => setForm({ ...form, release_type: e.target.value as ReleaseType })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Primary artist" value={form.primary_artist ?? ''}
            onChange={(e) => setForm({ ...form, primary_artist: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm col-span-2"
            placeholder="Featured artists (comma-separated)" value={featuredText}
            onChange={(e) => setFeaturedText(e.target.value)} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Label name" value={form.label_name ?? ''}
            onChange={(e) => setForm({ ...form, label_name: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="UPC" value={form.upc ?? ''}
            onChange={(e) => setForm({ ...form, upc: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Catalog number" value={form.catalog_number ?? ''}
            onChange={(e) => setForm({ ...form, catalog_number: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Distributor" value={form.distributor ?? ''}
            onChange={(e) => setForm({ ...form, distributor: e.target.value })} />
          <label className="text-xs text-zinc-400 col-span-2">Release date
            <input type="date" className="block rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm w-full mt-1"
              value={form.release_date ?? ''} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
          </label>
          <label className="text-xs text-zinc-400 col-span-2">Original release date (for re-releases)
            <input type="date" className="block rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm w-full mt-1"
              value={form.original_release_date ?? ''} onChange={(e) => setForm({ ...form, original_release_date: e.target.value })} />
          </label>
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Language (e.g. en)" value={form.language ?? ''}
            onChange={(e) => setForm({ ...form, language: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Genre" value={form.genre ?? ''}
            onChange={(e) => setForm({ ...form, genre: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Sub-genre" value={form.sub_genre ?? ''}
            onChange={(e) => setForm({ ...form, sub_genre: e.target.value })} />
          <input type="number" className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Copyright year" value={form.copyright_year ?? ''}
            onChange={(e) => setForm({ ...form, copyright_year: Number(e.target.value) })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm col-span-2"
            placeholder="P-line (e.g. ℗ 2026 Acme Records)" value={form.p_line ?? ''}
            onChange={(e) => setForm({ ...form, p_line: e.target.value })} />
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm col-span-2"
            placeholder="C-line (e.g. © 2026 Acme Publishing)" value={form.c_line ?? ''}
            onChange={(e) => setForm({ ...form, c_line: e.target.value })} />
          <label className="text-xs text-zinc-400 col-span-2">Artwork file
            <input ref={fileRef} type="file" accept="image/*" className="block text-sm mt-1" />
          </label>
          <textarea className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm col-span-2"
            placeholder="Notes" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button onClick={save} disabled={saving}
            className="col-span-2 rounded-md bg-zinc-100 text-zinc-900 text-sm py-2 disabled:opacity-50">
            {saving ? 'Saving…' : 'Create release'}
          </button>
        </div>
      </GovernedStep>

      <TrainingBlock topic="p_line" />
      <TrainingBlock topic="c_line" />
    </div>
  );
}
