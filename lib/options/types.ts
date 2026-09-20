/**
 * ThetaDesk domain types.
 * Mirrors the td_* schema in supabase/migrations/20260920000000_theta_desk.sql
 * and the rulebook in docs/premium-challenge/01-RULEBOOK.md.
 */

export type AccountKind = 'live' | 'simulated' | 'competitor' | 'benchmark';

export type Structure =
  | 'put_credit_spread'
  | 'call_credit_spread'
  | 'iron_condor'
  | 'cash_secured_put'
  | 'covered_call'
  | 'jade_lizard'
  | 'pmcc';

export type SignalStatus = 'proposed' | 'rejected' | 'submitted';

export type CloseReason =
  | 'profit_target'
  | 'stop_loss'
  | 'roll_21dte'
  | 'delta_breach'
  | 'itm_near_expiry'
  | 'ex_div_risk'
  | 'expired'
  | 'assigned'
  | 'killswitch'
  | 'manual';

/** Rulebook §9. Ordered from least to most severe. */
export const KILLSWITCH_STATES = [
  'NORMAL',
  'CAUTION',
  'DEFENSIVE',
  'LOCKDOWN',
  'HALT',
] as const;

export type KillswitchState = (typeof KILLSWITCH_STATES)[number];

export interface KillswitchRung {
  state: KillswitchState;
  /** Drawdown from high-water mark at which this rung engages, as a fraction. */
  drawdownFloor: number;
  /** Maximum buying-power utilization permitted, as a fraction of NLV. */
  maxBpUtilization: number;
  definedRiskOnly: boolean;
  /** null = unrestricted; 0 = no new positions. */
  maxNewPositionsPerWeek: number | null;
  sizeMultiplier: number;
}

/**
 * Rulebook §9. Evaluated before every order submission, not on a schedule.
 * HALT at 20% is the contest's forfeiture line, so nothing sits below it.
 */
export const KILLSWITCH_LADDER: readonly KillswitchRung[] = [
  { state: 'NORMAL',    drawdownFloor: 0.00, maxBpUtilization: 0.50, definedRiskOnly: false, maxNewPositionsPerWeek: null, sizeMultiplier: 1.0 },
  { state: 'CAUTION',   drawdownFloor: 0.08, maxBpUtilization: 0.35, definedRiskOnly: false, maxNewPositionsPerWeek: 2,    sizeMultiplier: 0.5 },
  { state: 'DEFENSIVE', drawdownFloor: 0.12, maxBpUtilization: 0.25, definedRiskOnly: true,  maxNewPositionsPerWeek: 1,    sizeMultiplier: 0.5 },
  { state: 'LOCKDOWN',  drawdownFloor: 0.16, maxBpUtilization: 0.10, definedRiskOnly: true,  maxNewPositionsPerWeek: 0,    sizeMultiplier: 0 },
  { state: 'HALT',      drawdownFloor: 0.20, maxBpUtilization: 0.00, definedRiskOnly: true,  maxNewPositionsPerWeek: 0,    sizeMultiplier: 0 },
];

/** Resolves a drawdown fraction to its rung. Always returns a rung. */
export function rungForDrawdown(drawdown: number): KillswitchRung {
  let current = KILLSWITCH_LADDER[0];
  for (const rung of KILLSWITCH_LADDER) {
    if (drawdown >= rung.drawdownFloor) current = rung;
  }
  return current;
}

/**
 * One rule evaluation. Persisted on td_signals.rule_trace for accepted AND
 * rejected candidates — the rejects are the more persuasive half of the audit
 * story, so they are never discarded.
 */
export interface RuleResult {
  ruleId: string;
  passed: boolean;
  observed: number | string;
  threshold: string;
  note?: string;
}

export type RuleScope = 'universe' | 'entry' | 'sizing' | 'portfolio' | 'management' | 'risk';

export interface RuleDefinition {
  id: string;
  scope: RuleScope;
  /** What this rule checks, in the language the dashboard shows the client. */
  label: string;
  /** Human-readable threshold, rendered verbatim in the rule-trace panel. */
  threshold: string;
  /** Section of docs/premium-challenge/01-RULEBOOK.md this rule implements. */
  source: string;
}

export interface EquityPoint {
  accountId: string;
  label: string;
  kind: AccountKind;
  ts: string;
  nlv: number;
  highWaterMark: number;
  drawdown: number;
  killswitchState: KillswitchState;
  bpUsed: number | null;
  netDeltaBeta: number | null;
  openPositionCount: number;
}

export interface BlotterRow {
  id: string;
  accountId: string;
  symbol: string;
  structure: Structure;
  openedAt: string;
  closedAt: string | null;
  creditReceived: number | null;
  maxLoss: number | null;
  bpUsed: number | null;
  realizedPnl: number | null;
  closeReason: CloseReason | null;
  assigned: boolean;
  assignmentIntended: boolean | null;
  status: 'open' | 'closed';
  signalId: string | null;
}

export interface AnchorRow {
  anchoredAt: string;
  chainSeq: number;
  chainHash: string;
  gitCommitSha: string | null;
  note: string | null;
}

/** Scoring metrics, rulebook §2. */
export interface DeskMetrics {
  netReturn: number;
  cagr: number;
  maxDrawdown: number;
  /** cagr / maxDrawdown — the co-primary metric. */
  mar: number | null;
  sortino: number | null;
  premiumCaptureRate: number | null;
  winRate: number | null;
  profitFactor: number | null;
  avgDaysInTrade: number | null;
  returnOnBp: number | null;
  /** Rulebook §6.5. Target is zero. */
  unintendedAssignmentRate: number | null;
}
