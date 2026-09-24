'use client';

import { useMemo, useState } from 'react';
import { summariseShock, type Shock } from '@/lib/options/pricing';
import { SAMPLE_BOOK, SAMPLE_BOOK_DISCLAIMER, SHOCK_PRESETS } from '@/lib/options/sample-book';
import { rungForDrawdown, KILLSWITCH_LADDER } from '@/lib/options/types';
import { cn } from '@/lib/utils';

const EQUITY = 10_000;

const money = (n: number) =>
  `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = `shock-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500"
        >
          {label}
        </label>
        <span className="font-mono text-sm font-bold tabular-nums text-slate-100">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-2 w-full accent-teal-400"
      />
    </div>
  );
}

export default function ScenarioClient() {
  const [spotPct, setSpotPct] = useState(-0.1);
  const [ivPct, setIvPct] = useState(0.8);
  const [daysForward, setDaysForward] = useState(1);

  const shock: Shock = useMemo(
    () => ({ spotPct, ivPct, daysForward }),
    [spotPct, ivPct, daysForward]
  );
  const summary = useMemo(() => summariseShock(SAMPLE_BOOK, shock), [shock]);

  const pnl = summary.totalPnlCapped;
  const equityAfter = EQUITY + pnl;
  const drawdown = Math.max(0, -pnl / EQUITY);
  const rung = rungForDrawdown(drawdown);
  const rungIndex = KILLSWITCH_LADDER.findIndex((r) => r.state === rung.state);

  const bpAfter = Math.min(summary.bpUsed, equityAfter * rung.maxBpUtilization);
  const worst = Math.min(...summary.results.map((r) => r.pnl));
  const scale = Math.max(Math.abs(worst), ...summary.results.map((r) => Math.abs(r.pnl)), 1);

  return (
    <div className="space-y-7">
      {/* Controls */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <Slider
            label="Underlying"
            value={spotPct}
            min={-0.25}
            max={0.15}
            step={0.005}
            format={(v) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`}
            onChange={setSpotPct}
          />
          <Slider
            label="Implied vol"
            value={ivPct}
            min={-0.5}
            max={2}
            step={0.05}
            format={(v) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(0)}%`}
            onChange={setIvPct}
          />
          <Slider
            label="Days forward"
            value={daysForward}
            min={0}
            max={21}
            step={1}
            format={(v) => `${v}d`}
            onChange={setDaysForward}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          {SHOCK_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSpotPct(p.spotPct);
                setIvPct(p.ivPct);
                setDaysForward(p.daysForward);
              }}
              className="rounded border border-slate-700 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 transition-colors hover:border-teal-600 hover:text-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* Headline */}
      <section className="grid gap-px overflow-hidden rounded-lg bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#070c10] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            Book P&amp;L under shock
          </div>
          <div
            className={cn(
              'mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight',
              pnl < 0 ? 'text-red-400' : 'text-teal-400'
            )}
          >
            {money(pnl)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            {pct(pnl / EQUITY)} of equity
          </div>
        </div>
        <div className="bg-[#070c10] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            Equity after
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-100">
            {money(equityAfter)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">from $10,000</div>
        </div>
        <div className="bg-[#070c10] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            Kill-switch rung
          </div>
          <div
            className={cn(
              'mt-2 font-mono text-3xl font-bold tracking-tight',
              rung.state === 'HALT'
                ? 'text-red-400'
                : rung.state === 'NORMAL'
                  ? 'text-teal-400'
                  : 'text-amber-400'
            )}
          >
            {rung.state}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            drawdown {pct(drawdown)}
          </div>
        </div>
        <div className="bg-[#070c10] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            Buying power after
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-100">
            {money(bpAfter)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            ceiling {(rung.maxBpUtilization * 100).toFixed(0)}% · was {money(summary.bpUsed)}
          </div>
        </div>
      </section>

      {/* Ladder trace */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">
          Which rungs trip
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {KILLSWITCH_LADDER.map((r, i) => {
            // NORMAL is the baseline, not a trip — only intermediate rungs the
            // shock actually passed through get the warning treatment.
            const tripped = i > 0 && i < rungIndex;
            const current = i === rungIndex;
            return (
              <span
                key={r.state}
                className={cn(
                  'rounded border px-2.5 py-1 font-mono text-[11px]',
                  current
                    ? r.state === 'HALT'
                      ? 'border-red-600 bg-red-950/40 text-red-300'
                      : 'border-teal-600 bg-teal-950/40 text-teal-300'
                    : tripped
                      ? 'border-amber-800/70 text-amber-500/80'
                      : 'border-slate-800 text-slate-600'
                )}
              >
                {r.state}
                {current && ' ←'}
              </span>
            );
          })}
        </div>
      </section>

      {/* Per-position */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">Per position</h2>
        <p className="mt-1 font-mono text-[11px] text-slate-600">{SAMPLE_BOOK_DISCLAIMER}</p>

        <div className="mt-4 space-y-px overflow-hidden rounded-lg bg-slate-800">
          {summary.results
            .slice()
            .sort((a, b) => a.pnl - b.pnl)
            .map((r) => {
              const capped = Math.max(r.pnl, -r.position.maxLoss);
              const width = Math.min(100, (Math.abs(capped) / scale) * 100);
              const atMax = capped <= -r.position.maxLoss + 1;
              return (
                <div key={r.position.id} className="bg-[#070c10] px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-bold text-slate-100">
                        {r.position.symbol}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-slate-500">
                        {r.position.structure}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      {atMax && (
                        <span className="rounded border border-red-900 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-400">
                          max loss
                        </span>
                      )}
                      <span
                        className={cn(
                          'font-mono text-sm font-bold tabular-nums',
                          capped < 0 ? 'text-red-400' : 'text-teal-400'
                        )}
                      >
                        {money(capped)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className={cn('h-full rounded-full', capped < 0 ? 'bg-red-500' : 'bg-teal-500')}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <p className="max-w-3xl font-mono text-[11px] leading-relaxed text-slate-600">
        Repriced with Black-Scholes at the shocked spot, IV and date; defined-risk structures are
        capped at their max loss, since the long wing caps them in reality. European pricing is an
        approximation for American options — close enough to answer &ldquo;what does this book do
        if the market gaps&rdquo;, not adequate for the backtester&rsquo;s early-assignment
        modelling. No market data is connected and no positions are real.
      </p>
    </div>
  );
}
