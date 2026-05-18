'use client';

import Link from 'next/link';
import { OrgPicker } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';

const TILES = [
  { href: '/dashboard/releases', title: 'Releases', desc: 'Singles, EPs, and albums' },
  { href: '/dashboard/writers', title: 'Writers', desc: 'Songwriters and composers' },
  { href: '/dashboard/publishers', title: 'Publishers', desc: 'Publishers and admins' },
  { href: '/dashboard/isrc', title: 'ISRC Ledger', desc: 'Reserve and assign ISRCs' },
  { href: '/dashboard/exports', title: 'Export Center', desc: 'Generate platform packets' },
  { href: '/dashboard/workbook-archive', title: 'Workbook Archive', desc: 'All generated files' },
  { href: '/dashboard/settings', title: 'Settings', desc: 'Members and custom fields' },
];

export default function MusicHome() {
  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-heading tracking-tight">Music Publishing Suite</h1>
        <p className="text-zinc-400 text-sm">Enter metadata once; generate platform-ready files for every registration.</p>
      </header>
      <OrgPicker />
      <GovernedStep
        title="Welcome to your catalog control center"
        whatThisIs="A single workspace for managing every release, track, writer, publisher, ISRC, and registration filing."
        whyItMatters="Music royalties flow through a network of independent platforms (BMI, MLC, SoundExchange, eCO, distributors). Each requires its own filing. Tracking it all in one place prevents missed payments and duplicate work."
        whatYouNeed={['An organization', 'Artist + writer + publisher profiles', 'Release and track metadata', 'IPI/IPN numbers from each PRO affiliate']}
        estimatedTime="Initial setup: 30-60 min per release"
        commonMistakes={['Skipping ISRC assignment before generating files', 'Treating writer splits and publisher splits as the same number', 'Submitting to distributors before composition registration']}
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-4">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-600 transition-colors block"
          >
            <h3 className="font-medium text-zinc-100">{t.title}</h3>
            <p className="text-xs text-zinc-400 mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
