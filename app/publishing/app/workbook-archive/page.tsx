'use client';

import { useEffect, useState } from 'react';
import { useOrg } from '../_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { GeneratedFile } from '@/types/exports';

export default function WorkbookArchivePage() {
  const { activeOrgId } = useOrg();
  const [files, setFiles] = useState<GeneratedFile[]>([]);

  useEffect(() => {
    if (!activeOrgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    sb.from('generated_files').select('*').eq('org_id', activeOrgId).order('created_at', { ascending: false }).then(({ data }) => {
      setFiles((data as GeneratedFile[]) ?? []);
    });
  }, [activeOrgId]);

  const download = async (file: GeneratedFile) => {
    const res = await fetch(`/api/publishing/files/${file.id}/url`);
    const json = await res.json();
    if (!res.ok || !json.url) {
      alert('Could not get download URL: ' + (json.error ?? res.statusText));
      return;
    }
    window.open(json.url, '_blank');
  };

  return (
    <div className="space-y-6 pt-2">
      <header>
        <h1 className="font-heading text-3xl font-bold">Workbook archive</h1>
        <p className="text-white/60 text-sm mt-1">Every file the system has ever generated for this organization. Permanent and versioned.</p>
      </header>

      {files.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
          No generated files yet. Use the <strong>Export center</strong> to create one.
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">Platform</th>
                <th className="p-3">File name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Version</th>
                <th className="p-3">Created</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {files.map((f) => (
                <tr key={f.id} className="hover:bg-white/[0.02]">
                  <td className="p-3"><span className="text-[10px] uppercase bg-white/10 px-2 py-0.5 rounded">{f.platform}</span></td>
                  <td className="p-3 font-mono text-xs">{f.file_name}</td>
                  <td className="p-3 text-white/60 text-xs">{f.file_type}</td>
                  <td className="p-3 font-mono text-xs">v{f.version}</td>
                  <td className="p-3 text-white/50 text-xs">{new Date(f.created_at).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => download(f)} className="text-emerald-300 hover:underline text-xs">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
