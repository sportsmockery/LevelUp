'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrg } from '../_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { ISRCCode, ISRCStatus, Track } from '@/types/catalog';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';

const ISRC_REGEX = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

export default function ISRCPage() {
  const { activeOrgId } = useOrg();
  const [codes, setCodes] = useState<ISRCCode[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | ISRCStatus>('all');

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    const [{ data: c }, { data: t }] = await Promise.all([
      sb.from('isrc_codes').select('*').eq('org_id', activeOrgId).order('isrc_code'),
      sb.from('tracks').select('id,track_title,release_id').eq('org_id', activeOrgId).order('track_title'),
    ]);
    setCodes((c as ISRCCode[]) ?? []);
    setTracks((t as Track[]) ?? []);
  }, [activeOrgId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const filtered = useMemo(
    () => codes.filter((c) => statusFilter === 'all' || c.status === statusFilter),
    [codes, statusFilter],
  );

  return (
    <div className="space-y-10 pt-2">
      <header>
        <h1 className="font-heading text-3xl font-bold">ISRC ledger</h1>
        <p className="text-white/60 text-sm mt-1">Step 8 — manage and assign International Standard Recording Codes.</p>
      </header>

      <GovernedStep
        title="What an ISRC is and why it has to be unique"
        whatThisIs="A 12-character code identifying one specific master recording, e.g. USAB12600001. Every unique recording — including remixes, edits, and remasters — needs its own ISRC."
        whyItMatters="Distributors, streaming services, and SoundExchange use the ISRC to track plays and route royalties to the master owner. A recording without an ISRC may not get tracked or paid."
        whatYouNeed={['A registrant code (e.g. AB1 — assigned by your country\'s ISRC agency)', 'Two-letter country code (US, GB, etc.)', 'Year (2-digit)', '5-digit designation (sequential per year)']}
        estimatedTime="~30 seconds per ISRC"
        commonMistakes={[
          'Reusing an ISRC across a single + remaster + remix. They must each be unique.',
          'Lowercase letters. ISRC must be uppercase.',
          'Buying ISRCs from your distributor and then losing access when you switch distributors.',
        ]}
      >
        <SingleAdd orgId={activeOrgId} tracks={tracks} onAdded={() => setRefreshKey((k) => k + 1)} />
      </GovernedStep>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-heading text-xl font-semibold mb-1">Bulk paste</h2>
        <p className="text-sm text-white/60 mb-3">One ISRC per line. Lines that don’t match the format are skipped.</p>
        <BulkPaste orgId={activeOrgId} onAdded={() => setRefreshKey((k) => k + 1)} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-heading text-xl font-semibold">All ISRCs ({codes.length})</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-white/5 border border-white/15 rounded-md px-3 py-1.5 text-sm">
            <option value="all">All statuses</option>
            <option value="reserved">Reserved</option>
            <option value="assigned">Assigned</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-white/50">None match this filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-white/45 text-[10px] uppercase tracking-wider">
              <tr><th className="py-2">ISRC</th><th className="py-2">Status</th><th className="py-2">Assigned track</th><th className="py-2"></th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((c) => <ISRCRow key={c.id} code={c} tracks={tracks} onChanged={() => setRefreshKey((k) => k + 1)} />)}
            </tbody>
          </table>
        )}
      </section>

      <TrainingBlock topic="isrc" />
      <TrainingBlock topic="iswc" />
    </div>
  );
}

function SingleAdd({ orgId, tracks, onAdded }: { orgId: string | null; tracks: Track[]; onAdded: () => void }) {
  const [form, setForm] = useState({ isrc_code: '', track_id: '', status: 'reserved' as ISRCStatus });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!orgId) return;
    const code = form.isrc_code.trim().toUpperCase();
    if (!ISRC_REGEX.test(code)) {
      setErr('Invalid ISRC format. Expected: 2 letters + 3 alphanumeric + 7 digits, e.g. USAB12600001');
      return;
    }
    setBusy(true);
    try {
      const sb = getBrowserClient();
      if (!sb) throw new Error('no client');
      const payload: any = {
        org_id: orgId,
        isrc_code: code,
        status: form.status,
        country_code: code.slice(0, 2),
        registrant_code: code.slice(2, 5),
        year: parseInt(code.slice(5, 7), 10),
        designation_code: code.slice(7),
      };
      if (form.track_id) {
        payload.track_id = form.track_id;
        payload.status = 'assigned';
        payload.assigned_date = new Date().toISOString().slice(0, 10);
      }
      const { error } = await sb.from('isrc_codes').insert(payload);
      if (error) throw error;
      // If a track was chosen, also persist the ISRC onto the track itself.
      if (form.track_id) {
        await sb.from('tracks').update({ isrc: code }).eq('id', form.track_id);
      }
      setForm({ isrc_code: '', track_id: '', status: 'reserved' });
      onAdded();
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid md:grid-cols-4 gap-3 items-end max-w-3xl">
      <label className="block md:col-span-2">
        <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">ISRC code</span>
        <input value={form.isrc_code} onChange={(e) => setForm({ ...form, isrc_code: e.target.value.toUpperCase() })} placeholder="USAB12600001" className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm font-mono" />
      </label>
      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">Assign to track (optional)</span>
        <select value={form.track_id} onChange={(e) => setForm({ ...form, track_id: e.target.value })} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm">
          <option value="">— reserve only —</option>
          {tracks.map((t) => <option key={t.id} value={t.id}>{t.track_title}</option>)}
        </select>
      </label>
      <button onClick={submit} disabled={busy} className="rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium hover:bg-emerald-300 disabled:opacity-40">
        {busy ? 'Adding…' : 'Add ISRC'}
      </button>
      {err && <div className="md:col-span-4 text-red-300 text-sm">{err}</div>}
    </div>
  );
}

function BulkPaste({ orgId, onAdded }: { orgId: string | null; onAdded: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ added: number; skipped: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => {
    return text
      .split(/\r?\n/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }, [text]);

  const submit = async () => {
    if (!orgId) return;
    setBusy(true);
    const valid: string[] = [];
    const skipped: string[] = [];
    for (const code of parsed) {
      if (ISRC_REGEX.test(code)) valid.push(code);
      else skipped.push(code);
    }
    try {
      const sb = getBrowserClient();
      if (!sb) throw new Error('no client');
      if (valid.length > 0) {
        const rows = valid.map((code) => ({
          org_id: orgId,
          isrc_code: code,
          status: 'reserved' as const,
          country_code: code.slice(0, 2),
          registrant_code: code.slice(2, 5),
          year: parseInt(code.slice(5, 7), 10),
          designation_code: code.slice(7),
        }));
        const { error } = await sb.from('isrc_codes').upsert(rows, { onConflict: 'org_id,isrc_code', ignoreDuplicates: true });
        if (error) throw error;
      }
      setResult({ added: valid.length, skipped });
      setText('');
      onAdded();
    } catch (e: any) {
      setResult({ added: 0, skipped: [e.message ?? String(e)] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={'USAB12600001\nUSAB12600002\nUSAB12600003'}
        className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm font-mono"
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/55">{parsed.length} line{parsed.length === 1 ? '' : 's'} to import</div>
        <button onClick={submit} disabled={busy || parsed.length === 0} className="rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium hover:bg-emerald-300 disabled:opacity-40">
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>
      {result && (
        <div className="text-xs space-y-1 pt-2">
          <div className="text-emerald-300">Added: {result.added}</div>
          {result.skipped.length > 0 && (
            <div className="text-amber-300">Skipped: {result.skipped.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ISRCRow({ code, tracks, onChanged }: { code: ISRCCode; tracks: Track[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const assignedTrack = tracks.find((t) => t.id === code.track_id);

  const assignTo = async (trackId: string) => {
    setBusy(true);
    try {
      const sb = getBrowserClient();
      if (!sb) return;
      if (trackId === '') {
        await sb.from('isrc_codes').update({ track_id: null, status: 'reserved', assigned_date: null }).eq('id', code.id);
      } else {
        await sb.from('isrc_codes').update({ track_id: trackId, status: 'assigned', assigned_date: new Date().toISOString().slice(0, 10) }).eq('id', code.id);
        await sb.from('tracks').update({ isrc: code.isrc_code }).eq('id', trackId);
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const retire = async () => {
    if (!confirm('Mark this ISRC as retired? It will not be available for future assignment.')) return;
    setBusy(true);
    const sb = getBrowserClient();
    if (sb) await sb.from('isrc_codes').update({ status: 'retired' }).eq('id', code.id);
    setBusy(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm('Delete this ISRC entry from the ledger?')) return;
    const sb = getBrowserClient();
    if (sb) await sb.from('isrc_codes').delete().eq('id', code.id);
    onChanged();
  };

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="py-2 font-mono">{code.isrc_code}</td>
      <td className="py-2">
        <span className={'text-[10px] uppercase px-2 py-0.5 rounded border ' + (
          code.status === 'assigned' ? 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30' :
          code.status === 'retired' ? 'bg-white/5 text-white/45 border-white/10' :
          'bg-amber-400/15 text-amber-200 border-amber-400/30'
        )}>{code.status}</span>
      </td>
      <td className="py-2">
        <select disabled={busy || code.status === 'retired'} value={code.track_id ?? ''} onChange={(e) => assignTo(e.target.value)} className="bg-white/5 border border-white/15 rounded-md px-2 py-1 text-xs max-w-[240px] disabled:opacity-50">
          <option value="">— unassigned —</option>
          {tracks.map((t) => <option key={t.id} value={t.id}>{t.track_title}</option>)}
        </select>
        {assignedTrack && code.status === 'assigned' && (
          <span className="text-[10px] text-white/40 ml-2">→ {assignedTrack.track_title}</span>
        )}
      </td>
      <td className="py-2 text-right space-x-3">
        {code.status !== 'retired' && <button onClick={retire} className="text-xs text-amber-300 hover:underline">retire</button>}
        <button onClick={remove} className="text-xs text-red-300 hover:underline">delete</button>
      </td>
    </tr>
  );
}
