'use client';

import { useEffect, useState } from 'react';
import type { WriterProfile, PublisherProfile, TrackWriter, TrackPublisher } from '@/types/catalog';

export interface SplitManagerProps {
  trackId: string;
  orgId: string;
}

const WRITER_ROLES = ['composer', 'lyricist', 'composer_lyricist'];

export function SplitManager({ trackId, orgId }: SplitManagerProps) {
  const [writerProfiles, setWriterProfiles] = useState<WriterProfile[]>([]);
  const [publisherProfiles, setPublisherProfiles] = useState<PublisherProfile[]>([]);
  const [writers, setWriters] = useState<Partial<TrackWriter>[]>([]);
  const [publishers, setPublishers] = useState<Partial<TrackPublisher>[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/music/writers?org=${orgId}`).then((r) => r.json()).then((d) => setWriterProfiles(d.writers ?? []));
    fetch(`/api/music/publishers?org=${orgId}`).then((r) => r.json()).then((d) => setPublisherProfiles(d.publishers ?? []));
    fetch(`/api/music/tracks/${trackId}/writers`).then((r) => r.json()).then((d) => setWriters(d.writers ?? []));
    fetch(`/api/music/tracks/${trackId}/publishers`).then((r) => r.json()).then((d) => setPublishers(d.publishers ?? []));
  }, [trackId, orgId]);

  const wTotal = writers.reduce((s, w) => s + Number(w.share_percent || 0), 0);
  const pTotal = publishers.reduce((s, p) => s + Number(p.share_percent || 0), 0);
  const wValid = Math.round(wTotal * 1000) === 100000;
  const pValid = publishers.length === 0 || Math.round(pTotal * 1000) === 100000;

  async function save() {
    setError(null);
    if (!wValid) { setError(`Writer splits total ${wTotal.toFixed(2)}% (must equal 100%)`); return; }
    if (!pValid) { setError(`Publisher splits total ${pTotal.toFixed(2)}% (must equal 100%)`); return; }
    setSaving(true);
    const wRes = await fetch(`/api/music/tracks/${trackId}/writers`, {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ writers }),
    });
    if (!wRes.ok) { setError((await wRes.json()).error); setSaving(false); return; }
    const pRes = await fetch(`/api/music/tracks/${trackId}/publishers`, {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publishers }),
    });
    if (!pRes.ok) { setError((await pRes.json()).error); setSaving(false); return; }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="font-medium mb-2 flex justify-between">
          Writer splits
          <span className={wValid ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
            Total {wTotal.toFixed(3)}%
          </span>
        </h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500">
            <tr><th className="text-left">Writer</th><th className="text-left">Role</th><th className="text-right">Share %</th><th>Approval</th><th></th></tr>
          </thead>
          <tbody>
            {writers.map((w, i) => (
              <tr key={i} className="border-t border-zinc-800">
                <td>
                  <select value={w.writer_profile_id ?? ''}
                    onChange={(e) => setWriters((ws) => ws.map((x, j) => j === i ? { ...x, writer_profile_id: e.target.value } : x))}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs">
                    <option value="">— select writer —</option>
                    {writerProfiles.map((p) => <option key={p.id} value={p.id}>{p.legal_name}</option>)}
                  </select>
                </td>
                <td>
                  <select value={w.role ?? 'composer_lyricist'}
                    onChange={(e) => setWriters((ws) => ws.map((x, j) => j === i ? { ...x, role: e.target.value as TrackWriter['role'] } : x))}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs">
                    {WRITER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td>
                  <input type="number" step="0.001" min="0" max="100"
                    value={w.share_percent ?? 0}
                    onChange={(e) => setWriters((ws) => ws.map((x, j) => j === i ? { ...x, share_percent: Number(e.target.value) } : x))}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs w-20 text-right" />
                </td>
                <td className="text-center">
                  <select value={w.approval_status ?? 'pending'}
                    onChange={(e) => setWriters((ws) => ws.map((x, j) => j === i ? { ...x, approval_status: e.target.value as TrackWriter['approval_status'] } : x))}
                    className="bg-zinc-900 border border-zinc-700 rounded px-1 py-1 text-xs">
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="needs_changes">needs changes</option>
                    <option value="rejected">rejected</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => setWriters((ws) => ws.filter((_, j) => j !== i))}
                    className="text-rose-400 text-xs">remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setWriters((ws) => [...ws, { writer_profile_id: null, role: 'composer_lyricist', share_percent: 0, approval_status: 'pending' }])}
          className="text-xs text-zinc-300 underline mt-2">+ add writer</button>
      </section>

      <section>
        <h3 className="font-medium mb-2 flex justify-between">
          Publisher splits
          <span className={pValid ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
            Total {pTotal.toFixed(3)}%
          </span>
        </h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500">
            <tr><th className="text-left">Publisher</th><th className="text-right">Share %</th><th></th></tr>
          </thead>
          <tbody>
            {publishers.map((p, i) => (
              <tr key={i} className="border-t border-zinc-800">
                <td>
                  <select value={p.publisher_profile_id ?? ''}
                    onChange={(e) => setPublishers((ps) => ps.map((x, j) => j === i ? { ...x, publisher_profile_id: e.target.value } : x))}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs">
                    <option value="">— select publisher —</option>
                    {publisherProfiles.map((pp) => <option key={pp.id} value={pp.id}>{pp.publisher_name}</option>)}
                  </select>
                </td>
                <td>
                  <input type="number" step="0.001" min="0" max="100"
                    value={p.share_percent ?? 0}
                    onChange={(e) => setPublishers((ps) => ps.map((x, j) => j === i ? { ...x, share_percent: Number(e.target.value) } : x))}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs w-20 text-right" />
                </td>
                <td>
                  <button onClick={() => setPublishers((ps) => ps.filter((_, j) => j !== i))}
                    className="text-rose-400 text-xs">remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setPublishers((ps) => [...ps, { publisher_profile_id: null, share_percent: 0 }])}
          className="text-xs text-zinc-300 underline mt-2">+ add publisher</button>
      </section>

      {error && <p className="text-rose-400 text-sm">{error}</p>}
      <button onClick={save} disabled={saving}
        className="rounded-md bg-zinc-100 text-zinc-900 text-sm px-4 py-1.5 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save splits'}
      </button>
    </div>
  );
}
