// GovernedStep — the framed, locked education layout used on every page.
// Renders: title, what-this-is, why-it-matters, what-you-need, estimated time,
// common mistakes, and the actual interactive content as children.

import { type ReactNode } from 'react';

export interface GovernedStepProps {
  title: string;
  whatThisIs: string;
  whyItMatters: string;
  whatYouNeed: string[];
  estimatedTime: string;
  commonMistakes: string[];
  children?: ReactNode;
}

export function GovernedStep(props: GovernedStepProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-heading font-semibold text-white">{props.title}</h2>
        <p className="text-sm text-white/70">{props.whatThisIs}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Pane label="Why it matters" body={props.whyItMatters} />
        <Pane label="What you need" body={<ul className="list-disc pl-5 space-y-1">{props.whatYouNeed.map((x, i) => <li key={i}>{x}</li>)}</ul>} />
        <Pane label="Estimated time" body={props.estimatedTime} />
      </div>

      {props.commonMistakes.length > 0 && (
        <Pane
          label="Common mistakes"
          tone="warn"
          body={<ul className="list-disc pl-5 space-y-1">{props.commonMistakes.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        />
      )}

      {props.children && <div className="pt-2 border-t border-white/10">{props.children}</div>}
    </section>
  );
}

function Pane({ label, body, tone = 'default' }: { label: string; body: ReactNode; tone?: 'default' | 'warn' }) {
  return (
    <div
      className={
        'rounded-xl p-4 ' +
        (tone === 'warn'
          ? 'bg-amber-500/10 border border-amber-400/30 text-amber-100'
          : 'bg-white/[0.03] border border-white/10 text-white/85')
      }
    >
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">{label}</div>
      <div className="text-sm leading-relaxed">{body}</div>
    </div>
  );
}
