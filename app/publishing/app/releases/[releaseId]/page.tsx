'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useOrg } from '../../_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { Release, Track } from '@/types/catalog';
import { ArtworkUploader } from '@/components/music/ArtworkUploader';

interface StepState {
  id: string;
  title: string;
  blurb: string;
  status: 'locked' | 'pending' | 'completed' | 'overridden';
  missing: string[];
  override?: { reason: string; by: string; at: string };
}

export default function ReleaseDetailPage() {
  const router = useRouter();
  const params = useParams<{ releaseId: string }>();
  const releaseId = params.releaseId;
  const { activeOrgId } = useOrg();
  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [checklist, setChecklist] = useState<StepState[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showOverride, setShowOverride] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (!releaseId || !activeOrgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    (async () => {
      const [{ data: rel }, { data: trk }] = await Promise.all([
        sb.from('releases').select('*').eq('id', releaseId).maybeSingle(),
        sb.from('tracks').select('*').eq('release_id', releaseId).order('track_number'),
      ]);
      setRelease((rel as Release) ?? null);
      setTracks((trk as Track[]) ?? []);
    })();

    fetch(`/api/publishing/releases/${releaseId}/checklist`)
      .then((r) => r.json())
      .then((j) => setChecklist(j.checklist ?? []));
  }, [releaseId, activeOrgId, refreshKey]);

  const addTrack = async () => {
    if (!activeOrgId || !releaseId) return;
    const title = prompt('Track title?');
    if (!title) return;
    const sb = getBrowserClient();
    if (!sb) return;
    const { data, error } = await sb
      .from('tracks')
      .insert({ org_id: activeOrgId, release_id: releaseId, track_title: title, track_number: tracks.length + 1 })
      .select('id')
      .single();
    if (error) return alert(error.message);
    router.push(`/publishing/app/releases/${releaseId}/tracks/${data.id}`);
  };

  const submitOverride = async (stepId: string) => {
    if (!overrideReason.trim()) return;
    const res = await fetch(`/api/publishing/releases/${releaseId}/override`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: stepId, reason: overrideReason }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert('Override failed: ' + (j.error ?? res.statusText));
      return;
    }
    setShowOverride(null);
    setOverrideReason('');
    setRefreshKey((k) => k + 1);
  };

  if (!release) return <div className="pt-12 text-white/50 text-sm">Loading release…</div>;

  return (
    <div className="space-y-8 pt-2">
      <header>
        <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{release.release_type}</div>
        <h1 className="font-heading text-3xl font-bold">{release.release_title}</h1>
        <p className="text-white/60 text-sm mt-1">{release.primary_artist}</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-heading text-lg font-semibold">Tracks ({tracks.length})</h2>
              <button onClick={addTrack} className="text-xs rounded-full bg-emerald-400 text-black px-4 py-1.5 font-medium hover:bg-emerald-300">
                Add track
              </button>
            </div>
            {tracks.length === 0 ? (
              <p className="text-sm text-white/50">No tracks yet.</p>
            ) : (
              <ul className="space-y-2">
                {tracks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/publishing/app/releases/${release.id}/tracks/${t.id}`}
                      className="flex justify-between items-center rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.05]"
                    >
                      <div>
                        <span className="text-white/40 font-mono text-xs mr-3">{(t.track_number ?? 0).toString().padStart(2, '0')}</span>
                        <span className="text-sm font-medium">{t.track_title}</span>
                      </div>
                      <span className="text-xs text-white/45 font-mono">{t.isrc ?? 'no ISRC'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-heading text-lg font-semibold mb-3">Artwork</h2>
            <ArtworkUploader
              releaseId={release.id}
              currentPath={release.artwork_path}
              onUploaded={(path) => {
                setRelease({ ...release, artwork_path: path });
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm">
            <h2 className="font-heading text-lg font-semibold mb-3">Metadata</h2>
            <dl className="grid grid-cols-2 gap-y-2 gap-x-6">
              <dt className="text-white/45">UPC</dt><dd className="font-mono">{release.upc ?? '—'}</dd>
              <dt className="text-white/45">Catalog #</dt><dd className="font-mono">{release.catalog_number ?? '—'}</dd>
              <dt className="text-white/45">Release date</dt><dd>{release.release_date ?? '—'}</dd>
              <dt className="text-white/45">Label</dt><dd>{release.label_name ?? '—'}</dd>
              <dt className="text-white/45">Distributor</dt><dd>{release.distributor ?? '—'}</dd>
              <dt className="text-white/45">℗</dt><dd>{release.copyright_year} {release.p_line}</dd>
              <dt className="text-white/45">©</dt><dd>{release.copyright_year} {release.c_line}</dd>
            </dl>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-heading text-lg font-semibold mb-3">Checklist</h2>
          <ol className="space-y-2 text-sm">
            {checklist.map((s, i) => (
              <li key={s.id} className="rounded-lg border border-white/10 p-3" style={{ background: s.status === 'completed' ? 'rgba(16,185,129,0.06)' : s.status === 'overridden' ? 'rgba(245,158,11,0.06)' : s.status === 'locked' ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3">
                    <span className="font-mono text-xs text-white/40 pt-0.5">{(i + 1).toString().padStart(2, '0')}</span>
                    <div>
                      <div className="font-medium">{s.title.replace(/^\d+\.\s*/, '')}</div>
                      <div className="text-xs text-white/55 mt-0.5">{s.blurb}</div>
                      {s.status === 'locked' && s.missing.length > 0 && (
                        <div className="text-[11px] text-white/40 mt-1">Waiting on: {s.missing.join(', ')}</div>
                      )}
                      {s.status === 'overridden' && s.override && (
                        <div className="text-[11px] text-amber-200 mt-1">Override: "{s.override.reason}"</div>
                      )}
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </div>
                {s.status === 'pending' && (
                  showOverride === s.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Why did you complete this outside the system?"
                        className="w-full bg-white/5 border border-white/15 rounded-md p-2 text-xs"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => submitOverride(s.id)} className="text-xs rounded bg-amber-500 text-black px-3 py-1 font-medium">Save override</button>
                        <button onClick={() => { setShowOverride(null); setOverrideReason(''); }} className="text-xs text-white/60">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowOverride(s.id)} className="text-[11px] text-amber-300 hover:underline mt-2">
                      Mark completed outside system →
                    </button>
                  )
                )}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: StepState['status'] }) {
  const map = {
    completed: ['bg-emerald-400/15 text-emerald-200 border-emerald-400/30', 'done'],
    pending: ['bg-white/5 text-white/70 border-white/15', 'ready'],
    locked: ['bg-white/[0.02] text-white/35 border-white/10', 'locked'],
    overridden: ['bg-amber-500/15 text-amber-200 border-amber-400/30', 'override'],
  } as const;
  const [cls, label] = map[status];
  return <span className={'text-[10px] uppercase tracking-wider px-2 py-1 rounded border whitespace-nowrap ' + cls}>{label}</span>;
}
