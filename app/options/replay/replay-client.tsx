'use client';

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { REGIME_STUDY, isPartialYear, SOURCES, type RegimeYear } from '@/lib/options/history';
import { cn } from '@/lib/utils';

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const signed = (n: number, dp = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(dp)}%`;

const POS = '#2dd4bf';
const NEG = '#f05252';

function YearTooltip({ active, payload }: { active?: boolean; payload?: { payload: RegimeYear }[] }) {
  if (!active || !payload?.length) return null;
  const y = payload[0].payload;
  const rows: [string, string][] = [
    ['return', signed(y.ret)],
    ['worst drawdown', `${y.maxDD.toFixed(1)}%`],
    ['trades taken', `${y.trades}`],
    ['entries declined', `${y.standDown} of ${y.entries}`],
    ['mean VIX', y.vix != null ? y.vix.toFixed(1) : '—'],
    ['realised vol', y.realizedVol != null ? y.realizedVol.toFixed(1) : '—'],
    ['variance premium', y.vrp != null ? `${y.vrp > 0 ? '+' : ''}${y.vrp.toFixed(1)} vols` : '—'],
    ['S&P worst day', y.spxWorstDay != null ? `${y.spxWorstDay.toFixed(1)}%` : '—'],
  ];
  return (
    <div className="rounded-md border border-slate-700 bg-[#0b1116] px-3 py-2 shadow-lg">
      <div className="font-mono text-[11px] font-bold text-slate-100">
        {y.year}
        {isPartialYear(y) && <span className="ml-1.5 text-slate-500">partial</span>}
      </div>
      <div className="mt-1.5 space-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-6">
            <span className="font-mono text-[11px] text-slate-500">{k}</span>
            <span className="font-mono text-[11px] tabular-nums text-slate-200">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReplayClient() {
  const s = REGIME_STUDY;
  const full = s.years.filter((y) => !isPartialYear(y));
  const negatives = full.filter((y) => y.ret < 0).length;
  const best = full.reduce((a, b) => (b.ret > a.ret ? b : a));
  const worst = full.reduce((a, b) => (b.ret < a.ret ? b : a));

  return (
    <div className="space-y-8">
      {/* Headline */}
      <section className="grid gap-px overflow-hidden rounded-lg bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '10-year result', value: money(s.finalEquity), unit: `FROM ${money(s.startEquity)}`, tone: 'default' },
          { label: 'CAGR, net of costs', value: `${s.cagr.toFixed(1)}%`, unit: 'AFTER COMMISSION + SLIPPAGE', tone: 'accent' },
          { label: 'Worst drawdown', value: `${s.maxDD.toFixed(1)}%`, unit: 'LIMIT IS 20%', tone: 'warn' },
          { label: 'Losing years', value: `${negatives} of ${full.length}`, unit: `WORST ${worst.year}: ${signed(worst.ret)}`, tone: 'default' },
        ].map((t) => (
          <div key={t.label} className="bg-[#070c10] px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
              {t.label}
            </div>
            <div
              className={cn(
                'mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight sm:text-3xl',
                t.tone === 'accent' && 'text-teal-400',
                t.tone === 'warn' && 'text-amber-400',
                t.tone === 'default' && 'text-slate-100'
              )}
            >
              {t.value}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-wide text-slate-600">{t.unit}</div>
          </div>
        ))}
      </section>

      {/* Annual bars */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">
            Return by calendar year
          </h2>
          <span className="font-mono text-[10px] text-slate-500">
            {best.year} {signed(best.ret)} best · {worst.year} {signed(worst.ret)} worst
          </span>
        </div>
        <div className="h-60 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.years} margin={{ top: 6, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#1e293b"
                tickLine={false}
                minTickGap={8}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#1e293b"
                tickLine={false}
                width={44}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip cursor={{ fill: '#1e293b40' }} content={<YearTooltip />} />
              <Bar dataKey="ret" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {s.years.map((y) => (
                  <Cell
                    key={y.year}
                    fill={y.ret >= 0 ? POS : NEG}
                    fillOpacity={isPartialYear(y) ? 0.4 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 px-1 font-mono text-[10px] text-slate-600">
          Faded bars are partial years — the data window opens Oct 2016 and ends Oct 2026.
        </p>
      </section>

      {/* The table */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">
          Year by year, against the regime that produced it
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          The variance risk premium — implied vol minus the vol that actually followed — is the
          edge being harvested. It was positive in every one of the ten years, and it compressed
          hardest exactly when the drawdowns came.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                {['Year', 'Return', 'Worst DD', 'Trades', 'Declined', 'VIX', 'Realised', 'VRP', 'S&P worst day'].map((h) => (
                  <th
                    key={h}
                    className="pb-2.5 pr-5 text-left font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.years.map((y) => {
                const partial = isPartialYear(y);
                return (
                  <tr key={y.year} className={cn('border-b border-slate-800/60', partial && 'opacity-55')}>
                    <td className="py-2.5 pr-5 font-mono text-xs font-bold tabular-nums text-slate-200">
                      {y.year}
                      {partial && <span className="ml-1 font-normal text-slate-600">·</span>}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 pr-5 font-mono text-xs font-bold tabular-nums',
                        y.ret >= 0 ? 'text-teal-400' : 'text-red-400'
                      )}
                    >
                      {signed(y.ret)}
                    </td>
                    <td className="py-2.5 pr-5 font-mono text-xs tabular-nums text-slate-400">
                      {y.maxDD.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pr-5 font-mono text-xs tabular-nums text-slate-400">
                      {y.trades}
                    </td>
                    <td className="py-2.5 pr-5 font-mono text-xs tabular-nums text-slate-500">
                      {y.standDown}/{y.entries}
                    </td>
                    <td className="py-2.5 pr-5 font-mono text-xs tabular-nums text-slate-400">
                      {y.vix?.toFixed(1) ?? '—'}
                    </td>
                    <td className="py-2.5 pr-5 font-mono text-xs tabular-nums text-slate-400">
                      {y.realizedVol?.toFixed(1) ?? '—'}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 pr-5 font-mono text-xs font-bold tabular-nums',
                        (y.vrp ?? 0) >= 3 ? 'text-teal-400' : 'text-amber-400'
                      )}
                    >
                      {y.vrp != null ? `${y.vrp > 0 ? '+' : ''}${y.vrp.toFixed(1)}` : '—'}
                    </td>
                    <td className="py-2.5 pr-5 font-mono text-xs tabular-nums text-slate-500">
                      {y.spxWorstDay != null ? `${y.spxWorstDay.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* What the study found */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">What it turned up</h2>
        <div className="mt-4 space-y-px overflow-hidden rounded-lg bg-slate-800">
          {[
            {
              t: 'The kill-switch ladder deadlocks',
              d: 'LOCKDOWN permits zero new positions, so equity cannot rise, so drawdown never falls, so the book is frozen permanently. In the first run it locked in 2022 and never traded again. This study gives LOCKDOWN a single half-size probe so the book can climb out — rulebook §9 needs the same amendment.',
              tone: 'danger',
            },
            {
              t: 'Costs are the dominant drag at this size',
              d: 'At $10.60 a round trip, friction took the result from 11.3% CAGR to 6.9%. On a $10,000 account that is roughly 5% of equity a year going to commission and slippage. It is the clearest evidence yet that the challenge is capital-constrained rather than skill-constrained.',
              tone: 'warn',
            },
            {
              t: 'The premium is persistent, and thin exactly when it matters',
              d: 'Implied exceeded subsequent realised vol in all ten years — the edge is real and it never inverted annually. But it compressed to +0.6 vols in 2018 and +1.8 in 2022, which is precisely when the drawdowns arrived. The edge is smallest when you most need it.',
              tone: 'accent',
            },
            {
              t: 'Two calm years carry the decade',
              d: '2017 and 2021 returned +35.4% and +36.2%; strip them out and the remaining eight years are roughly flat. A strategy whose record depends on the two lowest-realised-vol years in modern history should be described that way.',
              tone: 'warn',
            },
          ].map((f) => (
            <div key={f.t} className="bg-[#070c10] px-4 py-3.5">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    f.tone === 'danger' && 'bg-red-500',
                    f.tone === 'warn' && 'bg-amber-500',
                    f.tone === 'accent' && 'bg-teal-500'
                  )}
                />
                <span className="text-sm font-semibold text-slate-200">{f.t}</span>
              </div>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Provenance */}
      <section className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">
          This is not a backtest
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          There is still no historical option-chain vendor, so there are no real bid/ask quotes,
          no real IV rank, no assignment modelling and no real fills behind these numbers. What
          is real: the index path, the VIX at every entry, whether the strike we would have sold
          was actually breached, and the clustering of those breaches. What is modelled: the
          option economics, in the rulebook&rsquo;s equity terms.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Treat it as a regime study — a real step up from a pure Monte Carlo and a real step
          down from the chain-level backtest in build plan §8. The honest headline is that it
          lands <b className="text-slate-200">below</b> the rulebook&rsquo;s published 10&ndash;18%
          band once costs are charged.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-slate-500">
          {SOURCES.map((src) => (
            <a
              key={src.id}
              href={src.href}
              target="_blank"
              rel="noreferrer"
              className="text-teal-500 underline-offset-2 hover:underline"
            >
              {src.label} ({src.id})
            </a>
          ))}
          <span>generated {s.generatedAt}</span>
        </div>
      </section>
    </div>
  );
}
