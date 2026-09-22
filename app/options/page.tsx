import { supabaseServer } from '@/lib/supabase-server';
import { KILLSWITCH_LADDER, type KillswitchRung } from '@/lib/options/types';
import { computeRulesVersion, RULE_COUNT } from '@/lib/options/rules';
import {
  GUTTER,
  PageHeader,
  PendingPanel,
  ScaffoldNotice,
  StatRow,
  StatTile,
} from './_components/phase-shell';
import { cn } from '@/lib/utils';

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

/** Colour ramp for the ladder, coolest rung to hottest. */
const RUNG_STRIPE = ['bg-teal-500', 'bg-yellow-500', 'bg-amber-600', 'bg-orange-700', 'bg-red-600'];

function rungFields(rung: KillswitchRung) {
  const halt = rung.state === 'HALT';
  return {
    halt,
    drawdown: rung.drawdownFloor === 0 ? '< 8%' : `>= ${(rung.drawdownFloor * 100).toFixed(0)}%`,
    maxBp: `${(rung.maxBpUtilization * 100).toFixed(0)}%`,
    structures:
      rung.maxBpUtilization === 0
        ? 'flat everything'
        : rung.definedRiskOnly
          ? 'defined-risk only'
          : 'all',
    newPositions:
      rung.maxNewPositionsPerWeek === null
        ? 'unrestricted'
        : rung.maxNewPositionsPerWeek === 0
          ? halt
            ? 'contest forfeited'
            : 'none'
          : `${rung.maxNewPositionsPerWeek}/wk, ${rung.sizeMultiplier * 100}% size`,
  };
}

const LADDER_COLS = 'md:grid-cols-[110px_84px_72px_minmax(0,1fr)_minmax(0,1.1fr)]';

export default async function OptionsLivePage() {
  const accounts = await loadAccounts();
  const rulesVersion = computeRulesVersion();

  return (
    <div className="pb-14">
      <PageHeader
        eyebrow="Beat 0:00 — Live"
        title="Equity curve and chain verification"
        blurb="The opening screen of the client demo: $10,000 to today against SPY and the CBOE PutWrite index, with the audit chain's latest anchor linked through to its public commit."
      />

      <div className={cn('py-6 sm:py-7', GUTTER)}>
        <StatRow>
          <StatTile label="Starting equity" value="$10,000" unit="BOTH SIDES" />
          <StatTile label="Rules version" value={rulesVersion} unit={`${RULE_COUNT} RULES`} tone="accent" />
          <StatTile label="Drawdown cap" value="20%" unit="FORFEITURE LINE" />
          <StatTile label="Track started" value="—" unit="PHASE 6" tone="muted" />
          <StatTile label="Chain entries" value="0" unit="NOT YET LIVE" tone="muted" wide />
        </StatRow>

        <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <PendingPanel
            phase="Phase 1–2"
            heading="Equity curve"
            items={[
              'Daily marks at the 16:00 ET official close, NBBO mid for options, read from td_equity_snapshots.',
              'Benchmark overlays on a shared axis: SPY total return and the CBOE PutWrite index, under the same cost model.',
              'Rules-version changes annotated inline, so a threshold change is visible on the curve rather than buried in a changelog.',
            ]}
          />

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
              Tracked books
            </div>
            {accounts === null ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Migration not applied yet, or Supabase credentials are unavailable in this
                environment. Apply{' '}
                <code className="break-all font-mono text-xs text-slate-300">
                  20260920000000_theta_desk.sql
                </code>{' '}
                to seed the four books.
              </p>
            ) : accounts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No books seeded.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {accounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
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

        <section className="mt-9">
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">
            Kill-switch ladder
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Rulebook §9. Evaluated before every order submission rather than on a schedule.
            Encoded in{' '}
            <code className="font-mono text-xs whitespace-nowrap text-slate-300">lib/options/types.ts</code>.
          </p>

          {/* Column headings only where there are columns to head. */}
          <div
            className={cn(
              'mt-5 hidden gap-x-4 border-b border-slate-800 pb-2.5 pl-4 md:grid',
              LADDER_COLS
            )}
          >
            {['State', 'Drawdown', 'Max BP', 'Structures', 'New positions'].map((h) => (
              <span
                key={h}
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500"
              >
                {h}
              </span>
            ))}
          </div>

          <div className="mt-3 space-y-2 md:mt-0 md:space-y-0">
            {KILLSWITCH_LADDER.map((rung, i) => {
              const f = rungFields(rung);
              return (
                <div
                  key={rung.state}
                  className={cn(
                    'relative grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-md border border-slate-800 py-3 pl-4 pr-3 sm:grid-cols-4',
                    'md:items-baseline md:gap-y-0 md:rounded-none md:border-0 md:border-b md:border-slate-800/60 md:py-3 md:pr-0',
                    LADDER_COLS,
                    f.halt && 'border-red-900/60 bg-red-950/20 md:bg-transparent'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute bottom-0 left-0 top-0 w-1 rounded-l-md md:rounded-none',
                      RUNG_STRIPE[i]
                    )}
                  />
                  <span
                    className={cn(
                      'col-span-2 text-sm font-semibold sm:col-span-4 md:col-span-1',
                      f.halt ? 'text-red-400' : 'text-slate-200'
                    )}
                  >
                    {rung.state}
                  </span>

                  {/* Each cell carries its own label on a phone, where there is
                      no column heading to read it from. */}
                  {(
                    [
                      ['Drawdown', f.drawdown],
                      ['Max BP', f.maxBp],
                      ['Structures', f.structures],
                      ['New positions', f.newPositions],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-600 md:hidden">
                        {label}
                      </div>
                      <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-400 md:mt-0">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <ScaffoldNotice className="mt-9" />
      </div>
    </div>
  );
}
