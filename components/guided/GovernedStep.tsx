'use client';

import { ReactNode } from 'react';

export interface GovernedStepProps {
  title: string;
  whatThisIs: string;
  whyItMatters: string;
  whatYouNeed: string | string[];
  estimatedTime: string;
  commonMistakes: string | string[];
  children?: ReactNode;
}

export function GovernedStep(props: GovernedStepProps) {
  const need = Array.isArray(props.whatYouNeed) ? props.whatYouNeed : [props.whatYouNeed];
  const mistakes = Array.isArray(props.commonMistakes) ? props.commonMistakes : [props.commonMistakes];
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 my-4">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-heading">{props.title}</h2>
        <span className="text-xs uppercase tracking-wide text-zinc-500">{props.estimatedTime}</span>
      </header>
      <div className="grid gap-4 md:grid-cols-2 mb-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500 mb-1">What this is</p>
          <p className="text-zinc-200">{props.whatThisIs}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500 mb-1">Why it matters</p>
          <p className="text-zinc-200">{props.whyItMatters}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500 mb-1">What you need</p>
          <ul className="list-disc list-inside text-zinc-200 space-y-0.5">
            {need.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500 mb-1">Common mistakes</p>
          <ul className="list-disc list-inside text-zinc-200 space-y-0.5">
            {mistakes.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      </div>
      {props.children && (
        <div className="border-t border-zinc-800 pt-4">{props.children}</div>
      )}
    </section>
  );
}

export default GovernedStep;
