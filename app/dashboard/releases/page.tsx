'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OrgPicker, useActiveOrg } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';
import type { Release } from '@/types/catalog';

export default function ReleasesPage() {
  const orgId = useActiveOrg();
  const [releases, setReleases] = useState<Release[]>([]);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/music/releases?org=${orgId}`).then((r) => r.json()).then((d) => setReleases(d.releases ?? []));
  }, [orgId]);

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-6 py-8">
      <div className="flex justify-between items-baseline mb-4">
        <h1 className="text-3xl font-heading tracking-tight">Releases</h1>
        <Link href="/dashboard/releases/new" className="rounded-md bg-zinc-100 text-zinc-900 text-sm px-3 py-1.5">
          New release
        </Link>
      </div>
      <OrgPicker />
      <GovernedStep
        title="What is a release?"
        whatThisIs="A release is the published product — single, EP, album, or compilation — that goes out to distributors and registers as one unit."
        whyItMatters="Some metadata (UPC, P-line, artwork, release date) lives at the release level. Track metadata is attached underneath."
        whatYouNeed={['Title', 'Type (single/EP/album/compilation)', 'Primary artist', 'Release date', 'Artwork (≥3000×3000 px)']}
        estimatedTime="10-15 min"
        commonMistakes="Setting release_date in the past and skipping original_release_date for re-releases."
      />
      <ul className="space-y-2 mt-4">
        {releases.map((r) => (
          <li key={r.id}>
            <Link href={`/dashboard/releases/${r.id}`}
              className="block rounded-lg border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-600">
              <div className="flex justify-between items-baseline">
                <div>
                  <p className="font-medium">{r.release_title}</p>
                  <p className="text-xs text-zinc-400">
                    {r.release_type} · {r.primary_artist} {r.release_date && `· ${r.release_date}`}
                  </p>
                </div>
                {r.upc && <span className="text-xs text-zinc-500 font-mono">{r.upc}</span>}
              </div>
            </Link>
          </li>
        ))}
        {releases.length === 0 && <p className="text-zinc-500 text-sm">No releases yet. Create your first one.</p>}
      </ul>
    </div>
  );
}
