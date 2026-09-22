import { RULE_CATALOG, RULE_COUNT, computeRulesVersion } from '@/lib/options/rules';
import type { RuleScope } from '@/lib/options/types';
import { GUTTER, PageHeader, PendingPanel } from '../_components/phase-shell';
import { cn } from '@/lib/utils';

const SCOPE_ORDER: { scope: RuleScope; title: string; note: string }[] = [
  { scope: 'universe',   title: 'Universe',   note: 'Is this underlying tradeable at all today?' },
  { scope: 'entry',      title: 'Entry',      note: 'Is premium rich enough, and is the strike far enough out?' },
  { scope: 'sizing',     title: 'Sizing',     note: 'Can the account carry this position?' },
  { scope: 'portfolio',  title: 'Portfolio',  note: 'What does it do to the book as a whole?' },
  { scope: 'management', title: 'Management', note: 'When does the position get touched after entry?' },
  { scope: 'risk',       title: 'Risk',       note: 'Overlays that can veto any entry regardless of the above.' },
];

/** Stacks on a phone, lines up in columns once there is room. */
const RULE_COLS =
  'sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,1fr)_2.5rem] sm:items-baseline';

export default function OptionsBlotterPage() {
  const rulesVersion = computeRulesVersion();

  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 1:00 — Blotter"
        title="Every trade decomposes into the rules that produced it"
        blurb="The client picks any position and this opens against the option chain as it stood at the decision timestamp: each rule, the observed value, the threshold, pass or fail. Rejected candidates keep their traces too — the several hundred trades the system declined are the more persuasive half of the audit story."
      />

      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <PendingPanel
          phase="Phase 3"
          heading="Blotter and rule-trace panel"
          items={[
            'Position list from td_v_public_blotter, with realised P&L, close reason and days in trade.',
            'Trace panel from td_signals.rule_trace, rendered against the chain snapshot at decided_at.',
            'A reject view over status = rejected, grouped by the first rule that failed.',
            'Every row stamped with rules_version and data_version so any trade is reproducible.',
          ]}
        />

        <section className="mt-8">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-slate-200">Rule catalog</h2>
            <span className="font-mono text-[11px] text-slate-500">
              {RULE_COUNT} rules · version {rulesVersion}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            The declarative half of the engine, live from{' '}
            <code className="font-mono text-xs whitespace-nowrap text-slate-300">lib/options/rules.ts</code>.
            Each threshold traces to a numbered section of the rulebook; changing one produces a
            new version hash and is committed before it takes effect.
          </p>

          <div className="mt-6 space-y-7">
            {SCOPE_ORDER.map(({ scope, title, note }) => {
              const rules = RULE_CATALOG.filter((r) => r.scope === scope);
              return (
                <div key={scope}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-slate-800 pb-2">
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-teal-400">
                      {title}
                    </h3>
                    <span className="font-mono text-[10px] tabular-nums text-slate-600">
                      {rules.length}
                    </span>
                    <span className="text-xs text-slate-500">{note}</span>
                  </div>

                  <div>
                    {rules.map((r) => (
                      <div
                        key={r.id}
                        className={cn(
                          'grid gap-x-4 gap-y-0.5 border-b border-slate-800/50 py-2.5',
                          RULE_COLS
                        )}
                      >
                        <div className="break-words font-mono text-xs text-slate-300">{r.id}</div>
                        <div className="text-xs text-slate-400">{r.label}</div>
                        <div className="font-mono text-xs tabular-nums text-slate-500">
                          {r.threshold}
                        </div>
                        <div className="font-mono text-[10px] text-slate-600 sm:text-right">
                          {r.source}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
