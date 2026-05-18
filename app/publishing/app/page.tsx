'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useOrg } from './_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import { STEPS } from '@/lib/permissions/order-of-operations-steps';

export default function ToolingHome() {
  const { activeOrgId, orgs } = useOrg();
  const [counts, setCounts] = useState({ releases: 0, tracks: 0, writers: 0, publishers: 0, files: 0 });

  useEffect(() => {
    if (!activeOrgId) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    (async () => {
      const tableCount = async (table: string) => {
        const { count } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('org_id', activeOrgId);
        return count ?? 0;
      };
      const [releases, tracks, writers, publishers, files] = await Promise.all([
        tableCount('releases'),
        tableCount('tracks'),
        tableCount('writer_profiles'),
        tableCount('publisher_profiles'),
        tableCount('generated_files'),
      ]);
      setCounts({ releases, tracks, writers, publishers, files });
    })();
  }, [activeOrgId]);

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  return (
    <div className="space-y-8 pt-2">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">{activeOrg?.name ?? 'Publishing'}</h1>
          <p className="text-white/60 text-sm mt-1">Catalog overview and next steps.</p>
        </div>
        <Link href="/publishing/app/releases/new" className="rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium hover:bg-emerald-300">
          New release
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Releases" n={counts.releases} href="/publishing/app/releases" />
        <Stat label="Tracks" n={counts.tracks} href="/publishing/app/releases" />
        <Stat label="Writers" n={counts.writers} href="/publishing/app/writers" />
        <Stat label="Publishers" n={counts.publishers} href="/publishing/app/writers" />
        <Stat label="Files generated" n={counts.files} href="/publishing/app/workbook-archive" />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-heading text-xl font-semibold mb-1">The 14-step workflow</h2>
        <p className="text-sm text-white/60 mb-5">
          Locked order. Steps unlock as prerequisites are met. Open any release to see its
          per-release checklist.
        </p>
        <ol className="grid md:grid-cols-2 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex gap-3 items-start text-sm rounded-lg p-3 border border-white/10 bg-white/[0.02]">
              <span className="font-mono text-emerald-300 text-xs pt-0.5">{(i + 1).toString().padStart(2, '0')}</span>
              <div>
                <div className="font-medium">{s.title.replace(/^\d+\.\s*/, '')}</div>
                <div className="text-white/55 text-xs mt-0.5">{s.blurb}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, n, href }: { label: string; n: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07] transition">
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className="font-heading text-3xl font-bold mt-1">{n}</div>
    </Link>
  );
}
