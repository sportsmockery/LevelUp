/**
 * Black-Scholes pricing and Greeks.
 *
 * Used by the scenario shocker (docs/premium-challenge/02-BUILD-PLAN.md §3,
 * beat 3:30) to reprice a book under a spot/IV/time shock. This needs no market
 * data vendor, which is why it can ship ahead of Phase 1.
 *
 * European pricing is an approximation for American options. For short-dated
 * index and equity options away from a dividend it is close enough to answer
 * "what does this book do if SPX drops 10%". It is NOT adequate for the
 * backtester's early-assignment modelling — that needs Bjerksund-Stensland plus
 * the dividend check (build plan §8, requirement 4).
 */

/** Cumulative standard normal. Abramowitz & Stegun 26.2.17, |error| < 7.5e-8. */
export function normCdf(x: number): number {
  const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const p = 0.2316419;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const poly = b[0] * t + b[1] * t ** 2 + b[2] * t ** 3 + b[3] * t ** 4 + b[4] * t ** 5;
  const pdf = Math.exp(-0.5 * ax * ax) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return sign > 0 ? cdf : 1 - cdf;
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export type OptionRight = 'C' | 'P';

export interface PricingInputs {
  spot: number;
  strike: number;
  /** Years to expiration. */
  t: number;
  /** Annualised implied volatility, e.g. 0.22 for 22%. */
  iv: number;
  /** Risk-free rate, annualised. */
  r?: number;
  /** Continuous dividend yield, annualised. */
  q?: number;
  right: OptionRight;
}

export interface PricedOption {
  price: number;
  delta: number;
  gamma: number;
  /** Per calendar day. */
  theta: number;
  /** Per 1 vol point (0.01 of IV). */
  vega: number;
}

/** Intrinsic value, used at or past expiry where the BS formula degenerates. */
function intrinsic(spot: number, strike: number, right: OptionRight): number {
  return right === 'C' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
}

export function priceOption(inp: PricingInputs): PricedOption {
  const { spot, strike, right } = inp;
  const r = inp.r ?? 0.04;
  const q = inp.q ?? 0;
  const t = Math.max(inp.t, 0);
  const iv = Math.max(inp.iv, 1e-6);

  // At expiry (or with no vol left) the option is worth intrinsic and carries
  // no gamma/theta/vega; delta is the step function.
  if (t <= 1e-9) {
    const itm = right === 'C' ? spot > strike : spot < strike;
    return {
      price: intrinsic(spot, strike, right),
      delta: itm ? (right === 'C' ? 1 : -1) : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
    };
  }

  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r - q + (iv * iv) / 2) * t) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const dfQ = Math.exp(-q * t);
  const dfR = Math.exp(-r * t);

  const price =
    right === 'C'
      ? spot * dfQ * normCdf(d1) - strike * dfR * normCdf(d2)
      : strike * dfR * normCdf(-d2) - spot * dfQ * normCdf(-d1);

  const delta = right === 'C' ? dfQ * normCdf(d1) : dfQ * (normCdf(d1) - 1);
  const gamma = (dfQ * normPdf(d1)) / (spot * iv * sqrtT);
  const vega = (spot * dfQ * normPdf(d1) * sqrtT) / 100;

  const termA = -(spot * dfQ * normPdf(d1) * iv) / (2 * sqrtT);
  const thetaAnnual =
    right === 'C'
      ? termA - r * strike * dfR * normCdf(d2) + q * spot * dfQ * normCdf(d1)
      : termA + r * strike * dfR * normCdf(-d2) - q * spot * dfQ * normCdf(-d1);

  return { price: Math.max(price, 0), delta, gamma, theta: thetaAnnual / 365, vega };
}

/** One leg of a multi-leg position. Negative qty is short. */
export interface Leg {
  right: OptionRight;
  strike: number;
  /** Contracts. Negative = short. */
  qty: number;
  /** IV at the time the position was opened. */
  iv: number;
  /** Calendar days to expiration at the time of the snapshot. */
  dte: number;
}

export interface BookPosition {
  id: string;
  symbol: string;
  structure: string;
  /** Underlying price at the snapshot. */
  spot: number;
  /** Net credit received, in dollars. */
  credit: number;
  /** Max loss, in dollars. */
  maxLoss: number;
  /** Reg-T buying power consumed, in dollars. */
  bpUsed: number;
  /** Beta to SPY, for beta-weighting the book's delta. */
  beta: number;
  legs: Leg[];
}

export interface Shock {
  /** Underlying move, as a fraction. -0.10 = down 10%. */
  spotPct: number;
  /** IV move, as a fraction of current IV. +0.80 = IV up 80% relative. */
  ivPct: number;
  /** Calendar days forward. */
  daysForward: number;
}

export interface PositionShockResult {
  position: BookPosition;
  valueNow: number;
  valueShocked: number;
  /** Positive = the position makes money under the shock. */
  pnl: number;
  deltaNow: number;
  deltaShocked: number;
  /** pnl as a fraction of max loss; -1 means a full loss. */
  lossFraction: number;
}

/** Mark-to-market value of a position's short/long legs, in dollars. */
function markPosition(
  pos: BookPosition,
  spot: number,
  ivScale: number,
  daysForward: number
): { value: number; delta: number } {
  let value = 0;
  let delta = 0;
  for (const leg of pos.legs) {
    const t = Math.max(leg.dte - daysForward, 0) / 365;
    const priced = priceOption({
      spot,
      strike: leg.strike,
      t,
      iv: Math.max(leg.iv * ivScale, 1e-6),
      right: leg.right,
    });
    // qty is signed; 100 shares per contract.
    value += priced.price * leg.qty * 100;
    delta += priced.delta * leg.qty * 100;
  }
  return { value, delta };
}

export function applyShock(book: BookPosition[], shock: Shock): PositionShockResult[] {
  return book.map((pos) => {
    const now = markPosition(pos, pos.spot, 1, 0);
    const shockedSpot = pos.spot * (1 + shock.spotPct * pos.beta);
    const after = markPosition(pos, shockedSpot, 1 + shock.ivPct, shock.daysForward);

    // markPosition() already signs each leg by qty, so a short book carries a
    // negative value (a liability). P&L is therefore the change in that signed
    // value: a short position whose legs get more expensive moves further
    // negative, which is a loss. Subtracting the other way round reports a
    // crash as a profit.
    const pnl = after.value - now.value;

    return {
      position: pos,
      valueNow: now.value,
      valueShocked: after.value,
      pnl,
      deltaNow: now.delta,
      deltaShocked: after.delta,
      lossFraction: pos.maxLoss > 0 ? pnl / pos.maxLoss : 0,
    };
  });
}

export interface BookShockSummary {
  results: PositionShockResult[];
  totalPnl: number;
  /** Clamped so a position cannot lose more than its defined max loss. */
  totalPnlCapped: number;
  netDeltaNow: number;
  netDeltaShocked: number;
  bpUsed: number;
}

export function summariseShock(book: BookPosition[], shock: Shock): BookShockSummary {
  const results = applyShock(book, shock);
  let totalPnl = 0;
  let totalPnlCapped = 0;
  let netDeltaNow = 0;
  let netDeltaShocked = 0;
  let bpUsed = 0;

  for (const r of results) {
    totalPnl += r.pnl;
    // Defined-risk structures cannot lose more than max loss, whatever the
    // model says — the long wing caps it.
    totalPnlCapped += Math.max(r.pnl, -r.position.maxLoss);
    netDeltaNow += r.deltaNow * r.position.beta;
    netDeltaShocked += r.deltaShocked * r.position.beta;
    bpUsed += r.position.bpUsed;
  }

  return { results, totalPnl, totalPnlCapped, netDeltaNow, netDeltaShocked, bpUsed };
}
