'use client';

import { useEffect, useState } from 'react';
import { OrgPicker, useActiveOrg } from '@/components/music/OrgPicker';
import { GovernedStep } from '@/components/guided/GovernedStep';
import { TrainingBlock } from '@/components/guided/TrainingBlock';

interface Member { id: string; user_id: string; role: string; joined_at: string }
interface CustomField {
  id: string; entity_type: string; field_key: string; field_label: string;
  field_type: string; options: string[];
}

export default function SettingsPage() {
  const orgId = useActiveOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('collaborator');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [newField, setNewField] = useState({
    entity_type: 'track', field_key: '', field_label: '', field_type: 'text', options: '',
  });

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/music/members?org=${orgId}`).then((r) => r.json()).then((d) => setMembers(d.members ?? []));
    fetch(`/api/music/custom-fields?org=${orgId}`).then((r) => r.json()).then((d) => setFields(d.fields ?? []));
  }, [orgId]);

  async function invite() {
    if (!orgId || !inviteUserId) return;
    const res = await fetch('/api/music/members', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orgId, userId: inviteUserId, role: inviteRole }),
    });
    if (res.ok) {
      const d = await res.json();
      setMembers((m) => [...m, d.member]);
      setInviteUserId('');
    } else alert((await res.json()).error);
  }

  async function addField() {
    if (!orgId || !newField.field_key || !newField.field_label) return;
    const res = await fetch('/api/music/custom-fields', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        organization_id: orgId,
        entity_type: newField.entity_type,
        field_key: newField.field_key,
        field_label: newField.field_label,
        field_type: newField.field_type,
        options: newField.options ? newField.options.split(',').map((s) => s.trim()) : [],
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setFields((f) => [...f, d.field]);
      setNewField({ entity_type: 'track', field_key: '', field_label: '', field_type: 'text', options: '' });
    } else alert((await res.json()).error);
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-heading tracking-tight mb-4">Settings</h1>
      <OrgPicker />

      <GovernedStep
        title="Organization & collaborators"
        whatThisIs="Your tenant — the workspace that owns all releases, tracks, writers, and publishers entered here."
        whyItMatters="Multi-tenancy isolates catalogs so collaborators from one project never see another project's data."
        whatYouNeed="The user ID (UUID) of each collaborator you want to invite."
        estimatedTime="2-5 min"
        commonMistakes="Granting 'owner' role to non-owners. Use 'editor' or 'collaborator' for working musicians."
      >
        <h3 className="font-medium mb-2">Members</h3>
        <ul className="space-y-1 mb-3 text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between border-b border-zinc-800 pb-1">
              <span className="font-mono text-xs">{m.user_id}</span>
              <span className="text-zinc-400">{m.role}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={inviteUserId} onChange={(e) => setInviteUserId(e.target.value)}
            placeholder="User UUID to invite"
            className="flex-1 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm font-mono"
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm">
            <option value="owner">owner</option>
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="collaborator">collaborator</option>
            <option value="viewer">viewer</option>
          </select>
          <button onClick={invite} className="rounded-md bg-zinc-100 text-zinc-900 text-sm px-3 py-1.5">Invite</button>
        </div>
      </GovernedStep>

      <GovernedStep
        title="Custom fields"
        whatThisIs="Tenant-defined extra fields you can attach to releases, tracks, writers, or publishers."
        whyItMatters="Different artists track different things (sub-publishers by region, ad campaigns, exclusivity dates). Custom fields let your workflow fit reality."
        whatYouNeed="A field key (snake_case), label, type, and optional dropdown options."
        estimatedTime="1-2 min per field"
        commonMistakes="Reusing the same field_key for two different concepts. Keep them stable and meaningful."
      >
        <h3 className="font-medium mb-2">Existing fields</h3>
        <ul className="space-y-1 mb-3 text-sm">
          {fields.map((f) => (
            <li key={f.id} className="flex justify-between border-b border-zinc-800 pb-1">
              <span>
                <code className="text-xs text-zinc-400">{f.entity_type}.{f.field_key}</code>{' '}
                <span className="text-zinc-200">{f.field_label}</span>
              </span>
              <span className="text-zinc-400 text-xs">{f.field_type}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-5 gap-2">
          <select value={newField.entity_type} onChange={(e) => setNewField({ ...newField, entity_type: e.target.value })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm">
            <option value="release">release</option>
            <option value="track">track</option>
            <option value="writer">writer</option>
            <option value="publisher">publisher</option>
          </select>
          <input placeholder="field_key" value={newField.field_key}
            onChange={(e) => setNewField({ ...newField, field_key: e.target.value })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm" />
          <input placeholder="Label" value={newField.field_label}
            onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm" />
          <select value={newField.field_type} onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
            className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm">
            {['text', 'number', 'date', 'dropdown', 'boolean', 'multi_select', 'url', 'file'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button onClick={addField} className="rounded-md bg-zinc-100 text-zinc-900 text-sm">Add</button>
          {(newField.field_type === 'dropdown' || newField.field_type === 'multi_select') && (
            <input className="col-span-5 rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm"
              placeholder="Options (comma-separated)" value={newField.options}
              onChange={(e) => setNewField({ ...newField, options: e.target.value })} />
          )}
        </div>
      </GovernedStep>

      <TrainingBlock topic="publishing_admin" />
      <TrainingBlock topic="master_owner" />
    </div>
  );
}
