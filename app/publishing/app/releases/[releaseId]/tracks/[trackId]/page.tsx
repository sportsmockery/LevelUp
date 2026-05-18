'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '../../../../_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { Track, TrackWriter, TrackPublisher, WriterProfile, PublisherProfile, WriterRole, ApprovalStatus } from '@/types/catalog';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';

export default function TrackDetailPage() {
  const params = useParams<{ releaseId: string; trackId: string }>();
  const { releaseId, trackId } = params;
  const { activeOrgId } = useOrg();
  const [track, setTrack] = useState<Track | null>(null);
  const [writers, setWriters] = useState<WriterProfile[]>([]);
  const [publishers, setPublishers] = useState<PublisherProfile[]>([]);
  const [trackWriters, setTrackWriters] = useState<TrackWriter[]>([]);
  const [trackPublishers, setTrackPublishers] = useState<TrackPublisher[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!trackId || !activeOrgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    const [{ data: trk }, { data: wp }, { data: pp }, { data: tw }, { data: tp }] = await Promise.all([
      sb.from('tracks').select('*').eq('id', trackId).maybeSingle(),
      sb.from('writer_profiles').select('*').eq('org_id', activeOrgId).order('legal_name'),
      sb.from('publisher_profiles').select('*').eq('org_id', activeOrgId).order('publisher_name'),
      sb.from('track_writers').select('*').eq('track_id', trackId),
      sb.from('track_publishers').select('*').eq('track_id', trackId),
    ]);
    setTrack((trk as Track) ?? null);
    setWriters((wp as WriterProfile[]) ?? []);
    setPublishers((pp as PublisherProfile[]) ?? []);
    setTrackWriters((tw as TrackWriter[]) ?? []);
    setTrackPublishers((tp as TrackPublisher[]) ?? []);
  }, [trackId, activeOrgId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (!track) return <div className="pt-12 text-white/50 text-sm">Loading…</div>;

  return (
    <div className="space-y-10 pt-2">
      <header>
        <Link href={`/publishing/app/releases/${releaseId}`} className="text-xs text-white/50 hover:text-white">← back to release</Link>
        <h1 className="font-heading text-3xl font-bold mt-2">{track.track_title}</h1>
        <p className="text-white/60 text-sm mt-1">Track metadata, splits, and credits.</p>
      </header>

      <TrackMetadataSection track={track} onSaved={() => setRefreshKey((k) => k + 1)} />

      <GovernedStep
        title="Writer splits — must sum to 100%"
        whatThisIs="Every songwriter who contributed to this song. The system blocks exports until the total writer share equals exactly 100%."
        whyItMatters="PROs and the MLC will pay royalties forever using whatever splits you register. Wrong splits = lifelong wrong payments."
        whatYouNeed={['Each writer\'s profile already created (Writers page)', 'Role (composer / lyricist / both)', 'Each writer\'s percentage of the writer-side']}
        estimatedTime="~3 minutes per writer"
        commonMistakes={[
          'Defaulting to equal splits when contributions weren\'t equal.',
          'Forgetting to capture the writer\'s approval. Get them to sign off before generating exports.',
          'Confusing writer share (this) with publisher share (separate).',
        ]}
      >
        <SplitManager
          trackId={trackId}
          writers={writers}
          rows={trackWriters}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      </GovernedStep>

      <TrainingBlock topic="writer_share" />
      <TrainingBlock topic="split_sheet" />

      <GovernedStep
        title="Publisher splits — must sum to 100%"
        whatThisIs="The publisher-side of the song. Allocate to publishing entities (typically one per writer, often a writer's own self-publishing entity)."
        whyItMatters="The publisher share (50% of total) is paid to publishers. Without a registered publisher this side is forfeited."
        whatYouNeed={['Publisher profiles created (Writers page)', 'Each publisher\'s percentage of the publisher-side']}
        estimatedTime="~2 minutes per publisher"
        commonMistakes={[
          'Forgetting to add a publisher entity for a self-published writer.',
          'Splitting the publisher share differently than the writer share without a written admin agreement explaining why.',
        ]}
      >
        <PublisherSplitManager
          trackId={trackId}
          publishers={publishers}
          rows={trackPublishers}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      </GovernedStep>

      <TrainingBlock topic="publisher_share" />
    </div>
  );
}

function TrackMetadataSection({ track, onSaved }: { track: Track; onSaved: () => void }) {
  const [form, setForm] = useState({
    track_title: track.track_title,
    duration_ms: track.duration_ms ?? 0,
    isrc: track.isrc ?? '',
    iswc: track.iswc ?? '',
    language: track.language ?? 'en',
    explicit: track.explicit,
    instrumental: track.instrumental,
    bpm: track.bpm ?? 0,
    musical_key: track.musical_key ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    setSaving(true);
    try {
      const sb = getBrowserClient();
      if (!sb) throw new Error('No supabase client');
      const { error } = await sb.from('tracks').update(form).eq('id', track.id);
      if (error) throw error;
      onSaved();
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
      <h2 className="font-heading text-xl font-semibold">Track metadata</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Title"><input value={form.track_title} onChange={(e) => setForm({ ...form, track_title: e.target.value })} className="inp" /></Field>
        <Field label="Duration (ms)"><input type="number" value={form.duration_ms} onChange={(e) => setForm({ ...form, duration_ms: Number(e.target.value) })} className="inp" /></Field>
        <Field label="ISRC"><input value={form.isrc} onChange={(e) => setForm({ ...form, isrc: e.target.value.toUpperCase() })} placeholder="USAB12600001" className="inp font-mono" /></Field>
        <Field label="ISWC"><input value={form.iswc} onChange={(e) => setForm({ ...form, iswc: e.target.value })} placeholder="T-123456789-1" className="inp font-mono" /></Field>
        <Field label="Language"><input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="inp" /></Field>
        <Field label="BPM"><input type="number" value={form.bpm} onChange={(e) => setForm({ ...form, bpm: Number(e.target.value) })} className="inp" /></Field>
        <Field label="Key"><input value={form.musical_key} onChange={(e) => setForm({ ...form, musical_key: e.target.value })} className="inp" /></Field>
        <Field label="Explicit">
          <label className="flex items-center gap-2 text-sm pt-2">
            <input type="checkbox" checked={form.explicit} onChange={(e) => setForm({ ...form, explicit: e.target.checked })} />
            <span>Contains explicit content</span>
          </label>
        </Field>
        <Field label="Instrumental">
          <label className="flex items-center gap-2 text-sm pt-2">
            <input type="checkbox" checked={form.instrumental} onChange={(e) => setForm({ ...form, instrumental: e.target.checked })} />
            <span>No vocals</span>
          </label>
        </Field>
      </div>
      {err && <div className="text-red-300 text-sm">{err}</div>}
      <button onClick={save} disabled={saving} className="rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium hover:bg-emerald-300 disabled:opacity-40">
        {saving ? 'Saving…' : 'Save metadata'}
      </button>
      <style jsx>{`.inp { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; width: 100%; color: inherit; }`}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function SplitManager({ trackId, writers, rows, onChanged }: { trackId: string; writers: WriterProfile[]; rows: TrackWriter[]; onChanged: () => void }) {
  const [adding, setAdding] = useState({ writer_profile_id: '', role: 'composer_lyricist' as WriterRole, share_percent: 0 });
  const total = rows.reduce((a, r) => a + Number(r.share_percent ?? 0), 0);

  const add = async () => {
    if (!adding.writer_profile_id || adding.share_percent <= 0) return;
    const sb = getBrowserClient();
    if (!sb) return;
    const { error } = await sb.from('track_writers').insert({
      track_id: trackId,
      writer_profile_id: adding.writer_profile_id,
      role: adding.role,
      share_percent: adding.share_percent,
      approval_status: 'pending',
    });
    if (error) return alert(error.message);
    setAdding({ writer_profile_id: '', role: 'composer_lyricist', share_percent: 0 });
    onChanged();
  };

  const setApproval = async (rowId: string, status: ApprovalStatus) => {
    const sb = getBrowserClient();
    if (!sb) return;
    const { error } = await sb.from('track_writers').update({ approval_status: status, approved_at: status === 'approved' ? new Date().toISOString() : null }).eq('id', rowId);
    if (error) return alert(error.message);
    onChanged();
  };

  const remove = async (rowId: string) => {
    if (!confirm('Remove this writer split?')) return;
    const sb = getBrowserClient();
    if (!sb) return;
    await sb.from('track_writers').delete().eq('id', rowId);
    onChanged();
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && <p className="text-sm text-white/50">No writers added yet.</p>}
      {rows.map((r) => {
        const w = writers.find((x) => x.id === r.writer_profile_id);
        return (
          <div key={r.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{w?.legal_name ?? 'Unknown writer'} <span className="text-white/40 text-xs">· {r.role.replace('_', ' / ')}</span></div>
              <div className="text-xs text-white/55 mt-0.5">PRO {w?.pro ?? '—'} · IPI {w?.ipi_number ?? '—'}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg">{Number(r.share_percent).toFixed(2)}%</span>
              <select value={r.approval_status} onChange={(e) => setApproval(r.id, e.target.value as ApprovalStatus)} className="text-xs bg-white/5 border border-white/15 rounded px-2 py-1">
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="needs_changes">needs changes</option>
              </select>
              <button onClick={() => remove(r.id)} className="text-xs text-red-300 hover:underline">remove</button>
            </div>
          </div>
        );
      })}

      <div className={'flex items-center justify-between border-t border-white/10 pt-3 ' + (Math.abs(total - 100) < 0.01 ? 'text-emerald-300' : 'text-amber-300')}>
        <span className="text-sm font-medium">Total writer share</span>
        <span className="font-mono text-lg">{total.toFixed(2)}% {Math.abs(total - 100) < 0.01 ? '✓' : '(must equal 100%)'}</span>
      </div>

      <div className="grid md:grid-cols-4 gap-2 items-end pt-3">
        <Field label="Writer">
          <select value={adding.writer_profile_id} onChange={(e) => setAdding({ ...adding, writer_profile_id: e.target.value })} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm">
            <option value="">— select —</option>
            {writers.map((w) => <option key={w.id} value={w.id}>{w.legal_name}</option>)}
          </select>
        </Field>
        <Field label="Role">
          <select value={adding.role} onChange={(e) => setAdding({ ...adding, role: e.target.value as WriterRole })} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm">
            <option value="composer">Composer (music)</option>
            <option value="lyricist">Lyricist (lyrics)</option>
            <option value="composer_lyricist">Both</option>
          </select>
        </Field>
        <Field label="Share %">
          <input type="number" step="0.01" value={adding.share_percent} onChange={(e) => setAdding({ ...adding, share_percent: Number(e.target.value) })} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm font-mono" />
        </Field>
        <button onClick={add} disabled={!adding.writer_profile_id || adding.share_percent <= 0} className="rounded-full bg-emerald-400 text-black px-4 py-2 text-sm font-medium hover:bg-emerald-300 disabled:opacity-40">
          Add writer
        </button>
      </div>
    </div>
  );
}

function PublisherSplitManager({ trackId, publishers, rows, onChanged }: { trackId: string; publishers: PublisherProfile[]; rows: TrackPublisher[]; onChanged: () => void }) {
  const [adding, setAdding] = useState({ publisher_profile_id: '', share_percent: 0 });
  const total = rows.reduce((a, r) => a + Number(r.share_percent ?? 0), 0);

  const add = async () => {
    if (!adding.publisher_profile_id || adding.share_percent <= 0) return;
    const sb = getBrowserClient();
    if (!sb) return;
    const { error } = await sb.from('track_publishers').insert({ track_id: trackId, ...adding });
    if (error) return alert(error.message);
    setAdding({ publisher_profile_id: '', share_percent: 0 });
    onChanged();
  };

  const remove = async (rowId: string) => {
    if (!confirm('Remove this publisher split?')) return;
    const sb = getBrowserClient();
    if (!sb) return;
    await sb.from('track_publishers').delete().eq('id', rowId);
    onChanged();
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && <p className="text-sm text-white/50">No publishers added yet.</p>}
      {rows.map((r) => {
        const p = publishers.find((x) => x.id === r.publisher_profile_id);
        return (
          <div key={r.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{p?.publisher_name ?? 'Unknown publisher'}</div>
              <div className="text-xs text-white/55 mt-0.5">PRO {p?.pro ?? '—'} · IPI {p?.ipi_number ?? '—'}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg">{Number(r.share_percent).toFixed(2)}%</span>
              <button onClick={() => remove(r.id)} className="text-xs text-red-300 hover:underline">remove</button>
            </div>
          </div>
        );
      })}

      <div className={'flex items-center justify-between border-t border-white/10 pt-3 ' + (Math.abs(total - 100) < 0.01 ? 'text-emerald-300' : 'text-amber-300')}>
        <span className="text-sm font-medium">Total publisher share</span>
        <span className="font-mono text-lg">{total.toFixed(2)}% {Math.abs(total - 100) < 0.01 ? '✓' : '(must equal 100%)'}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-2 items-end pt-3">
        <Field label="Publisher">
          <select value={adding.publisher_profile_id} onChange={(e) => setAdding({ ...adding, publisher_profile_id: e.target.value })} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm">
            <option value="">— select —</option>
            {publishers.map((p) => <option key={p.id} value={p.id}>{p.publisher_name}</option>)}
          </select>
        </Field>
        <Field label="Share %">
          <input type="number" step="0.01" value={adding.share_percent} onChange={(e) => setAdding({ ...adding, share_percent: Number(e.target.value) })} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm font-mono" />
        </Field>
        <button onClick={add} disabled={!adding.publisher_profile_id || adding.share_percent <= 0} className="rounded-full bg-emerald-400 text-black px-4 py-2 text-sm font-medium hover:bg-emerald-300 disabled:opacity-40">
          Add publisher
        </button>
      </div>
    </div>
  );
}
