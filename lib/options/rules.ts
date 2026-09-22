/**
 * ThetaDesk rule catalog — the declarative half of the strategy engine.
 *
 * Rules are first-class data objects so that every candidate trade can be
 * decomposed into the checks that produced it. This file holds the catalog
 * and its version hash; the predicates that evaluate against live chain data
 * land in Phase 3 (docs/premium-challenge/02-BUILD-PLAN.md §7).
 *
 * Every threshold here traces to a numbered section of
 * docs/premium-challenge/01-RULEBOOK.md. Changing one is a rulebook change:
 * it produces a new RULES_VERSION, is committed before it takes effect, and
 * is annotated on the equity curve (rulebook §12).
 */

import { createHash } from 'crypto';
import type { RuleDefinition, Structure } from './types';

export const RULE_CATALOG: readonly RuleDefinition[] = [
  // --- Universe (rulebook §4) ---------------------------------------------
  { id: 'universe.adv_20d',          scope: 'universe', label: '20-day average volume',        threshold: '>= 2,000,000 sh', source: '§4' },
  { id: 'universe.strike_oi',        scope: 'universe', label: 'Open interest at short strike', threshold: '>= 1,000',        source: '§4' },
  { id: 'universe.chain_oi',         scope: 'universe', label: 'Total chain open interest',     threshold: '>= 10,000',       source: '§4' },
  { id: 'universe.spread_pct',       scope: 'universe', label: 'Option bid-ask spread',         threshold: '<= 5% of mid or $0.05', source: '§4' },
  { id: 'universe.price_band',       scope: 'universe', label: 'Underlying price band',         threshold: '$15-$60 if assignable', source: '§4' },
  { id: 'universe.market_cap',       scope: 'universe', label: 'Market capitalisation',         threshold: '>= $5B or broad ETF', source: '§4' },
  { id: 'universe.no_binary_event',  scope: 'universe', label: 'Binary event screen',           threshold: 'no PDUFA / court date / announced M&A', source: '§4' },

  // --- Entry (rulebook §7.1) ----------------------------------------------
  { id: 'entry.iv_rank_min',            scope: 'entry', label: 'IV rank (252-day)',        threshold: '>= 25',              source: '§7.1' },
  { id: 'entry.vrp_min',                scope: 'entry', label: 'Variance risk premium',    threshold: '> 2.0 vol points',   source: '§7.1' },
  { id: 'entry.outside_expected_move',  scope: 'entry', label: 'Short strike vs. expected move', threshold: '>= 1.0x (1.5x condors)', source: '§7.1' },
  { id: 'entry.short_delta_band',       scope: 'entry', label: 'Short leg delta',          threshold: 'per structure band', source: '§5' },
  { id: 'entry.dte_band',               scope: 'entry', label: 'Days to expiration',       threshold: 'per structure band', source: '§5' },
  { id: 'entry.no_earnings_in_cycle',   scope: 'entry', label: 'Earnings inside cycle',    threshold: 'none, unless flagged vol-crush <= 3% equity', source: '§7.1' },
  { id: 'entry.term_structure',         scope: 'entry', label: 'VIX term structure',       threshold: 'not backwardated (VIX9D <= VIX)', source: '§7.1' },
  { id: 'entry.trend_filter',           scope: 'entry', label: 'Trend filter',             threshold: 'above 200d SMA, or IVR >= 50', source: '§7.1' },

  // --- Sizing and concentration (rulebook §7.2) ---------------------------
  { id: 'sizing.max_loss_pct_equity',   scope: 'sizing', label: 'Max loss vs. equity',      threshold: '<= 5%',   source: '§7.2' },
  { id: 'sizing.max_concurrent',        scope: 'sizing', label: 'Concurrent positions',     threshold: '<= 6',    source: '§7.2' },
  { id: 'sizing.cash_buffer',           scope: 'sizing', label: 'Cash buffer',              threshold: '>= 35%',  source: '§7.2' },
  { id: 'sizing.sector_concentration',  scope: 'sizing', label: 'Positions per GICS sector', threshold: '<= 2',   source: '§7.2' },
  { id: 'sizing.one_per_underlying',    scope: 'sizing', label: 'Positions per underlying', threshold: '<= 1',    source: '§7.2' },

  // --- Portfolio-level (rulebook §7.2) ------------------------------------
  { id: 'portfolio.beta_weighted_delta', scope: 'portfolio', label: 'Beta-weighted net delta', threshold: '-0.30 to +0.30 per $1k equity', source: '§7.2' },
  { id: 'portfolio.vega_shock',          scope: 'portfolio', label: '+50% IV shock cost',      threshold: '<= 10% of equity',              source: '§7.2' },
  { id: 'portfolio.bp_utilization',      scope: 'portfolio', label: 'Buying-power utilization', threshold: '<= current rung ceiling',       source: '§7.2, §9' },

  // --- Management (rulebook §7.3) -----------------------------------------
  { id: 'manage.profit_target',      scope: 'management', label: 'Profit target',              threshold: '50% of max credit (25% if <= 14 DTE)', source: '§7.3' },
  { id: 'manage.roll_21dte',         scope: 'management', label: '21 DTE roll',                threshold: 'roll for credit or close',   source: '§7.3' },
  { id: 'manage.delta_breach',       scope: 'management', label: 'Short leg delta breach',     threshold: '>= 0.45 or strike breached', source: '§7.3' },
  { id: 'manage.stop_loss',          scope: 'management', label: 'Hard stop',                  threshold: '2x credit received',         source: '§7.3' },
  { id: 'manage.itm_near_expiry',    scope: 'management', label: 'ITM short near expiry',      threshold: 'close or roll at <= 2 DTE',  source: '§6.4' },
  { id: 'manage.ex_div_assignment',  scope: 'management', label: 'Ex-dividend assignment risk', threshold: 'close if extrinsic < dividend', source: '§6.4' },
  { id: 'manage.assignment_budget',  scope: 'management', label: 'Assignment budget',          threshold: '<= 1 assigned, <= 40% equity in shares', source: '§6.2' },
  { id: 'manage.assignment_clock',   scope: 'management', label: 'Assigned position exit clock', threshold: '<= 2 covered-call cycles',  source: '§6.3' },

  // --- Risk overlays (rulebook §9) ----------------------------------------
  { id: 'risk.killswitch_state',     scope: 'risk', label: 'Kill-switch rung',          threshold: 'not LOCKDOWN or HALT', source: '§9' },
  { id: 'risk.vix_ceiling',          scope: 'risk', label: 'VIX level',                 threshold: '<= 35 for undefined-risk entries', source: '§9' },
  { id: 'risk.term_backwardation',   scope: 'risk', label: 'Term structure overlay',    threshold: 'no new short premium if backwardated', source: '§9' },
  { id: 'risk.correlation_spike',    scope: 'risk', label: 'Book pairwise correlation', threshold: '<= 0.7 trailing 20d',  source: '§9' },
  { id: 'risk.consecutive_stops',    scope: 'risk', label: 'Consecutive stop-outs',     threshold: '< 3, else 5-session cool-down', source: '§9' },
];

/** Short-leg delta and DTE bands per permitted structure (rulebook §5). */
export const STRUCTURE_BANDS: Record<Structure, {
  label: string;
  shortDelta: [number, number] | null;
  dte: [number, number];
  definedRisk: boolean;
  canAssign: boolean;
}> = {
  put_credit_spread:  { label: 'Put credit spread',  shortDelta: [0.15, 0.25], dte: [21, 45],  definedRisk: true,  canAssign: false },
  call_credit_spread: { label: 'Call credit spread', shortDelta: [0.12, 0.20], dte: [21, 45],  definedRisk: true,  canAssign: false },
  iron_condor:        { label: 'Iron condor',        shortDelta: [0.10, 0.18], dte: [30, 60],  definedRisk: true,  canAssign: false },
  cash_secured_put:   { label: 'Cash-secured put',   shortDelta: [0.15, 0.30], dte: [21, 45],  definedRisk: false, canAssign: true  },
  covered_call:       { label: 'Covered call',       shortDelta: [0.20, 0.30], dte: [14, 35],  definedRisk: false, canAssign: true  },
  jade_lizard:        { label: 'Jade lizard',        shortDelta: [0.15, 0.25], dte: [30, 45],  definedRisk: false, canAssign: true  },
  pmcc:               { label: "Poor-man's covered call", shortDelta: null,    dte: [90, 365], definedRisk: false, canAssign: false },
};

/** Structures explicitly barred for both sides (rulebook §5). */
export const PROHIBITED_STRUCTURES = [
  'naked short call',
  'ratio spread with undefined risk',
  'short strangle without wings',
  'any structure whose max loss cannot be computed at entry',
] as const;

/**
 * Version hash of the rule set. Stamped on every signal and backtest run, and
 * annotated on the equity curve whenever it changes.
 */
export function computeRulesVersion(): string {
  const canonical = JSON.stringify({
    rules: RULE_CATALOG.map((r) => [r.id, r.threshold]),
    bands: STRUCTURE_BANDS,
  });
  return createHash('sha256').update(canonical).digest('hex').slice(0, 7);
}

export const RULE_COUNT = RULE_CATALOG.length;
