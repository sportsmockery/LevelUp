import { RULE_CATALOG, RULE_COUNT, computeRulesVersion } from '@/lib/theta/rules';
import type { RuleScope } from '@/lib/theta/types';
import { PageHeader, PendingPanel } from '../_components/phase-shell';

const SCOPE_ORDER: { scope: RuleScope; title: string; note: string }[] = [
  { scope: 'universe',   title: 'Universe',   note: 'Is this underlying tradeable at all today?' },
  { scope: 'entry',      title: 'Entry',      note: 'Is premium rich enough, and is the strike far enough out?' },
  { scope: 'sizing',     title: 'Sizing',     note: 'Can the account carry this position?' },
  { scope: 'portfolio',  title: 'Portfolio',  note: 'What does it do to the book as a whole?' },
  { scope: 'management', title: 'Management', note: 'When does the position get touched after entry?' },
  { scope: 'risk',       title: 'Risk',       note: 'Overlays that can veto any entry regardless of the above.' },
];

export default function ThetaBlotterPage() {
  const rulesVersion = computeRulesVersion();

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Beat 1:00 — Blotter"
        title="Every trade decomposes into the rules that produced it"
        blurb="The client picks any position and this opens against the option chain as it stood at the decision timestamp: each rule, the observed value, the threshold, pass or fail. Rejected candidates keep their traces too — the several hundred trades the system declined are the more persuasive half of the audit story."
      />

      <div className="px-8 py-7">
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

        <section className="mt-9">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-slate-200">Rule catalog</h2>
            <span className="font-mono text-[11px] text-slate-500">
              {RULE_COUNT} rules · version {rulesVersion}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            The declarative half of the engine, live from{' '}
            <code className="font-mono text-xs text-slate-300">lib/theta/rules.ts</code>. Each
            threshold traces to a numbered section of the rulebook; changing one produces a new
            version hash and is committed before it takes effect.
          </p>

          <div className="mt-6 space-y-7">
            {SCOPE_ORDER.map(({ scope, title, note }) => {
              const rules = RULE_CATALOG.filter((r) => r.scope === scope);
              return (
                <div key={scope}>
                  <div className="flex flex-wrap items-baseline gap-x-3 border-b border-slate-800 pb-2">
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-teal-400">
                      {title}
                    </h3>
                    <span className="font-mono text-[10px] tabular-nums text-slate-600">
                      {rules.length}
                    </span>
                    <span className="text-xs text-slate-500">{note}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] border-collapse">
                      <tbody>
                        {rules.map((r) => (
                          <tr key={r.id} className="border-b border-slate-800/50">
                            <td className="w-[34%] py-2.5 pr-6 font-mono text-xs text-slate-300">
                              {r.id}
                            </td>
                            <td className="w-[28%] py-2.5 pr-6 text-xs text-slate-400">
                              {r.label}
                            </td>
                            <td className="py-2.5 pr-6 font-mono text-xs tabular-nums text-slate-500">
                              {r.threshold}
                            </td>
                            <td className="w-16 py-2.5 text-right font-mono text-[10px] text-slate-600">
                              {r.source}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
