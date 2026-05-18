'use client';

// Tooling layout — sidebar nav, current-org selector, auth-gated.
// Middleware ensures the user is signed in; client code reads/sets active org from localStorage.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { Organization } from '@/types/catalog';
import { OrgContext, ACTIVE_ORG_KEY } from './_org-context';

export default function ToolingLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);

  const setActiveOrgId = (id: string | null) => {
    setActiveOrgIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem(ACTIVE_ORG_KEY, id);
      else localStorage.removeItem(ACTIVE_ORG_KEY);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    (async () => {
      const { data: members } = await supabase
        .from('organization_members')
        .select('org_id, organizations:org_id(*)')
        .eq('user_id', user.id);
      const list = (members ?? [])
        .map((m: any) => m.organizations as Organization | null)
        .filter((o): o is Organization => !!o);
      setOrgs(list);

      const stored = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_ORG_KEY) : null;
      const valid = stored && list.some((o) => o.id === stored) ? stored : (list[0]?.id ?? null);
      setActiveOrgIdState(valid);
    })();
  }, [user, loading]);

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] text-white/60 flex items-center justify-center">Loading…</div>;
  }

  if (!user) {
    // Middleware should have redirected, but render a fallback.
    return <div className="min-h-screen bg-[#0A0A0A] text-white/60 flex items-center justify-center">Not signed in.</div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Sidebar
        active={pathname}
        orgs={orgs}
        activeOrgId={activeOrgId}
        onChangeOrg={(id) => {
          setActiveOrgId(id);
          router.refresh();
        }}
      />
      <main className="md:pl-64 pt-4 pb-24">
        <div className="max-w-5xl mx-auto px-6">
          {!activeOrgId && orgs.length === 0 ? (
            <NoOrgPrompt />
          ) : (
            <OrgContext.Provider value={{ orgs, activeOrgId, setActiveOrgId }}>
              {children}
            </OrgContext.Provider>
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  active,
  orgs,
  activeOrgId,
  onChangeOrg,
}: {
  active: string;
  orgs: Organization[];
  activeOrgId: string | null;
  onChangeOrg: (id: string) => void;
}) {
  const items: Array<[string, string]> = [
    ['/publishing/app', 'Home'],
    ['/publishing/app/releases', 'Releases'],
    ['/publishing/app/writers', 'Writers'],
    ['/publishing/app/isrc', 'ISRC ledger'],
    ['/publishing/app/approvals', 'Approvals'],
    ['/publishing/app/exports', 'Exports'],
    ['/publishing/app/workbook-archive', 'Workbook archive'],
    ['/publishing/app/settings', 'Settings'],
  ];
  return (
    <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-white/10 bg-black/40 p-5">
      <Link href="/publishing" className="block font-heading text-lg font-semibold mb-6">
        LevelUp Publishing
      </Link>
      <div className="mb-6">
        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">Active org</label>
        <select
          value={activeOrgId ?? ''}
          onChange={(e) => onChangeOrg(e.target.value)}
          className="w-full bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-sm"
        >
          {orgs.length === 0 && <option value="">— none —</option>}
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <nav className="space-y-1 text-sm">
        {items.map(([href, label]) => {
          const isActive = active === href || (href !== '/publishing/app' && active.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={
                'block rounded-md px-3 py-2 ' +
                (isActive ? 'bg-emerald-400/15 text-emerald-200' : 'text-white/70 hover:bg-white/5 hover:text-white')
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function NoOrgPrompt() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center mt-12">
      <h2 className="font-heading text-2xl font-semibold mb-2">Welcome to LevelUp Publishing</h2>
      <p className="text-white/70 mb-6 max-w-md mx-auto">
        You don't belong to any publishing organizations yet. Create one to get started.
      </p>
      <Link href="/publishing/app/settings" className="inline-block rounded-full bg-emerald-400 text-black px-6 py-2.5 font-medium hover:bg-emerald-300">
        Create your first org
      </Link>
    </div>
  );
}

