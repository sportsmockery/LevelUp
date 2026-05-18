'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useOrg } from '../_org-context';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { Release } from '@/types/catalog';

export default function ReleasesIndex() {
  const { activeOrgId } = useOrg();
  const [releases, setReleases] = useState<Release[]>([]);

  useEffect(() => {
    if (!activeOrgId) return;
    const sb = getBrowserClient();
    if (!sb) return;
    sb.from('releases').select('*').eq('org_id', activeOrgId).order('created_at', { ascending: false }).then(({ data }) => {
      setReleases((data as Release[]) ?? []);
    });
  }, [activeOrgId]);

  return (
    <div className="space-y-6 pt-2">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="font-heading text-3xl font-bold">Releases</h1>
          <p className="text-white/60 text-sm mt-1">All releases in this organization.</p>
        </div>
        <Link href="/publishing/app/releases/new" className="rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium hover:bg-emerald-300">
          New release
        </Link>
      </header>

      {releases.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-white/60 mb-4">No releases yet.</p>
          <Link href="/publishing/app/releases/new" className="text-emerald-300 hover:underline">Create your first release →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {releases.map((r) => (
            <Link key={r.id} href={`/publishing/app/releases/${r.id}`} className="block rounded-lg border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-medium">{r.release_title}</div>
                  <div className="text-xs text-white/55 mt-1">
                    {r.release_type.toUpperCase()} · {r.primary_artist ?? 'no artist'} · {r.release_date ?? 'no date'}
                  </div>
                </div>
                <div className="text-xs text-white/40 font-mono">{r.upc ?? 'no UPC'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
