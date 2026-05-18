'use client';

// Tooling layout — sidebar nav, current-org selector, auth-gated.
// Auth check is self-contained (does NOT depend on the wrestling AuthContext)
// so the publishing app doesn't share any potential loading-state stalls with it.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getBrowserClient } from '@/lib/supabase-publishing';
import type { Organization } from '@/types/catalog';
import { OrgContext, ACTIVE_ORG_KEY } from './_org-context';

type Phase = 'checking' | 'unauthenticated' | 'ready' | 'error';

export default function ToolingLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('checking');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    let cancelled = false;
    const supabase = getBrowserClient();
    if (!supabase) {
      setErrorMsg('Supabase client unavailable (missing env vars).');
      setPhase('error');
      return;
    }

    (async () => {
      try {
        // Bail if auth check takes longer than 8 s — avoids forever "Loading…".
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('auth_timeout')), 8000),
        );
        const result = await Promise.race([authPromise, timeoutPromise]);
        if (cancelled) return;
        const user = (result as Awaited<typeof authPromise>).data?.user ?? null;
        if (!user) { setPhase('unauthenticated'); return; }

        // Fetch this user's org memberships. Same timeout guard.
        const orgsPromise = supabase
          .from('organization_members')
          .select('org_id, organizations:org_id(*)')
          .eq('user_id', user.id);
        const orgs = await Promise.race([orgsPromise, timeoutPromise]);
        if (cancelled) return;
        const data = (orgs as Awaited<typeof orgsPromise>).data ?? [];
        const list = data
          .map((m: any) => m.organizations as Organization | null)
          .filter((o): o is Organization => !!o);
        setOrgs(list);

        const stored = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_ORG_KEY) : null;
        const valid = stored && list.some((o) => o.id === stored) ? stored : (list[0]?.id ?? null);
        setActiveOrgIdState(valid);
        setPhase('ready');
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.message ?? String(e));
        setPhase('error');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (phase === 'checking') {
    return <div className="min-h-screen bg-[#0A0A0A] text-white/60 flex items-center justify-center">Loading…</div>;
  }

  if (phase === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = `/login?returnUrl=${encodeURIComponent(pathname)}`;
    }
    return <div className="min-h-screen bg-[#0A0A0A] text-white/60 flex items-center justify-center">Redirecting to sign in…</div>;
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-8 gap-4">
        <h1 className="font-heading text-xl">Something went wrong loading the publishing app.</h1>
        <pre className="text-xs text-red-300 bg-black/40 p-3 rounded max-w-lg overflow-auto">{errorMsg}</pre>
        <button onClick={() => window.location.reload()} className="rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium hover:bg-emerald-300">Reload</button>
      </div>
    );
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
          <OrgContext.Provider value={{ orgs, activeOrgId, setActiveOrgId }}>
            {!activeOrgId && orgs.length === 0 && pathname !== '/publishing/app/settings' ? (
              <NoOrgPrompt />
            ) : (
              children
            )}
          </OrgContext.Provider>
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
        You don&apos;t belong to any publishing organizations yet. Create one to get started.
      </p>
      <Link href="/publishing/app/settings" className="inline-block rounded-full bg-emerald-400 text-black px-6 py-2.5 font-medium hover:bg-emerald-300">
        Create your first org
      </Link>
    </div>
  );
}
