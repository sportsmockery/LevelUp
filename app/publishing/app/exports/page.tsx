'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '../_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { Release } from '@/types/catalog';
import type { ValidationIssue } from '@/types/platforms';

const PLATFORMS = [
  { id: 'bmi',           label: 'BMI Registration Packet',    desc: 'PDF + .txt for self-registration at BMI Songview.', live: true },
  { id: 'mlc',           label: 'MLC Work Registration',      desc: '4-tab XLSX + JSON for the Mechanical Licensing Collective.', live: true },
  { id: 'songtrust',     label: 'Songtrust Catalog Upload',   desc: 'CSV + XLSX for Songtrust publishing admin (template_pending).', live: true },
  { id: 'soundexchange', label: 'SoundExchange Repertoire',   desc: 'CSV + XLSX for digital performance royalty collection.', live: true },
  { id: 'copyright',     label: 'Copyright eCO Packet',       desc: 'Form PA + Form SR — PDF + .txt for US Copyright Office filings.', live: true },
  { id: 'distributor',   label: 'Distributor Metadata',       desc: 'CSV + XLSX matching common distributor templates.', live: true },
  { id: 'master',        label: 'Master Workbook',            desc: '10-tab XLSX covering the entire org catalog. No release required.', live: true },
];

export default function ExportsPage() {
  const { activeOrgId } = useOrg();
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [issuesByPlatform, setIssuesByPlatform] = useState<Record<string, ValidationIssue[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, { ok: boolean; message: string }>>({});

  useEffect(() => {
    if (!activeOrgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    sb.from('releases').select('*').eq('org_id', activeOrgId).order('created_at', { ascending: false }).then(({ data }) => {
      const list = (data as Release[]) ?? [];
      setReleases(list);
      if (!selectedReleaseId && list[0]) setSelectedReleaseId(list[0].id);
    });
  }, [activeOrgId, selectedReleaseId]);

  useEffect(() => {
    if (!selectedReleaseId) return;
    fetch(`/api/publishing/releases/${selectedReleaseId}/validate`).then((r) => r.json()).then((j) => {
      setIssues(j.issues ?? []);
      setIssuesByPlatform(j.byPlatform ?? {});
    });
  }, [selectedReleaseId, lastResult]);

  const generate = async (platform: string) => {
    setBusy(platform);
    setLastResult((prev) => ({ ...prev, [platform]: { ok: false, message: 'Generating…' } }));
    try {
      let res: Response;
      if (platform === 'master') {
        res = await fetch(`/api/publishing/orgs/${activeOrgId}/master-workbook`, { method: 'POST' });
      } else {
        res = await fetch(`/api/publishing/releases/${selectedReleaseId}/exports/${platform}`, { method: 'POST' });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const files = json.files ?? (json.file ? [json.file] : []);
      const fileLabel = files.map((f: any) => f.file_name).join(', ');
      setLastResult((prev) => ({ ...prev, [platform]: { ok: true, message: `Generated: ${fileLabel}` } }));
    } catch (e: any) {
      setLastResult((prev) => ({ ...prev, [platform]: { ok: false, message: e.message ?? String(e) } }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <header>
        <h1 className="font-heading text-3xl font-bold">Export center</h1>
        <p className="text-white/60 text-sm mt-1">Generate platform-ready filings for a release.</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">Release</span>
          <select value={selectedReleaseId} onChange={(e) => setSelectedReleaseId(e.target.value)} className="w-full max-w-md bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm">
            <option value="">— pick a release —</option>
            {releases.map((r) => <option key={r.id} value={r.id}>{r.release_title} — {r.primary_artist}</option>)}
          </select>
        </label>
      </section>

      {selectedReleaseId && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-heading text-lg font-semibold mb-2">Catalog validation</h2>
          <p className="text-xs text-white/55 mb-3">Issues marked <span className="text-red-300">blocking</span> prevent file generation. Warnings are advisory.</p>
          {issues.length === 0 ? (
            <p className="text-sm text-emerald-300">No catalog issues. ✓</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {issues.map((i, idx) => (
                <li key={idx} className={'flex items-start gap-2 ' + (i.blocking ? 'text-red-300' : 'text-amber-200/90')}>
                  <span className="text-[10px] uppercase font-mono pt-0.5">{i.blocking ? 'BLOCK' : 'WARN'}</span>
                  <span>{i.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-3">
        {PLATFORMS.map((p) => {
          const platformIssues = issuesByPlatform[p.id] ?? [];
          const platformBlockers = platformIssues.filter((i) => i.blocking);
          const overallBlockers = issues.filter((i) => i.blocking);
          // Master Workbook is org-scoped and doesn't depend on per-release validation.
          const blocked = !p.live || (p.id !== 'master' && (overallBlockers.length > 0 || platformBlockers.length > 0));
          const result = lastResult[p.id];
          return (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.label}</span>
                    {!p.live && <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">coming soon</span>}
                  </div>
                  <p className="text-xs text-white/55 mt-1">{p.desc}</p>
                  {platformBlockers.length > 0 && (
                    <ul className="mt-2 text-xs text-red-300/90 space-y-0.5">
                      {platformBlockers.map((i, idx) => <li key={idx}>• {i.message}</li>)}
                    </ul>
                  )}
                  {result && (
                    <div className={'mt-2 text-xs ' + (result.ok ? 'text-emerald-300' : 'text-red-300')}>
                      {result.message}
                    </div>
                  )}
                </div>
                <button
                  disabled={blocked || busy === p.id || (p.id !== 'master' && !selectedReleaseId)}
                  onClick={() => generate(p.id)}
                  className="rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium hover:bg-emerald-300 disabled:opacity-30 whitespace-nowrap"
                  title={blocked ? 'Fix blockers above first' : undefined}
                >
                  {busy === p.id ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <p className="text-xs text-white/45 pt-4">
        Files appear in the <Link href="/publishing/app/workbook-archive" className="text-emerald-300 underline">Workbook archive</Link> after generation.
      </p>
    </div>
  );
}
