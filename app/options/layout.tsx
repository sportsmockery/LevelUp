'use client';

import { useEffect, useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Navigation mirrors the seven-minute demo sequence in
 * docs/premium-challenge/02-BUILD-PLAN.md §3 — the order is the argument,
 * so it is deliberately not alphabetical or grouped by feature.
 */
const NAV = [
  { href: '/options',             label: 'Live',        icon: Activity,     beat: '0:00' },
  { href: '/options/blotter',     label: 'Blotter',     icon: ListChecks,   beat: '1:00' },
  { href: '/options/risk',        label: 'Risk',        icon: ShieldAlert,  beat: '2:30' },
  { href: '/options/scenario',    label: 'Scenario',    icon: Zap,          beat: '3:30' },
  { href: '/options/replay',      label: 'Replay',      icon: History,      beat: '4:30' },
  { href: '/options/probability', label: 'Probability', icon: ScatterChart, beat: '5:30' },
  { href: '/options/verify',      label: 'Verify',      icon: GitBranch,    beat: null   },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {NAV.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
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
    </>
  );
}

function PhaseNote() {
  return (
    <div className="font-mono text-[10px] leading-relaxed text-slate-600">
      <div>PHASE 0 — SCAFFOLD</div>
      <div className="mt-1 text-slate-700">No data layer yet. No trading.</div>
    </div>
  );
}

export default function OptionsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the drawer on navigation. Adjusting during render rather than in an
  // effect avoids a cascading render, and catches back/forward too, which a
  // link's own onClick does not.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // Close it too once the viewport grows past the breakpoint where the
  // persistent sidebar takes over.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => mq.matches && setMenuOpen(false);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Prevent the page behind the drawer from scrolling while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh bg-[#070c10] text-slate-100 lg:flex lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-[#0b1116]/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="options-mobile-nav"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          className="-ml-1 rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-white">ThetaDesk</div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
            Premium Challenge
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-black/60 lg:hidden"
          />
          <nav
            id="options-mobile-nav"
            className="fixed inset-x-0 top-[61px] z-40 max-h-[calc(100dvh-61px)] overflow-y-auto border-b border-slate-800 bg-[#0b1116] px-3 py-3 lg:hidden"
          >
            <div className="space-y-0.5">
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="mt-3 border-t border-slate-800 px-3 pt-3">
              <PhaseNote />
            </div>
          </nav>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-[#0b1116] lg:flex">
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="text-sm font-semibold tracking-tight text-white">ThetaDesk</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
            Premium Challenge
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <NavLinks />
        </nav>
        <div className="border-t border-slate-800 px-4 py-4">
          <PhaseNote />
        </div>
      </aside>

      <main className="lg:flex-1 lg:overflow-y-auto">{children}</main>
    </div>
  );
}
