'use client';

// Collaborator approval page. Lists track_writers rows where the writer_profile.email
// matches the signed-in user, with pending/needs_changes status, lets them approve/reject.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '../_org-context';
import { useAuth } from '@/contexts/AuthContext';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { ApprovalStatus, ReleaseType } from '@/types/catalog';

interface Pending {
  id: string;
  role: string;
  share_percent: number;
  approval_status: ApprovalStatus;
  track: { id: string; title: string; release_id: string };
  release: { id: string; title: string; type: ReleaseType; primary_artist: string | null };
  writer: { id: string; legal_name: string; email: string | null; ipi_number: string | null };
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { activeOrgId } = useOrg();
  const [items, setItems] = useState<Pending[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeOrgId || !user?.email) { setItems([]); return; }
    setLoading(true);
    try {
      const sb = getBrowserClient();
      if (!sb) return;
      // Writer profiles in this org whose email matches the signed-in user.
      const { data: writers } = await sb
        .from('writer_profiles')
        .select('id,legal_name,email,ipi_number')
        .eq('org_id', activeOrgId)
        .ilike('email', user.email);
      const writerIds = (writers ?? []).map((w) => w.id);
      if (writerIds.length === 0) { setItems([]); return; }

      const { data: rows } = await sb
        .from('track_writers')
        .select('id, role, share_percent, approval_status, writer_profile_id, track_id')
        .in('writer_profile_id', writerIds);

      const trackIds = Array.from(new Set((rows ?? []).map((r) => r.track_id)));
      if (trackIds.length === 0) { setItems([]); return; }

      const { data: tracks } = await sb
        .from('tracks')
        .select('id, track_title, release_id')
        .in('id', trackIds);
      const trackById = new Map((tracks ?? []).map((t) => [t.id, t]));

      const releaseIds = Array.from(new Set((tracks ?? []).map((t) => t.release_id)));
      const { data: releases } = await sb
        .from('releases')
        .select('id, release_title, release_type, primary_artist')
        .in('id', releaseIds);
      const releaseById = new Map((releases ?? []).map((r) => [r.id, r]));
      const writerById = new Map((writers ?? []).map((w) => [w.id, w]));

      const out: Pending[] = (rows ?? []).map((r) => {
        const t = trackById.get(r.track_id);
        const rel = t ? releaseById.get(t.release_id) : null;
        const w = writerById.get(r.writer_profile_id);
        return {
          id: r.id,
          role: r.role,
          share_percent: Number(r.share_percent),
          approval_status: r.approval_status as ApprovalStatus,
          track: { id: r.track_id, title: t?.track_title ?? 'Unknown track', release_id: t?.release_id ?? '' },
          release: { id: rel?.id ?? '', title: rel?.release_title ?? 'Unknown release', type: (rel?.release_type as ReleaseType) ?? 'single', primary_artist: rel?.primary_artist ?? null },
          writer: { id: w?.id ?? '', legal_name: w?.legal_name ?? '', email: w?.email ?? null, ipi_number: w?.ipi_number ?? null },
        };
      });
      // Sort: pending/needs_changes first, then approved/rejected
      out.sort((a, b) => {
        const rank = (s: ApprovalStatus) => s === 'pending' ? 0 : s === 'needs_changes' ? 1 : s === 'approved' ? 2 : 3;
        return rank(a.approval_status) - rank(b.approval_status);
      });
      setItems(out);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, user?.email]);

  useEffect(() => { load(); }, [load, refresh]);

  const respond = async (rowId: string, status: ApprovalStatus) => {
    const sb = getBrowserClient();
    if (!sb) return;
    const update: any = { approval_status: status };
    if (status === 'approved') update.approved_at = new Date().toISOString();
    await sb.from('track_writers').update(update).eq('id', rowId);
    setRefresh((k) => k + 1);
  };

  const pending = items.filter((i) => i.approval_status === 'pending' || i.approval_status === 'needs_changes');
  const settled = items.filter((i) => i.approval_status === 'approved' || i.approval_status === 'rejected');

  return (
    <div className="space-y-8 pt-2">
      <header>
        <h1 className="font-heading text-3xl font-bold">Split approvals</h1>
        <p className="text-white/60 text-sm mt-1">Writer shares assigned to your account ({user?.email ?? 'unknown'}).</p>
        <p className="text-xs text-white/40 mt-1">Profiles are matched by the email on your writer profile in this org.</p>
      </header>

      {loading && <p className="text-sm text-white/50">Loading…</p>}

      <section>
        <h2 className="font-heading text-xl font-semibold mb-3">Awaiting your decision ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-white/50">Nothing pending. ✓</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => <ApprovalCard key={p.id} item={p} onRespond={respond} />)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold mb-3 text-white/70">Already decided ({settled.length})</h2>
        {settled.length === 0 ? (
          <p className="text-sm text-white/40">Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {settled.map((p) => (
              <li key={p.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm flex justify-between">
                <span><Link href={`/publishing/app/releases/${p.release.id}/tracks/${p.track.id}`} className="hover:underline">{p.track.title}</Link> — {p.share_percent.toFixed(2)}% — {p.role.replace('_', ' / ')}</span>
                <span className={'text-xs uppercase ' + (p.approval_status === 'approved' ? 'text-emerald-300' : 'text-red-300')}>{p.approval_status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ApprovalCard({ item, onRespond }: { item: Pending; onRespond: (id: string, s: ApprovalStatus) => void }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40">{item.release.type}</div>
          <div className="font-heading text-lg font-semibold mt-0.5">{item.release.title}</div>
          <div className="text-sm text-white/60">{item.release.primary_artist}</div>
        </div>
        <span className={'text-[10px] uppercase tracking-wider px-2 py-1 rounded border ' + (item.approval_status === 'pending' ? 'bg-amber-400/15 text-amber-200 border-amber-400/30' : 'bg-red-400/15 text-red-200 border-red-400/30')}>
          {item.approval_status.replace('_', ' ')}
        </span>
      </div>

      <div className="rounded-lg bg-black/30 border border-white/10 p-3 text-sm">
        <Link href={`/publishing/app/releases/${item.release.id}/tracks/${item.track.id}`} className="font-medium hover:underline">
          {item.track.title}
        </Link>
        <div className="mt-1 text-white/70">
          Your share: <span className="font-mono text-white">{item.share_percent.toFixed(2)}%</span>
          <span className="text-white/40"> · role: {item.role.replace('_', ' / ')}</span>
          {item.writer.ipi_number && <span className="text-white/40"> · IPI {item.writer.ipi_number}</span>}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onRespond(item.id, 'approved')} className="rounded-full bg-emerald-400 text-black px-4 py-1.5 text-sm font-medium hover:bg-emerald-300">
          Approve
        </button>
        <button onClick={() => onRespond(item.id, 'needs_changes')} className="rounded-full bg-amber-500 text-black px-4 py-1.5 text-sm font-medium hover:bg-amber-400">
          Needs changes
        </button>
        <button onClick={() => onRespond(item.id, 'rejected')} className="rounded-full bg-red-500 text-white px-4 py-1.5 text-sm font-medium hover:bg-red-400">
          Reject
        </button>
      </div>
    </li>
  );
}
