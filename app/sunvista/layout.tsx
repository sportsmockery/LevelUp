'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Calculator,
  Tags,
  PencilRuler,
  KanbanSquare,
  HardHat,
  RotateCcw,
} from 'lucide-react';
import { SunVistaProvider, useSunVista } from './store';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/sunvista', label: 'Dashboard', icon: LayoutDashboard, step: null },
  { href: '/sunvista/intake', label: 'Intake Inbox', icon: Inbox, step: 1 },
  { href: '/sunvista/estimate', label: 'AI Estimate', icon: Calculator, step: 2 },
  { href: '/sunvista/pricing', label: 'Material Pricing', icon: Tags, step: 3 },
  { href: '/sunvista/design', label: 'CAD / Site Plan', icon: PencilRuler, step: 4 },
  { href: '/sunvista/projects', label: 'Project Board', icon: KanbanSquare, step: 5 },
];

function Sidebar() {
  const pathname = usePathname();
  const { resetDemo, activeJob } = useSunVista();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-[#0c0f14]">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <HardHat className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">SunVista BuildAI</div>
          <div className="text-[11px] text-slate-500">GC Automation Suite</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-amber-500/10 text-amber-300'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              {item.step && (
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                    active ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-500'
                  )}
                >
                  {item.step}
                </span>
              )}
              {!item.step && <Icon className="h-4 w-4" />}
              <span className="flex-1">{item.label}</span>
              {item.step && <Icon className="h-4 w-4 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-3 py-4">
        {activeJob && (
          <div className="mb-3 rounded-lg bg-slate-800/50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Active Job</div>
            <div className="truncate text-xs font-medium text-slate-200">{activeJob.jobNumber}</div>
            <div className="truncate text-[11px] text-slate-400">{activeJob.title}</div>
          </div>
        )}
        <button
          onClick={resetDemo}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Demo
        </button>
      </div>
    </aside>
  );
}

export default function SunVistaLayout({ children }: { children: React.ReactNode }) {
  return (
    <SunVistaProvider>
      <div className="flex h-screen overflow-hidden bg-[#0A0A0A] text-slate-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SunVistaProvider>
  );
}
