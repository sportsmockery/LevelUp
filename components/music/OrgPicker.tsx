'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export interface OrgEntry {
  organization: { id: string; name: string };
  role: string;
}

const ORG_KEY = 'music_active_org';
const listeners = new Set<() => void>();

export function getActiveOrg(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ORG_KEY);
}

export function setActiveOrg(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORG_KEY, id);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useActiveOrg(): string | null {
  return useSyncExternalStore(subscribe, getActiveOrg, () => null);
}

export function OrgPicker({ onChange }: { onChange?: (id: string | null) => void }) {
  const [orgs, setOrgs] = useState<OrgEntry[]>([]);
  const active = useActiveOrg();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/music/orgs');
    const json = await res.json();
    setOrgs(json.orgs ?? []);
    if (!getActiveOrg() && json.orgs?.[0]) {
      const id = json.orgs[0].organization.id;
      setActiveOrg(id);
      onChange?.(id);
    }
    setLoading(false);
  }, [onChange]);

  useEffect(() => { load(); }, [load]);

  async function createOrg() {
    if (!newName.trim()) return;
    const res = await fetch('/api/music/orgs', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const json = await res.json();
    if (json.organization) {
      setActiveOrg(json.organization.id);
      onChange?.(json.organization.id);
      setCreating(false);
      setNewName('');
      await load();
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Active Organization</p>
      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : orgs.length === 0 && !creating ? (
        <button className="text-sm text-zinc-100 underline" onClick={() => setCreating(true)}>
          Create your first organization
        </button>
      ) : creating ? (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
            placeholder="Organization name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button onClick={createOrg} className="rounded-md bg-zinc-100 text-zinc-900 text-sm px-3 py-1.5">
            Create
          </button>
          <button onClick={() => setCreating(false)} className="text-sm text-zinc-400">Cancel</button>
        </div>
      ) : (
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={active ?? ''}
            onChange={(e) => { setActiveOrg(e.target.value); onChange?.(e.target.value); }}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
          >
            {orgs.map((o) => (
              <option key={o.organization.id} value={o.organization.id}>
                {o.organization.name} ({o.role})
              </option>
            ))}
          </select>
          <button onClick={() => setCreating(true)} className="text-xs text-zinc-400 underline">
            + new
          </button>
        </div>
      )}
    </div>
  );
}
