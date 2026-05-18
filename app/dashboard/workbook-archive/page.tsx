'use client';

import { useEffect, useState } from 'react';
import { OrgPicker, useActiveOrg } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';
import type { GeneratedFile } from '@/types/exports';

export default function WorkbookArchivePage() {
  const orgId = useActiveOrg();
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/music/files?org=${orgId}`).then((r) => r.json()).then((d) => setFiles(d.files ?? []));
  }, [orgId]);

  async function download(id: string) {
    const d = await (await fetch(`/api/music/files/${id}/download`)).json();
    if (d.url) window.open(d.url, '_blank');
  }

  const visible = filter ? files.filter((f) => f.platform === filter) : files;

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-heading tracking-tight mb-4">Workbook Archive</h1>
      <OrgPicker />
      <GovernedStep
        title="Permanent record of every generated file"
        whatThisIs="Every CSV, XLSX, PDF, JSON, and TXT the system generates is stored here permanently with version history."
        whyItMatters="Years from now you'll need to prove what you submitted, when, and what version. The archive is the audit trail."
        whatYouNeed="Nothing — files arrive here automatically when you generate from the Export Center."
        estimatedTime="—"
        commonMistakes="Deleting downloaded files locally and forgetting they're still here."
      />
      <div className="mt-4 flex gap-2 items-baseline">
        <label className="text-sm text-zinc-400">Filter by platform:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1 text-sm">
          <option value="">all</option>
          {['bmi', 'mlc', 'songtrust', 'soundexchange', 'copyright', 'distributor', 'master'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <ul className="space-y-1 mt-4">
        {visible.map((f) => (
          <li key={f.id}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm flex justify-between items-center">
            <div>
              <p className="font-medium">{f.file_name}</p>
              <p className="text-xs text-zinc-500">
                {f.platform} · v{f.version} · {new Date(f.created_at).toLocaleString()}
              </p>
            </div>
            <button onClick={() => download(f.id)}
              className="rounded-md bg-zinc-100 text-zinc-900 text-xs px-3 py-1">Download</button>
          </li>
        ))}
        {visible.length === 0 && <p className="text-sm text-zinc-500">No files generated yet.</p>}
      </ul>
    </div>
  );
}
