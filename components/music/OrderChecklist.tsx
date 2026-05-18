'use client';

import { useState } from 'react';
import type { StepStatus } from '@/lib/permissions/order-of-operations';

interface Props {
  releaseId: string;
  steps: StepStatus[];
  onOverridden?: () => void;
}

export function OrderChecklist({ releaseId, steps, onOverridden }: Props) {
  const [overrideStep, setOverrideStep] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function submitOverride() {
    if (!overrideStep || !reason.trim()) return;
    const res = await fetch(`/api/music/releases/${releaseId}/override`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: overrideStep, reason }),
    });
    if (res.ok) {
      setOverrideStep(null);
      setReason('');
      onOverridden?.();
    } else alert((await res.json()).error);
  }

  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm">
      <h3 className="font-medium mb-3">Order of operations</h3>
      <ol className="space-y-2">
        {steps.map((s) => (
          <li key={s.step.id} className="flex items-start gap-2">
            <span className="text-xs w-5 text-zinc-500">{s.step.order}.</span>
            <div className="flex-1">
              <p className={
                s.state === 'complete' ? 'text-emerald-400'
                : s.state === 'overridden' ? 'text-amber-400'
                : 'text-zinc-200'
              }>
                {s.step.title}
                {s.state === 'complete' && ' ✓'}
                {s.state === 'overridden' && ' (overridden)'}
              </p>
              {s.missing.length > 0 && (
                <ul className="text-xs text-zinc-500 mt-1 list-disc list-inside">
                  {s.missing.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
              {s.state === 'incomplete' && (
                <button onClick={() => setOverrideStep(s.step.id)}
                  className="text-xs text-zinc-500 underline mt-1">
                  Mark completed outside system
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {overrideStep && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <p className="text-xs mb-2">Override: <code>{overrideStep}</code></p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this step complete outside the system?"
            className="w-full rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs mb-2" rows={2} />
          <div className="flex gap-2">
            <button onClick={submitOverride}
              className="rounded-md bg-amber-500 text-zinc-900 text-xs px-2 py-1">Confirm override</button>
            <button onClick={() => setOverrideStep(null)} className="text-xs text-zinc-400">Cancel</button>
          </div>
        </div>
      )}
    </aside>
  );
}
