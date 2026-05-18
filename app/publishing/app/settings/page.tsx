'use client';

import { useEffect, useState } from 'react';
import { useOrg } from '../_org-context';
import { useAuth } from '@/contexts/AuthContext';
import { GovernedStep } from '@/components/guided/GovernedStep';

export default function SettingsPage() {
  const { user } = useAuth();
  const { orgs, activeOrgId, setActiveOrgId } = useOrg();
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const norm = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    setOrgSlug(norm);
  }, [orgName]);

  const createOrg = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/publishing/orgs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: orgName, slug: orgSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create org');
      setActiveOrgId(json.org.id);
      setOrgName('');
      // refresh page so layout re-reads orgs
      window.location.reload();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-10 pt-2">
      <header>
        <h1 className="font-heading text-3xl font-bold">Settings</h1>
        <p className="text-white/60 text-sm mt-1">Manage organizations and members.</p>
      </header>

      <GovernedStep
        title="Create an organization"
        whatThisIs="An organization is a single publishing tenant: one label, one writer, or one production company. Everything you build (releases, writers, publishers, exports) lives inside an organization."
        whyItMatters="Multi-tenancy means you can manage multiple labels or projects from the same login without their data mixing."
        whatYouNeed={['A name', 'A URL slug (auto-generated from name)']}
        estimatedTime="~30 seconds"
        commonMistakes={[
          'Naming the org after a release instead of the entity that owns the catalog.',
          'Treating an org as disposable — once releases are filed under it, you should keep it forever.',
        ]}
      >
        <div className="space-y-3 max-w-md">
          <Field label="Organization name">
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Burhans Music LLC"
              className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Slug">
            <input
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm font-mono"
            />
          </Field>
          {error && <div className="text-red-300 text-sm">{error}</div>}
          <button
            disabled={!orgName || !orgSlug || creating}
            onClick={createOrg}
            className="rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-emerald-300"
          >
            {creating ? 'Creating…' : 'Create organization'}
          </button>
        </div>
      </GovernedStep>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-heading text-xl font-semibold mb-1">Your organizations</h2>
        <p className="text-sm text-white/60 mb-5">You're a member of {orgs.length} organization{orgs.length === 1 ? '' : 's'}.</p>
        {orgs.length === 0 ? (
          <p className="text-white/50 text-sm">None yet — create one above.</p>
        ) : (
          <ul className="space-y-2">
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
                <div>
                  <div className="font-medium">{o.name}</div>
                  <div className="text-xs text-white/40 font-mono">{o.slug}</div>
                </div>
                {activeOrgId === o.id ? (
                  <span className="text-xs text-emerald-300 px-2 py-1 rounded bg-emerald-400/10 border border-emerald-400/30">active</span>
                ) : (
                  <button
                    onClick={() => setActiveOrgId(o.id)}
                    className="text-xs px-3 py-1 rounded border border-white/15 hover:bg-white/10"
                  >
                    Switch to
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/60">
        <h2 className="font-heading text-base font-semibold text-white mb-1">Signed in as</h2>
        <code className="text-xs text-white/80">{user?.email ?? '—'}</code>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">{label}</span>
      {children}
    </label>
  );
}
