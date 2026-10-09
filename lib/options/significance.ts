/**
 * Head-to-head significance testing (build plan §3, beat 6:30).
 *
 * The point of this module is the uncomfortable one: a lead in a 12-month
 * trading contest is usually not evidence. The companion note "The Wrong
 * Scoreboard" puts a number on it — a book with no edge at all beats a book
 * with a real edge about a quarter of the time over ~70 trades.
 *
 * So the head-to-head screen does not just rank the books. It states, for each
 * matchup, whether the gap is distinguishable from noise, and how much longer
 * the track has to run before it would be. Showing a lead without that is the
 * thing every other track record does, and it is why none of them mean much.
 *
 * Method. Per-trade log returns are treated as i.i.d. with mean mu and
 * variance s2. Over n trades the cumulative log return is approximately
 * N(n*mu, n*s2); the difference between two independent books is
 * N(n*(muA-muB), n*(s2A+s2B)). Under the null that both books have the same
 * true edge, the observed difference is N(0, n*(s2A+s2B)), which gives a
 * two-sided p-value directly. The normal approximation is sound here because n
 * is in the dozens and the per-trade distribution is bounded.
 *
 * This is deliberately a weak test — it makes it HARDER to claim a win, not
 * easier. That is the correct direction for a number we intend to put in front
 * of a counterparty.
 */

import { normCdf } from './pricing';

export interface BookStats {
  id: string;
  name: string;
  /** Cumulative return over the elapsed period, as a fraction. 0.09 = +9%. */
  periodReturn: number;
  /** Max peak-to-trough drawdown over the period, as a fraction. */
  maxDrawdown: number;
  /**
   * Per-trade standard deviation of log return. Where a book publishes a trade
   * log this is measured; where it does not (a discretionary desk that reports
   * only monthly P&L) it has to be assumed, and the assumption is shown.
   */
  perTradeVol: number;
  /** True when perTradeVol is assumed rather than measured from a trade log. */
  volAssumed: boolean;
  /** Our book, for highlighting. */
  isUs?: boolean;
}

export type Verdict = 'significant' | 'suggestive' | 'noise';

export interface Matchup {
  a: BookStats;
  b: BookStats;
  /** Difference in cumulative log return, a minus b. */
  logGap: number;
  /** The same gap expressed as a simple return difference, for display. */
  displayGap: number;
  /** Standard error of the gap under the null. */
  stdError: number;
  z: number;
  /** Two-sided p-value for "these two books have the same true edge". */
  pValue: number;
  verdict: Verdict;
  /**
   * Trades needed before a gap at the CURRENT observed rate would clear the
   * 95% bar. Infinity when the observed rates are identical.
   */
  tradesToSignificance: number;
  /** The same, converted to months at the given trade rate. */
  monthsToSignificance: number;
}

/** MAR — return per unit of drawdown. The rulebook's co-primary metric (§2). */
export function marRatio(b: BookStats): number | null {
  if (b.maxDrawdown <= 0) return null;
  return b.periodReturn / b.maxDrawdown;
}

/**
 * Project a book forward by compounding its annualised rate over `months`.
 *
 * The head-to-head screen takes annualised rates and asks "if both books keep
 * running at these rates, when does the gap become evidence?" — so the gap has
 * to compound with elapsed time, not stay fixed while the trade count rises.
 * Holding the cumulative gap constant and extending the clock makes a lead look
 * LESS significant, which is arithmetically true but the opposite of what
 * anyone reads a "months elapsed" control to mean.
 */
export function atElapsed(b: BookStats, months: number): BookStats {
  const years = Math.max(months, 0) / 12;
  return { ...b, periodReturn: Math.pow(1 + b.periodReturn, years) - 1 };
}

/**
 * Per-trade log-return mean and variance implied by a strategy configuration.
 * Lets the page derive our own volatility from the published rules rather than
 * asking anyone to supply it.
 */
export function perTradeMoments(winRate: number, riskPerTrade: number, payoffRatio: number) {
  const win = Math.log(1 + riskPerTrade * payoffRatio);
  const loss = Math.log(1 - riskPerTrade);
  const mean = winRate * win + (1 - winRate) * loss;
  const variance =
    winRate * (win - mean) ** 2 + (1 - winRate) * (loss - mean) ** 2;
  return { mean, variance, sd: Math.sqrt(variance) };
}

function classify(p: number): Verdict {
  if (p < 0.05) return 'significant';
  if (p < 0.2) return 'suggestive';
  return 'noise';
}

export function compare(a: BookStats, b: BookStats, tradesElapsed: number, tradesPerYear: number): Matchup {
  const n = Math.max(1, tradesElapsed);

  // Work in log space so the difference is additive and symmetric.
  const logA = Math.log(1 + a.periodReturn);
  const logB = Math.log(1 + b.periodReturn);
  const logGap = logA - logB;

  const varSum = a.perTradeVol ** 2 + b.perTradeVol ** 2;
  const stdError = Math.sqrt(n * varSum);
  const z = stdError > 0 ? logGap / stdError : 0;
  const pValue = 2 * (1 - normCdf(Math.abs(z)));

  // At the observed per-trade rate difference, how many trades until
  // |gap| / sqrt(n * varSum) >= 1.96? The gap grows with n, the error with
  // sqrt(n), so significance arrives at n = 1.96^2 * varSum / rateDiff^2.
  const rateDiff = logGap / n;
  const tradesToSignificance =
    rateDiff === 0 ? Infinity : (1.96 ** 2 * varSum) / rateDiff ** 2;

  return {
    a,
    b,
    logGap,
    displayGap: a.periodReturn - b.periodReturn,
    stdError,
    z,
    pValue,
    verdict: classify(pValue),
    tradesToSignificance,
    monthsToSignificance:
      tradesToSignificance === Infinity
        ? Infinity
        : (tradesToSignificance / tradesPerYear) * 12,
  };
}

export const VERDICT_COPY: Record<Verdict, { label: string; gloss: string }> = {
  significant: {
    label: 'Significant',
    gloss: 'A gap this large is unlikely to be luck at this sample size.',
  },
  suggestive: {
    label: 'Suggestive',
    gloss: 'Leaning one way, but still inside what chance produces routinely.',
  },
  noise: {
    label: 'Not yet evidence',
    gloss: 'A gap this size arises by chance often enough to prove nothing.',
  },
};
