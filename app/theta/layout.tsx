'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ListChecks,
  ShieldAlert,
  Zap,
  History,
  GitBranch,
  ScatterChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Navigation mirrors the seven-minute demo sequence in
 * docs/premium-challenge/02-BUILD-PLAN.md §3 — the order is the argument,
 * so it is deliberately not alphabetical or grouped by feature.
 */
const NAV = [
  { href: '/theta',             label: 'Live',         icon: Activity,     beat: '0:00' },
  { href: '/theta/blotter',     label: 'Blotter',      icon: ListChecks,   beat: '1:00' },
  { href: '/theta/risk',        label: 'Risk',         icon: ShieldAlert,  beat: '2:30' },
  { href: '/theta/scenario',    label: 'Scenario',     icon: Zap,          beat: '3:30' },
  { href: '/theta/replay',      label: 'Replay',       icon: History,      beat: '4:30' },
  { href: '/theta/probability', label: 'Probability',  icon: ScatterChart, beat: '5:30' },
  { href: '/theta/verify',      label: 'Verify',       icon: GitBranch,    beat: null   },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-[#0b1116]">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="text-sm font-semibold tracking-tight text-white">ThetaDesk</div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          Premium Challenge
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-teal-500/10 text-teal-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.beat && (
                <span
                  className={cn(
                    'font-mono text-[10px] tabular-nums',
                    active ? 'text-teal-400/70' : 'text-slate-600'
                  )}
                >
                  {item.beat}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="font-mono text-[10px] leading-relaxed text-slate-600">
          <div>PHASE 0 — SCAFFOLD</div>
          <div className="mt-1 text-slate-700">No data layer yet. No trading.</div>
        </div>
      </div>
    </aside>
  );
}

export default function ThetaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#070c10] text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
