'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { simulate, RULEBOOK_CONFIG, PRESETS, type SimConfig } from '@/lib/options/montecarlo';
import { cn } from '@/lib/utils';

const money = (n: number) =>
  `$${Math.round(n).toLocaleString('en-US')}`;
const signedPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n * 100).toFixed(1)}%`;
const plainPct = (n: number) => `${(n * 100).toFixed(0)}%`;

/** Sequential ramp, one hue. Outer band lightest, median solid. */
const CONE = { band90: '#134e4a', band50: '#0f766e', median: '#5eead4' };

type ConeRow = { t: number; p5: number; band90: number; p25base: number; band50: number; p50: number };

/** Custom tooltip — the stacked bands carry deltas, so reconstruct the real
 *  percentiles rather than showing the raw stack values. */
function ConeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ConeRow }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows: [string, number][] = [
    ['95th', d.p5 + d.band90],
    ['75th', d.p25base + d.band50],
    ['median', d.p50],
    ['25th', d.p25base],
    ['5th', d.p5],
  ];
  return (
    <div className="rounded-md border border-slate-700 bg-[#0b1116] px-3 py-2 shadow-lg">
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        after {d.t} trades
      </div>
      <div className="mt-1.5 space-y-0.5">
        {rows.map(([label, v]) => (
          <div key={label} className="flex items-baseline justify-between gap-5">
            <span
              className={cn(
                'font-mono text-[11px]',
                label === 'median' ? 'text-teal-300' : 'text-slate-500'
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                'font-mono text-[11px] tabular-nums',
                label === 'median' ? 'font-bold text-teal-300' : 'text-slate-300'
              )}
            >
              {money(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Control({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = `mc-${label.replace(/\s+/g, '-').toLowerCase()}`;
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
      <p className="mt-1 text-[11px] leading-snug text-slate-600">{hint}</p>
    </div>
  );
}

export default function ProbabilityClient() {
  const [cfg, setCfg] = useState<SimConfig>(RULEBOOK_CONFIG);
  const [activePreset, setActivePreset] = useState('rulebook');

  const result = useMemo(() => simulate(cfg), [cfg]);

  const set = (patch: Partial<SimConfig>) => {
    setCfg((c) => ({ ...c, ...patch }));
    setActivePreset('custom');
  };

  const applyPreset = (key: string) => {
    setCfg({ ...RULEBOOK_CONFIG, ...PRESETS[key].config });
    setActivePreset(key);
  };

  // Recharts needs the bands as [base, delta] pairs to stack them.
  const chartData = result.cone.map((row) => ({
    t: row.t,
    p5: row.p5,
    band90: row.p95 - row.p5,
    p25base: row.p25,
    band50: row.p75 - row.p25,
    p50: row.p50,
  }));

  const noEdge = result.edgePerTrade <= 0;

  return (
    <div className="space-y-7">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className={cn(
              'rounded border px-3 py-1.5 font-mono text-[11px] transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
              activePreset === key
                ? 'border-teal-600 bg-teal-950/40 text-teal-300'
                : 'border-slate-700 text-slate-300 hover:border-slate-600'
            )}
          >
            {p.label}
          </button>
        ))}
        {activePreset === 'custom' && (
          <span className="self-center font-mono text-[11px] text-slate-600">custom</span>
        )}
      </div>
      {activePreset !== 'custom' && (
        <p className="-mt-4 text-sm text-slate-400">{PRESETS[activePreset].note}</p>
      )}

      {/* Cone */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">
            Equity over the next 12 months
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm" style={{ background: CONE.band90 }} />
              5–95th
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm" style={{ background: CONE.band50 }} />
              25–75th
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-sm" style={{ background: CONE.median }} />
              median
            </span>
          </div>
        </div>

        <div className="h-64 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 6, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#1e293b"
                tickLine={false}
                minTickGap={28}
                label={{
                  value: 'trades closed',
                  position: 'insideBottom',
                  offset: -2,
                  fill: '#475569',
                  fontSize: 10,
                }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                stroke="#1e293b"
                tickLine={false}
                width={52}
                tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              />
              <ReferenceLine
                y={cfg.startingEquity}
                stroke="#475569"
                strokeDasharray="3 3"
                label={{
                  value: 'start $10k',
                  fill: '#64748b',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <ReferenceLine
                y={cfg.startingEquity * (1 - cfg.ruinDrawdown)}
                stroke="#991b1b"
                strokeDasharray="3 3"
                label={{
                  value: 'forfeit \u221220%',
                  fill: '#b91c1c',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />
              <Tooltip cursor={{ stroke: '#334155', strokeWidth: 1 }} content={<ConeTooltip />} />
              {/* Invisible base + visible band = a stacked ribbon. */}
              <Area
                dataKey="p5"
                stackId="outer"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                dataKey="band90"
                stackId="outer"
                stroke="none"
                fill={CONE.band90}
                fillOpacity={0.55}
                isAnimationActive={false}
              />
              <Area
                dataKey="p25base"
                stackId="inner"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              <Area
                dataKey="band50"
                stackId="inner"
                stroke="none"
                fill={CONE.band50}
                fillOpacity={0.6}
                isAnimationActive={false}
              />
              <Line
                dataKey="p50"
                stroke={CONE.median}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Outcomes */}
      <section className="grid gap-px overflow-hidden rounded-lg bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#070c10] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            Median outcome
          </div>
          <div
            className={cn(
              'mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight',
              result.medianReturn >= 0 ? 'text-teal-400' : 'text-red-400'
            )}
          >
            {signedPct(result.medianReturn)}
          </div>
        </div>
        <div className="bg-[#070c10] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            P(reaching +100%)
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight text-slate-100">
            {plainPct(result.probAbove.find((p) => p.threshold === 1)?.prob ?? 0)}
          </div>
        </div>
        <div className="bg-[#070c10] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            P(forfeiting: DD &gt; 20%)
          </div>
          <div
            className={cn(
              'mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight',
              result.probRuin > 0.3 ? 'text-red-400' : result.probRuin > 0.15 ? 'text-amber-400' : 'text-slate-100'
            )}
          >
            {plainPct(result.probRuin)}
          </div>
        </div>
        <div className="bg-[#070c10] px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            95th pct max drawdown
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight text-slate-100">
            {plainPct(result.p95MaxDrawdown)}
          </div>
        </div>
      </section>

      {/* Probability table */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">
          Probability of clearing each bar
        </h2>
        <div className="mt-3 space-y-px overflow-hidden rounded-lg bg-slate-800">
          {result.probAbove.map((p) => (
            <div
              key={p.threshold}
              className="flex items-center gap-4 bg-[#070c10] px-4 py-2.5"
            >
              <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-slate-400">
                ≥ {p.threshold === 0 ? 'break even' : signedPct(p.threshold)}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-teal-500"
                  style={{ width: `${p.prob * 100}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-slate-200">
                {plainPct(p.prob)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Assumptions */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">
          The assumptions driving it
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Every number above falls out of these four. Change them and watch the distribution move
          — that is the point of the screen.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Control
            label="Win rate"
            hint="Share of trades closing at the profit target rather than the stop."
            value={cfg.winRate}
            min={0.6}
            max={0.95}
            step={0.005}
            format={(v) => `${(v * 100).toFixed(1)}%`}
            onChange={(v) => set({ winRate: v })}
          />
          <Control
            label="Risk per trade"
            hint="Fraction of equity lost on a stopped-out trade. The rulebook caps max loss at 5%."
            value={cfg.riskPerTrade}
            min={0.005}
            max={0.1}
            step={0.0025}
            format={(v) => `${(v * 100).toFixed(2)}%`}
            onChange={(v) => set({ riskPerTrade: v })}
          />
          <Control
            label="Payoff ratio"
            hint="Win size ÷ loss size. 50% profit target against a 2× credit stop gives 0.25."
            value={cfg.payoffRatio}
            min={0.1}
            max={1.5}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => set({ payoffRatio: v })}
          />
          <Control
            label="Trades per year"
            hint="Closures across the whole book. Six concurrent positions at 30 DTE ≈ 72."
            value={cfg.tradesPerYear}
            min={24}
            max={200}
            step={2}
            format={(v) => `${v}`}
            onChange={(v) => set({ tradesPerYear: v })}
          />
        </div>

        <div
          className={cn(
            'mt-5 rounded border-l-2 px-4 py-3',
            noEdge ? 'border-red-600 bg-red-950/20' : 'border-teal-600 bg-teal-950/20'
          )}
        >
          <div className="font-mono text-[11px] leading-relaxed text-slate-300">
            Break-even win rate at this payoff ratio:{' '}
            <b className="text-slate-100">{(result.breakevenWinRate * 100).toFixed(1)}%</b>. You
            are assuming{' '}
            <b className={noEdge ? 'text-red-400' : 'text-teal-300'}>
              {(cfg.winRate * 100).toFixed(1)}%
            </b>
            , which is an edge of{' '}
            <b className={noEdge ? 'text-red-400' : 'text-teal-300'}>
              {(result.edgePerTrade * 100).toFixed(3)}%
            </b>{' '}
            of equity per trade.
            {noEdge && ' With no edge, no amount of sizing produces a positive median.'}
          </div>
        </div>
      </section>

      <p className="max-w-3xl font-mono text-[11px] leading-relaxed text-slate-600">
        Modelled, not measured. This is a stated-assumption Monte Carlo — {cfg.paths.toLocaleString()}{' '}
        seeded paths compounding the distribution above. It answers &ldquo;if the edge is X, what
        does a year look like, and what does chasing 100% cost?&rdquo; It does not establish that
        the edge is X; only the Phase 2 backtest against real option chains can do that. No market
        data is connected and no trading has taken place.
      </p>
    </div>
  );
}
