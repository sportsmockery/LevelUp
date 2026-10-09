/**
 * Ten-year regime study — what the published rules imply, run against real
 * market history.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS NOT
 *
 * This is NOT the chain-level backtest described in 02-BUILD-PLAN.md §8, and
 * it must never be presented as one. There is still no historical option-chain
 * vendor, so there are no real bid/ask quotes, no real IV rank, no real
 * assignment modelling and no real fills behind these numbers.
 *
 * WHAT IT IS
 *
 * A position-level simulation driven by actual prices rather than assumptions:
 *
 *  1. Daily S&P 500 closes and daily VIX, both from FRED (public, no key):
 *     fredgraph.csv?id=SP500 and ?id=VIXCLS. Ten years to 2026-10-09.
 *  2. Every fourth trading day, open one 21-day short put spread — the cadence
 *     that holds ~6 concurrent positions, per rulebook §7.2.
 *  3. The short strike is placed 1.0x the IMPLIED move below spot, where the
 *     implied move is VIX at entry scaled to the cycle (rulebook §7.1).
 *  4. Whether that strike was breached is read off the ACTUAL index path over
 *     the following 21 trading days. No distributional assumption is made
 *     about the breach — it either happened or it did not.
 *  5. Breach depth relative to the spread width scales the loss between a
 *     stop-out and a max loss. Unbreached positions take the profit target.
 *  6. P&L per position is expressed in the rulebook's equity terms (1.75% of
 *     equity at risk, 0.33 payoff ratio), and the kill-switch ladder is
 *     evaluated continuously on running drawdown.
 *  7. Costs are charged per round trip: $0.65/contract on four contract-sides
 *     plus $0.02/contract slippage against the mid — $10.60 a trade, the
 *     rulebook §8 model.
 *
 * So the regime, the breaches, the clustering and the drawdowns are real
 * history. The option economics are modelled. That is a meaningful step up
 * from a pure Monte Carlo and a meaningful step down from a real backtest, and
 * the page says so.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TWO BUGS THIS STUDY FOUND
 *
 *  - An earlier version compounded the EXPECTED value each cycle instead of
 *    drawing outcomes. That removes variance by construction, and it produced
 *    24.2% CAGR with a 10.9% drawdown and not one losing year. Any backtest
 *    with no losing decade-years is wrong before you read the number.
 *
 *  - The published kill-switch ladder DEADLOCKS. LOCKDOWN (drawdown >= 16%)
 *    permits zero new positions, so equity cannot rise, so drawdown never
 *    falls, so the book is frozen for good. In the ten-year run it locked in
 *    2022 and never traded again. The ladder here permits a single half-size
 *    probe at LOCKDOWN to give the book a way out; rulebook §9 needs the same
 *    amendment.
 */

import study from './data/regime-study.json';

export interface RegimeYear {
  year: number;
  /** Strategy return for the calendar year, as a percentage. */
  ret: number;
  /** Worst drawdown touched during the year, as a negative percentage. */
  maxDD: number;
  trades: number;
  losers: number;
  /** Entry opportunities the ladder or the vol filter declined. */
  standDown: number;
  entries: number;
  endEquity: number;
  /** Mean VIX for the year. */
  vix: number | null;
  /** Mean subsequent 21-day realised vol, annualised. */
  realizedVol: number | null;
  /** vix - realizedVol. The variance risk premium: the edge being harvested. */
  vrp: number | null;
  spxMaxDD: number | null;
  spxWorstDay: number | null;
  /** Days the VIX closed above 30. */
  stressDays: number | null;
}

export interface RegimeStudy {
  generatedAt: string;
  cagr: number;
  maxDD: number;
  startEquity: number;
  finalEquity: number;
  years: RegimeYear[];
}

export const REGIME_STUDY = study as RegimeStudy;

/** Years 2016 and 2026 are partial; flag them rather than quietly annualising. */
export function isPartialYear(y: RegimeYear): boolean {
  return y.entries < 40;
}

export const SOURCES = [
  { label: 'S&P 500 daily close', id: 'SP500', href: 'https://fred.stlouisfed.org/series/SP500' },
  { label: 'CBOE VIX daily close', id: 'VIXCLS', href: 'https://fred.stlouisfed.org/series/VIXCLS' },
];
