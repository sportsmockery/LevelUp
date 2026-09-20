import { supabaseServer } from '@/lib/supabase-server';
import { KILLSWITCH_LADDER } from '@/lib/options/types';
import { computeRulesVersion, RULE_COUNT } from '@/lib/options/rules';
import { PageHeader, PendingPanel, StatTile } from './_components/phase-shell';

export const dynamic = 'force-dynamic';

type AccountRow = { id: string; label: string; kind: string; starting_nlv: number };

/**
 * Reads the seeded books if the migration has been applied. Returns null when
 * the schema, the env vars or the connection are absent, so the scaffold
 * deploys and renders before Phase 1 wires up any data.
 */
async function loadAccounts(): Promise<AccountRow[] | null> {
  if (!supabaseServer) return null;
  const { data, error } = await supabaseServer
    .from('td_accounts')
    .select('id, label, kind, starting_nlv')
    .order('kind');
  if (error) return null;
  return data as AccountRow[];
}

export default async function ThetaLivePage() {
  const accounts = await loadAccounts();
  const rulesVersion = computeRulesVersion();

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Beat 0:00 — Live"
        title="Equity curve and chain verification"
        blurb="The opening screen of the client demo: $10,000 to today against SPY and the CBOE PutWrite index, with the audit chain's latest anchor linked through to its public commit."
      />

      <div className="px-8 py-7">
        <div className="flex flex-wrap border-b border-slate-800 pb-5">
          <StatTile label="Starting equity" value="$10,000" unit="BOTH SIDES" />
          <StatTile label="Rules version" value={rulesVersion} unit={`${RULE_COUNT} RULES`} tone="accent" />
          <StatTile label="Drawdown cap" value="20%" unit="FORFEITURE LINE" />
          <StatTile label="Track started" value="—" unit="PHASE 6" tone="muted" />
          <StatTile label="Chain entries" value="0" unit="NOT YET LIVE" tone="muted" />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <PendingPanel
            phase="Phase 1–2"
            heading="Equity curve"
            items={[
              'Daily marks at the 16:00 ET official close, NBBO mid for options, read from td_equity_snapshots.',
              'Benchmark overlays on a shared axis: SPY total return and the CBOE PutWrite index, under the same cost model.',
              'Rules-version changes annotated inline, so a threshold change is visible on the curve rather than buried in a changelog.',
            ]}
          />

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
              Tracked books
            </div>
            {accounts === null ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Migration not applied yet, or Supabase credentials are unavailable in this
                environment. Apply{' '}
                <code className="font-mono text-xs text-slate-300">
                  20260920000000_theta_desk.sql
                </code>{' '}
                to seed the four books.
              </p>
            ) : accounts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No books seeded.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-slate-200">{a.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {a.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">
            Kill-switch ladder
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Rulebook §9. Evaluated before every order submission rather than on a schedule.
            Encoded in{' '}
            <code className="font-mono text-xs text-slate-300">lib/options/types.ts</code>.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  {['State', 'Drawdown', 'Max BP', 'Structures', 'New positions'].map((h) => (
                    <th
                      key={h}
                      className="pb-2.5 pr-6 text-left font-mono text-[10px] uppercase tracking-[0.1em] font-medium text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KILLSWITCH_LADDER.map((rung) => {
                  const halt = rung.state === 'HALT';
                  return (
                    <tr key={rung.state} className="border-b border-slate-800/60">
                      <td
                        className={`py-3 pr-6 text-sm font-semibold ${
                          halt ? 'text-red-400' : 'text-slate-200'
                        }`}
                      >
                        {rung.state}
                      </td>
                      <td className="py-3 pr-6 font-mono text-xs tabular-nums text-slate-400">
                        {rung.drawdownFloor === 0
                          ? '< 8%'
                          : `>= ${(rung.drawdownFloor * 100).toFixed(0)}%`}
                      </td>
                      <td className="py-3 pr-6 font-mono text-xs tabular-nums text-slate-400">
                        {(rung.maxBpUtilization * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 pr-6 font-mono text-xs text-slate-400">
                        {rung.maxBpUtilization === 0
                          ? 'flat everything'
                          : rung.definedRiskOnly
                            ? 'defined-risk only'
                            : 'all'}
                      </td>
                      <td className="py-3 pr-6 font-mono text-xs tabular-nums text-slate-400">
                        {rung.maxNewPositionsPerWeek === null
                          ? 'unrestricted'
                          : rung.maxNewPositionsPerWeek === 0
                            ? halt
                              ? 'contest forfeited'
                              : 'none'
                            : `${rung.maxNewPositionsPerWeek}/wk, ${rung.sizeMultiplier * 100}% size`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-10 max-w-3xl font-mono text-[11px] leading-relaxed text-slate-600">
          Phase 0 scaffold. No market data is connected, no orders can be placed, and no track
          record is represented. Nothing on this surface is an offer, a solicitation, or
          investment advice.
        </p>
      </div>
    </div>
  );
}
