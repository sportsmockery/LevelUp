'use client';

import { useEffect, useState } from 'react';
import type { OrganizationMember, OrgRole } from '@/types/catalog';

interface MemberRow extends OrganizationMember {
  email: string | null;
}

const ROLES: OrgRole[] = ['owner', 'admin', 'editor', 'collaborator', 'viewer'];

export function MembersSection({ orgId }: { orgId: string | null }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('collaborator');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/publishing/orgs/${orgId}/members`).then((r) => r.json()).then((j) => {
      setMembers(j.members ?? []);
    });
  }, [orgId, refresh]);

  const invite = async () => {
    if (!orgId || !email.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/publishing/orgs/${orgId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMsg({ ok: true, text: `Added ${email} as ${role}.` });
      setEmail('');
      setRefresh((k) => k + 1);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this member?')) return;
    if (!orgId) return;
    await fetch(`/api/publishing/orgs/${orgId}/members?id=${id}`, { method: 'DELETE' });
    setRefresh((k) => k + 1);
  };

  const changeRole = async (id: string, newRole: OrgRole) => {
    if (!orgId) return;
    await fetch(`/api/publishing/orgs/${orgId}/members`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, role: newRole }),
    });
    setRefresh((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-heading text-xl font-semibold mb-1">Members</h2>
        <p className="text-sm text-white/60">Invite teammates by email. They must already have a LevelUp account.</p>
      </header>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 grid md:grid-cols-3 gap-2 items-end">
        <label className="block md:col-span-2">
          <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as OrgRole)} className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 text-sm">
            {ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <button onClick={invite} disabled={busy || !email} className="md:col-span-3 rounded-full bg-emerald-400 text-black px-5 py-2 text-sm font-medium hover:bg-emerald-300 disabled:opacity-40">
          {busy ? 'Inviting…' : 'Add member'}
        </button>
        {msg && <div className={'md:col-span-3 text-sm ' + (msg.ok ? 'text-emerald-300' : 'text-red-300')}>{msg.text}</div>}
      </div>

      <ul className="space-y-2">
        {members.length === 0 && <li className="text-sm text-white/50">No members yet.</li>}
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
            <div>
              <div className="font-medium">{m.email ?? <span className="text-white/50">user {m.user_id.slice(0, 8)}…</span>}</div>
              <div className="text-xs text-white/40 font-mono">joined {new Date(m.joined_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value as OrgRole)} disabled={m.role === 'owner'} className="bg-white/5 border border-white/15 rounded-md px-2 py-1 text-xs disabled:opacity-40">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {m.role !== 'owner' && <button onClick={() => remove(m.id)} className="text-xs text-red-300 hover:underline">remove</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
