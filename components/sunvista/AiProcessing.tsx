'use client';

import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Presentational "AI is working" panel. The parent advances `currentStep`
// while the real request runs; steps before it render as complete.
export function AiProcessing({
  steps,
  currentStep,
  title = 'BuildAI is working…',
}: {
  steps: string[];
  currentStep: number;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-700/40 bg-amber-500/5 p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-amber-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        {title}
      </div>
      <div className="space-y-2.5">
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div
              key={step}
              className={cn(
                'flex items-center gap-3 text-sm transition-opacity',
                done ? 'text-emerald-300' : active ? 'text-slate-200' : 'text-slate-600'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border',
                  done
                    ? 'border-emerald-500 bg-emerald-500/20'
                    : active
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-700'
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                )}
              </span>
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}
