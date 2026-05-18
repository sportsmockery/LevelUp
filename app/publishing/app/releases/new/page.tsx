'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useOrg } from '../../_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';
import type { ReleaseType } from '@/types/catalog';

export default function NewReleasePage() {
  const router = useRouter();
  const { activeOrgId } = useOrg();
  const [form, setForm] = useState({
    release_title: '',
    release_type: 'single' as ReleaseType,
    primary_artist: '',
    label_name: '',
    upc: '',
    catalog_number: '',
    release_date: '',
    language: 'en',
    genre: '',
    copyright_year: new Date().getFullYear(),
    p_line: '',
    c_line: '',
    distributor: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!activeOrgId) return;
    setSaving(true);
    try {
      const sb = getBrowserClient();
      if (!sb) throw new Error('No supabase client');
      const { data, error } = await sb
        .from('releases')
        .insert({ org_id: activeOrgId, ...form })
        .select('id')
        .single();
      if (error) throw error;
      router.push(`/publishing/app/releases/${data.id}`);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
      {children}
    </label>
  );
  const I = (key: keyof typeof form, opts: { mono?: boolean; type?: string } = {}) => (
    <input
      type={opts.type ?? 'text'}
      value={(form[key] as string | number) ?? ''}
      onChange={(e) => setForm({ ...form, [key]: opts.type === 'number' ? Number(e.target.value) : e.target.value })}
      className={'w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm ' + (opts.mono ? 'font-mono' : '')}
    />
  );

  return (
    <div className="space-y-10 pt-2">
      <header>
        <h1 className="font-heading text-3xl font-bold">New release</h1>
        <p className="text-white/60 text-sm mt-1">Step 5 of the workflow — create the release record.</p>
      </header>

      <GovernedStep
        title="Release metadata"
        whatThisIs="A release is what you'll send to distribution. Single, EP, album, or compilation. The metadata here flows into every registration packet you generate."
        whyItMatters="Distributors, the MLC, eCO, and SoundExchange all parse the release-level fields. Getting them right once means every downstream filing is right."
        whatYouNeed={['Title and type', 'Primary artist name', 'Copyright year (for ℗ and © lines)', 'Optional: UPC, catalog number, label name, distributor']}
        estimatedTime="~5 minutes"
        commonMistakes={[
          'Setting the copyright year to the release year when the song was actually written earlier.',
          'Leaving the ℗ and © lines empty — distributors will reject the release.',
          'Misspelling the primary artist name (it must match exactly across platforms).',
        ]}
      >
        <div className="grid md:grid-cols-2 gap-3 max-w-3xl">
          <F label="Release title *">{I('release_title')}</F>
          <F label="Release type *">
            <select value={form.release_type} onChange={(e) => setForm({ ...form, release_type: e.target.value as ReleaseType })} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm">
              <option value="single">Single</option>
              <option value="ep">EP</option>
              <option value="album">Album</option>
              <option value="compilation">Compilation</option>
            </select>
          </F>
          <F label="Primary artist *">{I('primary_artist')}</F>
          <F label="Label name">{I('label_name')}</F>
          <F label="UPC">{I('upc', { mono: true })}</F>
          <F label="Catalog number">{I('catalog_number', { mono: true })}</F>
          <F label="Release date">{I('release_date', { type: 'date' })}</F>
          <F label="Language">{I('language')}</F>
          <F label="Genre">{I('genre')}</F>
          <F label="Copyright year *">{I('copyright_year', { type: 'number' })}</F>
          <F label="℗ Line"><input value={form.p_line} onChange={(e) => setForm({ ...form, p_line: e.target.value })} placeholder="2026 Burhans Music LLC" className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm" /></F>
          <F label="© Line"><input value={form.c_line} onChange={(e) => setForm({ ...form, c_line: e.target.value })} placeholder="2026 Burhans Music LLC" className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm" /></F>
          <F label="Distributor">{I('distributor')}</F>
        </div>
        {error && <div className="text-red-300 text-sm mt-4">{error}</div>}
        <div className="mt-6">
          <button
            disabled={!form.release_title || !form.primary_artist || saving}
            onClick={save}
            className="rounded-full bg-emerald-400 text-black px-6 py-2 text-sm font-medium disabled:opacity-40 hover:bg-emerald-300"
          >
            {saving ? 'Creating…' : 'Create release & continue →'}
          </button>
        </div>
      </GovernedStep>

      <div className="grid md:grid-cols-2 gap-4">
        <TrainingBlock topic="p_line" />
        <TrainingBlock topic="c_line" />
      </div>
    </div>
  );
}
