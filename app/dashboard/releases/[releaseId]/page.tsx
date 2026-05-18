'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { OrderChecklist } from '@/components/music/OrderChecklist';
import { evaluateSteps } from '@/lib/permissions/order-of-operations';
import type { Release, Track, TrackWriter, TrackPublisher } from '@/types/catalog';
import type { PlatformRegistration } from '@/types/platforms';

export default function ReleaseDetailPage({ params }: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = use(params);
  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [writers, setWriters] = useState<Record<string, TrackWriter[]>>({});
  const [publishers, setPublishers] = useState<Record<string, TrackPublisher[]>>({});
  const [registrations, setRegistrations] = useState<PlatformRegistration[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [newTrackTitle, setNewTrackTitle] = useState('');

  const load = useCallback(async () => {
    const r = await (await fetch(`/api/music/releases/${releaseId}`)).json();
    if (r.release) setRelease(r.release);
    const t = await (await fetch(`/api/music/tracks?release=${releaseId}`)).json();
    setTracks(t.tracks ?? []);
    const reg = await (await fetch(`/api/music/registrations?org=${r.release?.organization_id}&release=${releaseId}`)).json();
    setRegistrations(reg.registrations ?? []);
    const files = await (await fetch(`/api/music/files?org=${r.release?.organization_id}&release=${releaseId}`)).json();
    setGeneratedCount(files.files?.length ?? 0);

    const wr: Record<string, TrackWriter[]> = {};
    const pb: Record<string, TrackPublisher[]> = {};
    for (const tr of t.tracks ?? []) {
      const w = await (await fetch(`/api/music/tracks/${tr.id}/writers`)).json();
      wr[tr.id] = w.writers ?? [];
      const p = await (await fetch(`/api/music/tracks/${tr.id}/publishers`)).json();
      pb[tr.id] = p.publishers ?? [];
    }
    setWriters(wr); setPublishers(pb);
  }, [releaseId]);

  useEffect(() => { load(); }, [load]);

  async function addTrack() {
    if (!release || !newTrackTitle.trim()) return;
    const res = await fetch('/api/music/tracks', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        organization_id: release.organization_id,
        release_id: releaseId,
        track_title: newTrackTitle,
        track_number: tracks.length + 1,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setTracks((ts) => [...ts, d.track]);
      setNewTrackTitle('');
    } else alert((await res.json()).error);
  }

  const steps = release
    ? evaluateSteps({ release, tracks, writers, publishers, registrations, generatedFileCount: generatedCount })
    : [];

  if (!release) return <div className="p-8 text-zinc-400">Loading…</div>;

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 py-8">
      <div className="flex justify-between items-baseline mb-2">
        <h1 className="text-3xl font-heading tracking-tight">{release.release_title}</h1>
        <Link href="/dashboard/exports" className="text-sm underline text-zinc-300">Go to Export Center →</Link>
      </div>
      <p className="text-sm text-zinc-400 mb-6">
        {release.release_type} · {release.primary_artist} {release.release_date && `· ${release.release_date}`}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <GovernedStep
            title="Tracks"
            whatThisIs="Each track on this release with metadata, splits, and platform-specific identifiers."
            whyItMatters="Every track on every platform must be addressable individually — by ISRC for recordings, by ISWC for compositions."
            whatYouNeed="Track title at minimum; ISRC, duration, and full credits before generating exports."
            estimatedTime="5-10 min per track"
            commonMistakes="Forgetting to update track_number when reordering."
          >
            <ul className="space-y-1 mb-3">
              {tracks.map((t) => {
                const wTotal = (writers[t.id] ?? []).reduce((s, w) => s + Number(w.share_percent || 0), 0);
                const pTotal = (publishers[t.id] ?? []).reduce((s, p) => s + Number(p.share_percent || 0), 0);
                return (
                  <li key={t.id}>
                    <Link href={`/dashboard/releases/${releaseId}/tracks/${t.id}`}
                      className="block rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm hover:border-zinc-600">
                      <div className="flex justify-between">
                        <span>{t.track_number}. {t.track_title}</span>
                        <span className="text-xs text-zinc-500">
                          W:{wTotal.toFixed(1)}% P:{pTotal.toFixed(1)}% {t.isrc || 'no ISRC'}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
              {tracks.length === 0 && <p className="text-zinc-500 text-sm">No tracks yet.</p>}
            </ul>
            <div className="flex gap-2">
              <input value={newTrackTitle} onChange={(e) => setNewTrackTitle(e.target.value)}
                placeholder="New track title"
                className="flex-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm" />
              <button onClick={addTrack} className="rounded-md bg-zinc-100 text-zinc-900 text-sm px-3">Add track</button>
            </div>
          </GovernedStep>
        </div>
        <div>
          <OrderChecklist releaseId={releaseId} steps={steps} onOverridden={load} />
        </div>
      </div>
    </div>
  );
}
