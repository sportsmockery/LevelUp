/**
 * Forward outcome simulation for the probability cone
 * (docs/premium-challenge/02-BUILD-PLAN.md §3, beat 5:30; §10).
 *
 * IMPORTANT — what this is and is not.
 *
 * This is a STATED-ASSUMPTION Monte Carlo, not a backtest. There is no market
 * data behind it. It takes a per-trade outcome distribution as input and
 * compounds it forward, which answers "if the edge is X, what does the
 * distribution of 12-month outcomes look like, and what does it cost to chase
 * 100%?" It does NOT answer "is the edge X" — only Phase 2's backtest against
 * real chains can do that.
 *
 * Every assumption is a named parameter so it can be shown on screen beside the
 * result. A model whose inputs are visible is an argument; one whose inputs are
 * hidden is a sales pitch.
 *
 * The honest headline the maths produces: with a 50%-of-credit profit target and
 * a 2x-credit stop, a winner is a quarter the size of a loser, so the strategy
 * needs a win rate above 80% merely to break even. Whether the real number is
 * 0.78 or 0.84 decides everything — which is exactly the point to make in the
 * room.
 */

export interface SimConfig {
  startingEquity: number;
  /** Probability a trade closes at the profit target rather than the stop. */
  winRate: number;
  /** Fraction of equity risked per trade (the loss leg). */
  riskPerTrade: number;
  /** Win size as a multiple of the loss size. 0.25 = win is a quarter of a loss. */
  payoffRatio: number;
  /** Trade closures per year across the whole book. */
  tradesPerYear: number;
  /** Paths to simulate. */
  paths: number;
  /** Drawdown at which the challenge is forfeited (rulebook §2). */
  ruinDrawdown: number;
  seed: number;
}

/**
 * Defaults, and where each comes from.
 *
 * winRate 0.80      A 0.20-delta short leg finishes OTM roughly 80% of the time.
 *                   Managing at a 50% profit target trades a little of that win
 *                   rate for much shorter time in trade.
 * payoffRatio 0.33  Average winner ~0.6x credit against an average loser ~1.8x
 *                   credit. Note the rulebook's 2x-credit hard stop, taken
 *                   literally on every loser, gives 0.25 instead — which needs
 *                   an 80% win rate merely to break even. That the stop costs
 *                   expectancy is a real result, not a modelling artefact.
 * riskPerTrade      A $5-wide spread for $1 credit stopped near 1.75x credit is
 *   0.0175          ~$175 on a $10,000 account. The rulebook's 5% cap is the
 *                   ceiling on max loss, not the typical realised loss.
 * tradesPerYear 72  Six concurrent positions turning over at ~30 days.
 */
export const RULEBOOK_CONFIG: SimConfig = {
  startingEquity: 10_000,
  winRate: 0.8,
  riskPerTrade: 0.0175,
  payoffRatio: 0.33,
  tradesPerYear: 72,
  paths: 8000,
  ruinDrawdown: 0.2,
  seed: 20260924,
};

/** Named starting points, so the demo can jump between them in one click. */
export const PRESETS: Record<string, { label: string; note: string; config: Partial<SimConfig> }> = {
  conservative: {
    label: 'Conservative',
    note: 'Half size, strikes further out. Lower ceiling, much smaller tail.',
    config: { winRate: 0.82, riskPerTrade: 0.01, payoffRatio: 0.35, tradesPerYear: 60 },
  },
  rulebook: {
    label: 'Rulebook',
    note: 'The published configuration: ~6 concurrent positions, 21-45 DTE, rolled at 21 days.',
    config: { winRate: 0.8, riskPerTrade: 0.0175, payoffRatio: 0.33, tradesPerYear: 72 },
  },
  aggressive: {
    label: '100% target',
    note: 'What it takes to put +100% within reach — and what it costs in tail risk.',
    config: { winRate: 0.78, riskPerTrade: 0.05, payoffRatio: 0.33, tradesPerYear: 120 },
  },
};

/** Mulberry32 — small, fast, and seeded so a published cone is reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimResult {
  /** Equity percentile bands, one row per trade index (0 = start). */
  cone: { t: number; p5: number; p25: number; p50: number; p75: number; p95: number }[];
  /** Final equity for every path, sorted ascending. */
  finals: number[];
  medianReturn: number;
  meanReturn: number;
  /** P(final return >= key thresholds). */
  probAbove: { threshold: number; prob: number }[];
  /** P(max drawdown breaches the forfeiture line at any point). */
  probRuin: number;
  medianMaxDrawdown: number;
  p95MaxDrawdown: number;
  /** Expected value per trade, as a fraction of equity. Negative means no edge. */
  edgePerTrade: number;
  /** Win rate at which expectancy is exactly zero, given the payoff ratio. */
  breakevenWinRate: number;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function simulate(cfg: SimConfig): SimResult {
  const rand = rng(cfg.seed);
  const n = Math.max(1, Math.round(cfg.tradesPerYear));
  const paths = Math.max(100, cfg.paths);

  // Equity at each trade index, per path. Sampled to keep the cone light —
  // ~40 points, because each is an independent quantile and too many makes the
  // band visibly jagged from sampling noise rather than from the model.
  const sampleEvery = Math.max(1, Math.floor(n / 40));
  const sampleIdx: number[] = [];
  for (let t = 0; t <= n; t += sampleEvery) sampleIdx.push(t);
  if (sampleIdx[sampleIdx.length - 1] !== n) sampleIdx.push(n);

  const bySample: number[][] = sampleIdx.map(() => []);
  const finals: number[] = [];
  const maxDds: number[] = [];
  let ruinCount = 0;

  const winMult = 1 + cfg.riskPerTrade * cfg.payoffRatio;
  const lossMult = 1 - cfg.riskPerTrade;

  for (let p = 0; p < paths; p++) {
    let eq = cfg.startingEquity;
    let hwm = eq;
    let maxDd = 0;
    let ruined = false;
    let s = 0;
    if (sampleIdx[0] === 0) bySample[s++].push(eq);

    for (let t = 1; t <= n; t++) {
      eq *= rand() < cfg.winRate ? winMult : lossMult;
      if (eq > hwm) hwm = eq;
      const dd = (hwm - eq) / hwm;
      if (dd > maxDd) maxDd = dd;
      if (!ruined && dd >= cfg.ruinDrawdown) ruined = true;
      if (s < sampleIdx.length && sampleIdx[s] === t) bySample[s++].push(eq);
    }

    finals.push(eq);
    maxDds.push(maxDd);
    if (ruined) ruinCount++;
  }

  const cone = sampleIdx.map((t, i) => {
    const col = bySample[i].slice().sort((a, b) => a - b);
    return {
      t,
      p5: quantile(col, 0.05),
      p25: quantile(col, 0.25),
      p50: quantile(col, 0.5),
      p75: quantile(col, 0.75),
      p95: quantile(col, 0.95),
    };
  });

  const sortedFinals = finals.slice().sort((a, b) => a - b);
  const sortedDds = maxDds.slice().sort((a, b) => a - b);
  const thresholds = [0, 0.1, 0.3, 0.5, 1.0];

  const probAbove = thresholds.map((threshold) => {
    const target = cfg.startingEquity * (1 + threshold);
    const count = sortedFinals.filter((f) => f >= target).length;
    return { threshold, prob: count / sortedFinals.length };
  });

  const medianFinal = quantile(sortedFinals, 0.5);
  const meanFinal = sortedFinals.reduce((a, b) => a + b, 0) / sortedFinals.length;

  // Expectancy per trade as a fraction of equity, and the win rate that makes
  // it zero. These two numbers are the whole argument.
  const edgePerTrade =
    cfg.winRate * cfg.riskPerTrade * cfg.payoffRatio - (1 - cfg.winRate) * cfg.riskPerTrade;
  const breakevenWinRate = 1 / (1 + cfg.payoffRatio);

  return {
    cone,
    finals: sortedFinals,
    medianReturn: medianFinal / cfg.startingEquity - 1,
    meanReturn: meanFinal / cfg.startingEquity - 1,
    probAbove,
    probRuin: ruinCount / paths,
    medianMaxDrawdown: quantile(sortedDds, 0.5),
    p95MaxDrawdown: quantile(sortedDds, 0.95),
    edgePerTrade,
    breakevenWinRate,
  };
}
