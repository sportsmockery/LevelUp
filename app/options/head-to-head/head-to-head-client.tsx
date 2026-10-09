'use client';

import { useMemo, useState } from 'react';
import {
  atElapsed,
  compare,
  marRatio,
  perTradeMoments,
  VERDICT_COPY,
  type BookStats,
} from '@/lib/options/significance';
import { RULEBOOK_CONFIG } from '@/lib/options/montecarlo';
import { cn } from '@/lib/utils';

const pct = (n: number, dp = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n * 100).toFixed(dp)}%`;
const plain = (n: number, dp = 0) => `${(n * 100).toFixed(dp)}%`;

/** Our per-trade volatility is derived from the published rules, not assumed. */
const OURS = perTradeMoments(
  RULEBOOK_CONFIG.winRate,
  RULEBOOK_CONFIG.riskPerTrade,
  RULEBOOK_CONFIG.payoffRatio
);

/**
 * Illustrative opponents. Nothing here is a real track record — the point of
 * the screen is the arithmetic that relates any gap to its significance, and
 * these numbers exist so that arithmetic has something to chew on until the
 * live track supplies real ones.
 */
const INITIAL: BookStats[] = [
  { id: 'us', name: 'ThetaDesk', periodReturn: 0.091, maxDrawdown: 0.07, perTradeVol: OURS.sd, volAssumed: false, isUs: true },
  { id: 'desk', name: "The desk's trader", periodReturn: 0.04, maxDrawdown: 0.19, perTradeVol: OURS.sd * 1.4, volAssumed: true },
  { id: 'spy', name: 'SPY (buy & hold)', periodReturn: 0.11, maxDrawdown: 0.14, perTradeVol: OURS.sd * 1.2, volAssumed: true },
  { id: 'put', name: 'CBOE PutWrite', periodReturn: 0.08, maxDrawdown: 0.11, perTradeVol: OURS.sd * 1.1, volAssumed: true },
];

function VerdictChip({ verdict }: { verdict: 'significant' | 'suggestive' | 'noise' }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
        verdict === 'significant' && 'border-teal-600 bg-teal-950/40 text-teal-300',
        verdict === 'suggestive' && 'border-amber-700 bg-amber-950/30 text-amber-400',
        verdict === 'noise' && 'border-slate-700 text-slate-500'
      )}
    >
      {VERDICT_COPY[verdict].label}
    </span>
  );
}

/**
 * The observed gap drawn against the spread of gaps the null hypothesis
 * produces. Makes "inside what luck does routinely" something you can see
 * rather than a p-value you have to take on trust.
 */
function NullPlot({ z }: { z: number }) {
  const W = 520;
  const H = 74;
  const mid = W / 2;
  const zClamped = Math.max(-3.6, Math.min(3.6, z));
  const x = mid + (zClamped / 3.6) * (W / 2 - 18);
  const band = (sd: number) => (sd / 3.6) * (W / 2 - 18);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-w-[520px]"
      role="img"
      aria-label={`Observed gap at ${z.toFixed(2)} standard errors from zero`}
    >
      {/* ±2σ — outside this is the 5% tail */}
      <rect x={mid - band(2)} y={18} width={band(2) * 2} height={26} fill="#1e293b" />
      {/* ±1σ — the routine middle */}
      <rect x={mid - band(1)} y={18} width={band(1) * 2} height={26} fill="#334155" />
      <line x1={mid} y1={14} x2={mid} y2={48} stroke="#64748b" strokeWidth={1} strokeDasharray="2 3" />
      <text x={mid} y={62} fill="#64748b" fontSize={9} fontFamily="monospace" textAnchor="middle">
        no difference
      </text>
      <text x={mid - band(2)} y={62} fill="#475569" fontSize={9} fontFamily="monospace" textAnchor="middle">
        −2σ
      </text>
      <text x={mid + band(2)} y={62} fill="#475569" fontSize={9} fontFamily="monospace" textAnchor="middle">
        +2σ
      </text>
      {/* The observed gap */}
      <line x1={x} y1={10} x2={x} y2={52} stroke="#5eead4" strokeWidth={2.5} />
      <circle cx={x} cy={10} r={3.5} fill="#5eead4" />
      <text
        x={Math.max(26, Math.min(W - 26, x))}
        y={6}
        fill="#5eead4"
        fontSize={9}
        fontFamily="monospace"
        textAnchor="middle"
      >
        {z >= 0 ? '+' : '−'}
        {Math.abs(z).toFixed(2)}σ
      </text>
    </svg>
  );
}

export default function HeadToHeadClient() {
  const [books, setBooks] = useState<BookStats[]>(INITIAL);
  const [months, setMonths] = useState(12);
  const [opponentId, setOpponentId] = useState('desk');

  const tradesPerYear = RULEBOOK_CONFIG.tradesPerYear;
  const tradesElapsed = Math.max(1, Math.round((months / 12) * tradesPerYear));

  const us = books.find((b) => b.isUs)!;
  const opponent = books.find((b) => b.id === opponentId) ?? books[1];
  // The entered figures are annualised rates, so compound each book to the
  // elapsed point before testing — a longer track must grow the gap, not just
  // the trade count.
  const matchup = useMemo(
    () => compare(atElapsed(us, months), atElapsed(opponent, months), tradesElapsed, tradesPerYear),
    [us, opponent, months, tradesElapsed, tradesPerYear]
  );

  const ranked = [...books].sort((a, b) => b.periodReturn - a.periodReturn);
  const setReturn = (id: string, v: number) =>
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, periodReturn: v } : b)));

  return (
    <div className="space-y-8">
      {/* Elapsed */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="h2h-months"
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500"
          >
            Months elapsed
          </label>
          <span className="font-mono text-sm font-bold tabular-nums text-slate-100">
            {months}mo · {tradesElapsed} trades
          </span>
        </div>
        <input
          id="h2h-months"
          type="range"
          min={1}
          max={60}
          step={1}
          value={months}
          onChange={(e) => setMonths(parseInt(e.target.value, 10))}
          className="mt-2 w-full accent-teal-400"
        />
        <p className="mt-1 text-[11px] text-slate-600">
          Both books compound at the annualised rates below. Drag it out to see when the gap
          stops being something chance produces routinely.
        </p>
      </section>

      {/* Scoreboard as asked for */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">
          The scoreboard he asked for
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Highest return wins. Figures are annualised and editable — put his desk&rsquo;s real
          numbers in and watch what the verdict below does.
        </p>

        {/* Column headings where there are columns to head — on a phone each
            cell carries its own label instead. */}
        <div className="mt-4 hidden gap-x-4 px-4 pb-2 sm:grid sm:grid-cols-[1.4fr_repeat(3,minmax(0,0.8fr))]">
          {['Book', 'Return p.a.', 'Max DD', 'MAR'].map((h) => (
            <span
              key={h}
              className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500"
            >
              {h}
            </span>
          ))}
        </div>

        <div className="space-y-px overflow-hidden rounded-lg bg-slate-800">
          {ranked.map((b, i) => {
            const mar = marRatio(b);
            return (
              <div
                key={b.id}
                className={cn(
                  'grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[1.4fr_repeat(3,minmax(0,0.8fr))] sm:items-baseline',
                  b.isUs ? 'bg-teal-950/25' : 'bg-[#070c10]'
                )}
              >
                <div className="col-span-2 flex items-baseline gap-2 sm:col-span-1">
                  <span className="font-mono text-[10px] tabular-nums text-slate-600">
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      b.isUs ? 'text-teal-300' : 'text-slate-200'
                    )}
                  >
                    {b.name}
                  </span>
                  {b.volAssumed && (
                    <span
                      title="No trade log published, so per-trade volatility is assumed"
                      className="font-mono text-[9px] uppercase tracking-wider text-slate-600"
                    >
                      est.
                    </span>
                  )}
                </div>

                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-600 sm:hidden">
                    Return p.a.
                  </div>
                  <input
                    type="number"
                    step={0.5}
                    aria-label={`${b.name} annualised return, percent`}
                    value={+(b.periodReturn * 100).toFixed(1)}
                    onChange={(e) => setReturn(b.id, (parseFloat(e.target.value) || 0) / 100)}
                    className="w-20 rounded border border-slate-700 bg-transparent px-1.5 py-0.5 font-mono text-sm tabular-nums text-slate-100 focus-visible:outline-2 focus-visible:outline-teal-400"
                  />
                </div>

                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-600 sm:hidden">
                    Max DD
                  </div>
                  <span className="font-mono text-sm tabular-nums text-slate-400">
                    {plain(b.maxDrawdown)}
                  </span>
                </div>

                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-600 sm:hidden">
                    MAR
                  </div>
                  <span
                    className={cn(
                      'font-mono text-sm font-bold tabular-nums',
                      (mar ?? 0) >= 1 ? 'text-teal-400' : 'text-slate-300'
                    )}
                  >
                    {mar === null ? '—' : mar.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Is the lead real */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">
            Is the lead real?
          </h2>
          <label className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            vs
            <select
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              className="rounded border border-slate-700 bg-[#0b1116] px-2 py-1 font-mono text-[11px] text-slate-200 focus-visible:outline-2 focus-visible:outline-teal-400"
            >
              {books
                .filter((b) => !b.isUs)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
              Observed gap
            </div>
            <div
              className={cn(
                'mt-1 font-mono text-2xl font-bold tabular-nums',
                matchup.displayGap >= 0 ? 'text-teal-400' : 'text-red-400'
              )}
            >
              {pct(matchup.displayGap)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
              p-value
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-100">
              {matchup.pValue < 0.001 ? '<0.001' : matchup.pValue.toFixed(3)}
            </div>
          </div>
          <div className="self-end pb-1.5">
            <VerdictChip verdict={matchup.verdict} />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <NullPlot z={matchup.z} />
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          {VERDICT_COPY[matchup.verdict].gloss}{' '}
          {matchup.verdict !== 'significant' && Number.isFinite(matchup.monthsToSignificance) && (
            <>
              At the current rate, the gap clears the 95% bar after roughly{' '}
              <b className="font-mono text-slate-200">
                {Math.round(matchup.tradesToSignificance).toLocaleString()} trades
              </b>{' '}
              — about{' '}
              <b className="font-mono text-slate-200">
                {matchup.monthsToSignificance >= 120
                  ? `${(matchup.monthsToSignificance / 12).toFixed(0)} years`
                  : `${Math.round(matchup.monthsToSignificance)} months`}
              </b>
              .
            </>
          )}
        </p>
      </section>

      {/* What actually decides it */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">
          The scoreboard that decides it
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Return needs years to separate two books. These four separate them inside one. Three
          we can produce today; two a discretionary desk structurally cannot.
        </p>

        <div className="mt-4 space-y-px overflow-hidden rounded-lg bg-slate-800">
          {[
            {
              k: 'MAR ratio',
              why: 'Drawdown is observed continuously, not once at the end, so it carries far more information per month than the final number.',
              who: 'Both sides, from a daily equity curve.',
              ours: true,
            },
            {
              k: 'Rule-adherence rate',
              why: 'Measured per decision. 72 trades is a poor return sample and a perfectly good compliance sample.',
              who: 'Only a systematic book — discretion has no denominator.',
              ours: true,
            },
            {
              k: 'Behaviour at the tail',
              why: 'One vol event tells you more than eleven quiet months. Scored on the worst week, not the average one.',
              who: 'Both — and the comparison most worth having.',
              ours: true,
            },
            {
              k: 'Forward calibration',
              why: 'Publish the distribution first, then score where the result landed in it. Testable in one year; returns are not.',
              who: 'Only a side that published a distribution.',
              ours: true,
            },
          ].map((row) => (
            <div key={row.k} className="bg-[#070c10] px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-slate-200">{row.k}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-teal-500">
                  decidable at n=72
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{row.why}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-600">{row.who}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="max-w-3xl font-mono text-[11px] leading-relaxed text-slate-600">
        Opponent figures are illustrative and editable; no track record is represented and no
        trading has taken place. Our per-trade volatility is derived from the published rules
        (win rate {plain(RULEBOOK_CONFIG.winRate)}, risk{' '}
        {plain(RULEBOOK_CONFIG.riskPerTrade, 2)}, payoff{' '}
        {RULEBOOK_CONFIG.payoffRatio.toFixed(2)}×); a book that publishes no trade log is marked
        &ldquo;est.&rdquo; because its volatility has to be assumed. The test treats per-trade
        log returns as i.i.d. and normal in aggregate — deliberately a weak test, which makes a
        win harder to claim rather than easier.
      </p>
    </div>
  );
}
