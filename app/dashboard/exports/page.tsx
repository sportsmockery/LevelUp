'use client';

import { useCallback, useEffect, useState } from 'react';
import { OrgPicker, useActiveOrg } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';
import type { Release } from '@/types/catalog';
import type { PlatformId, PlatformRegistration, RegistrationStatus, ValidationIssue } from '@/types/platforms';
import { PLATFORM_LABELS } from '@/types/platforms';
import type { GeneratedFile } from '@/types/exports';

const PLATFORMS: PlatformId[] = ['bmi', 'mlc', 'songtrust', 'soundexchange', 'copyright', 'distributor'];
const STATUSES: RegistrationStatus[] = [
  'not_started', 'missing_information', 'ready', 'file_generated', 'submitted',
  'pending', 'confirmed', 'rejected', 'needs_correction', 'skipped',
];

export default function ExportsPage() {
  const orgId = useActiveOrg();
  const [releases, setReleases] = useState<Release[]>([]);
  const [releaseId, setReleaseId] = useState<string>('');
  const [issues, setIssues] = useState<Record<string, ValidationIssue[]>>({});
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [regs, setRegs] = useState<PlatformRegistration[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/music/releases?org=${orgId}`).then((r) => r.json()).then((d) => setReleases(d.releases ?? []));
  }, [orgId]);

  const loadRelease = useCallback(async () => {
    if (!releaseId || !orgId) return;
    const v = await (await fetch(`/api/music/validate?release=${releaseId}`)).json();
    setIssues(v.perPlatform ?? {});
    const f = await (await fetch(`/api/music/files?org=${orgId}&release=${releaseId}`)).json();
    setFiles(f.files ?? []);
    const r = await (await fetch(`/api/music/registrations?org=${orgId}&release=${releaseId}`)).json();
    setRegs(r.registrations ?? []);
  }, [releaseId, orgId]);

  useEffect(() => { loadRelease(); }, [loadRelease]);

  async function generate(platform: PlatformId) {
    setBusy(platform);
    const endpoint = platform === 'master'
      ? '/api/music/exports/master'
      : `/api/music/exports/${platform}`;
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ release_id: releaseId }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? `Blocked by validation: ${JSON.stringify(d.issues)}`);
    } else {
      await loadRelease();
    }
    setBusy(null);
  }

  async function download(fileId: string) {
    const res = await fetch(`/api/music/files/${fileId}/download`);
    const d = await res.json();
    if (d.url) window.open(d.url, '_blank');
  }

  async function updateStatus(platform: PlatformId, payload: Partial<PlatformRegistration>) {
    if (!orgId || !releaseId) return;
    await fetch('/api/music/registrations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        organization_id: orgId, release_id: releaseId, platform, ...payload,
      }),
    });
    loadRelease();
  }

  const latestFor = (platform: string) =>
    files.find((f) => f.platform === platform);
  const regFor = (platform: string) =>
    regs.find((r) => r.platform === platform);

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-heading tracking-tight mb-4">Export Center</h1>
      <OrgPicker />

      <GovernedStep
        title="Generate platform-ready files"
        whatThisIs="One place to validate every platform, generate the right output format, and track filing status."
        whyItMatters="Each platform has different rules. Generating from a single metadata source guarantees consistency."
        whatYouNeed="A release with tracks, balanced splits (100%), assigned ISRCs, and writer/publisher IPI numbers."
        estimatedTime="5 min per platform"
        commonMistakes={['Submitting before splits are balanced', 'Generating without confirming the latest splits are saved']}
      />

      <label className="block text-sm text-zinc-400 mt-4">Release
        <select value={releaseId} onChange={(e) => setReleaseId(e.target.value)}
          className="block w-full mt-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm">
          <option value="">— select release —</option>
          {releases.map((r) => <option key={r.id} value={r.id}>{r.release_title}</option>)}
        </select>
      </label>

      {releaseId && (
        <table className="w-full mt-6 text-sm">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="text-left p-2">Platform</th>
              <th className="text-left p-2">Readiness</th>
              <th className="p-2">Generate</th>
              <th className="text-left p-2">Latest file</th>
              <th className="text-left p-2">Filing status</th>
            </tr>
          </thead>
          <tbody>
            {[...PLATFORMS, 'master' as PlatformId].map((p) => {
              const errs = issues[p] ?? [];
              const blocking = errs.filter((i) => i.blocking);
              const latest = latestFor(p);
              const reg = regFor(p);
              return (
                <tr key={p} className="border-t border-zinc-800 align-top">
                  <td className="p-2 font-medium">{PLATFORM_LABELS[p]}</td>
                  <td className="p-2">
                    {p === 'master' ? (
                      <span className="text-zinc-400">Aggregates everything</span>
                    ) : blocking.length ? (
                      <ul className="text-xs text-rose-400 list-disc list-inside">
                        {blocking.slice(0, 3).map((i) => <li key={i.field}>{i.message}</li>)}
                        {blocking.length > 3 && <li>+{blocking.length - 3} more</li>}
                      </ul>
                    ) : errs.length ? (
                      <span className="text-amber-400 text-xs">{errs.length} warning(s)</span>
                    ) : (
                      <span className="text-emerald-400 text-xs">ready</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <button onClick={() => generate(p)}
                      disabled={busy === p || (blocking.length > 0 && p !== 'master')}
                      className="rounded-md bg-zinc-100 text-zinc-900 text-xs px-3 py-1 disabled:opacity-30">
                      {busy === p ? '…' : 'Generate'}
                    </button>
                  </td>
                  <td className="p-2">
                    {latest ? (
                      <button onClick={() => download(latest.id)}
                        className="text-xs underline text-zinc-300">
                        {latest.file_name} (v{latest.version})
                      </button>
                    ) : <span className="text-zinc-500 text-xs">none</span>}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col gap-1">
                      <select value={reg?.status ?? 'not_started'}
                        onChange={(e) => updateStatus(p, { status: e.target.value as RegistrationStatus })}
                        className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-xs">
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input placeholder="Confirmation #" defaultValue={reg?.confirmation_number ?? ''}
                        onBlur={(e) => updateStatus(p, { confirmation_number: e.target.value })}
                        className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-xs" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="mt-8">
        <TrainingBlock topic="bmi" />
        <TrainingBlock topic="mlc" />
        <TrainingBlock topic="songtrust" />
        <TrainingBlock topic="soundexchange" />
        <TrainingBlock topic="eco" />
      </div>
    </div>
  );
}
