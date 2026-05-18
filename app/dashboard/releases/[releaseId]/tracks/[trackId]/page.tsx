'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';
import { SplitManager } from '@/components/music/SplitManager';
import type { Track, TrackVersion } from '@/types/catalog';

const VERSIONS: TrackVersion[] = [
  'original', 'radio_edit', 'clean', 'explicit', 'remix',
  'live', 'acoustic', 'instrumental', 'demo', 'alternate',
];

export default function TrackPage({ params }: { params: Promise<{ releaseId: string; trackId: string }> }) {
  const { trackId } = use(params);
  const [track, setTrack] = useState<Track | null>(null);
  const [form, setForm] = useState<Partial<Track>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const d = await (await fetch(`/api/music/tracks/${trackId}`)).json();
    if (d.track) {
      setTrack(d.track);
      setForm(d.track);
    }
  }, [trackId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/music/tracks/${trackId}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) await load();
    else alert((await res.json()).error);
    setSaving(false);
  }

  if (!track) return <div className="p-8 text-zinc-400">Loading…</div>;
  const orgId = track.organization_id;

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 py-8 space-y-4">
      <h1 className="text-3xl font-heading tracking-tight">{track.track_title}</h1>

      <GovernedStep
        title="Track metadata"
        whatThisIs="Recording-level info: title, version, duration, ISRC, ISWC, credits, lyrics."
        whyItMatters="This is the data every platform reads to identify the recording. Errors propagate to every store, royalty match, and royalty payment."
        whatYouNeed={['Title (exact, with all spelling)', 'Duration', 'ISRC (per version)', 'P-line and C-line if different from release']}
        estimatedTime="5-10 min"
        commonMistakes={['Reusing ISRC across versions', 'Confusing ISRC with ISWC']}
      >
        <div className="grid grid-cols-2 gap-2 text-sm">
          <input className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 col-span-2"
            placeholder="Track title" value={form.track_title ?? ''}
            onChange={(e) => setForm({ ...form, track_title: e.target.value })} />
          <select value={form.version ?? 'original'}
            onChange={(e) => setForm({ ...form, version: e.target.value as TrackVersion })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5">
            {VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <input type="number" placeholder="Track #"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.track_number ?? ''} onChange={(e) => setForm({ ...form, track_number: Number(e.target.value) })} />
          <input type="number" placeholder="Disc #"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.disc_number ?? 1} onChange={(e) => setForm({ ...form, disc_number: Number(e.target.value) })} />
          <input type="number" placeholder="Duration (ms)"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.duration_ms ?? ''} onChange={(e) => setForm({ ...form, duration_ms: Number(e.target.value) })} />
          <input placeholder="ISRC (CCXXXYYNNNNN)"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 font-mono"
            value={form.isrc ?? ''} onChange={(e) => setForm({ ...form, isrc: e.target.value.toUpperCase() })} />
          <input placeholder="ISWC"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 font-mono"
            value={form.iswc ?? ''} onChange={(e) => setForm({ ...form, iswc: e.target.value.toUpperCase() })} />
          <input placeholder="Language"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.language ?? ''} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          <label className="text-xs text-zinc-400 flex gap-2 items-center">
            <input type="checkbox" checked={form.explicit ?? false}
              onChange={(e) => setForm({ ...form, explicit: e.target.checked })} /> Explicit
          </label>
          <label className="text-xs text-zinc-400 flex gap-2 items-center">
            <input type="checkbox" checked={form.instrumental ?? false}
              onChange={(e) => setForm({ ...form, instrumental: e.target.checked })} /> Instrumental
          </label>
          <input type="number" placeholder="BPM"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.bpm ?? ''} onChange={(e) => setForm({ ...form, bpm: Number(e.target.value) })} />
          <input placeholder="Musical key"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.musical_key ?? ''} onChange={(e) => setForm({ ...form, musical_key: e.target.value })} />
          <input type="date" placeholder="Recording date"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.recording_date ?? ''} onChange={(e) => setForm({ ...form, recording_date: e.target.value })} />
          <input placeholder="Studio"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.studio_name ?? ''} onChange={(e) => setForm({ ...form, studio_name: e.target.value })} />
          <input placeholder="Recording engineer"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.recording_engineer ?? ''} onChange={(e) => setForm({ ...form, recording_engineer: e.target.value })} />
          <input placeholder="Mixing engineer"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.mixing_engineer ?? ''} onChange={(e) => setForm({ ...form, mixing_engineer: e.target.value })} />
          <input placeholder="Mastering engineer"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5"
            value={form.mastering_engineer ?? ''} onChange={(e) => setForm({ ...form, mastering_engineer: e.target.value })} />
          <input placeholder="P-line (override)"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 col-span-2"
            value={form.p_line ?? ''} onChange={(e) => setForm({ ...form, p_line: e.target.value })} />
          <input placeholder="C-line (override)"
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 col-span-2"
            value={form.c_line ?? ''} onChange={(e) => setForm({ ...form, c_line: e.target.value })} />
          <textarea className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 col-span-2"
            placeholder="Lyrics" value={form.lyrics ?? ''} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} rows={6} />
          <textarea className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 col-span-2"
            placeholder="Notes" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button onClick={save} disabled={saving}
            className="col-span-2 rounded-md bg-zinc-100 text-zinc-900 py-2 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save track'}
          </button>
        </div>
      </GovernedStep>

      <GovernedStep
        title="Splits"
        whatThisIs="Writer shares (composition side) and publisher shares (publishing side) — both must total 100%."
        whyItMatters="Royalty platforms reject registrations where splits do not balance to 100%."
        whatYouNeed="Each collaborator's profile (with IPI) and the agreed share percentages."
        estimatedTime="5-15 min, depending on collaborator count"
        commonMistakes={['Rounding errors (60/30/10 vs 60/30 — the third writer is missing 10%)', 'Not getting collaborator sign-off before submission']}
      >
        <SplitManager trackId={trackId} orgId={orgId} />
      </GovernedStep>

      <TrainingBlock topic="isrc" />
      <TrainingBlock topic="iswc" />
      <TrainingBlock topic="split_sheet" />
    </div>
  );
}
