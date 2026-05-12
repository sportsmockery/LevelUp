'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Crosshair,
  Zap,
  Target,
  Award,
  Shield,
  Sparkles,
  Users as TeamIcon,
  Download,
  X,
  Layers,
  FlaskConical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Play,
  Flame,
  AlertTriangle,
  Info,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';

export type LineupTeam = {
  id: string;
  gcId: string;
  name: string;
  record: string;
  level: string;
};

export type LineupPlayer = {
  id: string;
  name: string;
  number: string;
  avg: string;
  ops: string;
  hr: number;
  rbi: number;
  sb: number;
  era: string;
  ip: string;
  so: number;
  whip: string;
  hasPitched: boolean;
  // Full GameChanger offense/defense JSONB — populated from gc_*_stats.raw.
  // Drives the wide hitting/pitching tables and the modal "Complete Stats".
  battingRaw: Record<string, unknown> | null;
  pitchingRaw: Record<string, unknown> | null;
};

type TeamAggregate = { teamAvg: string; runDiff: string; staffEra: string; ip: string };

type Props = {
  teams: LineupTeam[];
  rosterByTeam: Record<string, LineupPlayer[]>;
  teamAggregates: Record<string, TeamAggregate>;
};

type Benchmarks = { opsMean: number; opsStd: number; eraMean: number; eraStd: number };

const AGE_BENCHMARKS: Record<string, Benchmarks> = {
  '9u': { opsMean: 1.2, opsStd: 0.22, eraMean: 7.25, eraStd: 2.1 },
  '11u': { opsMean: 1.02, opsStd: 0.19, eraMean: 5.8, eraStd: 1.8 },
  '14u': { opsMean: 0.98, opsStd: 0.21, eraMean: 4.7, eraStd: 3.2 },
};

// Class-year teams use the closest-age benchmarks. Class of 2035 graduates HS
// in 2035 → ~14U in 2026.
function benchmarksFor(level: string): Benchmarks {
  if (AGE_BENCHMARKS[level]) return AGE_BENCHMARKS[level];
  const year = parseInt(level, 10);
  if (!Number.isNaN(year)) {
    const today = new Date();
    const gradeYearsOut = year - today.getFullYear();
    const approxAge = Math.max(9, Math.min(14, 18 - gradeYearsOut));
    if (approxAge >= 13) return AGE_BENCHMARKS['14u'];
    if (approxAge >= 10) return AGE_BENCHMARKS['11u'];
    return AGE_BENCHMARKS['9u'];
  }
  return AGE_BENCHMARKS['14u'];
}

function prettyLevel(level: string): string {
  if (/^\d{4}$/.test(level)) return `Class of ${level}`;
  return level.toUpperCase();
}

// Short label used inside grouped team pills (e.g. "14U", "'35").
function pillLevel(level: string): string {
  if (/^\d{4}$/.test(level)) return `'${level.slice(2)}`;
  return level.toUpperCase();
}

// Maps a full GameChanger team name to its club family for the grouped
// nav pills (Bulldogs / Hitters / Rhino / …). Falls back to the first word
// so any new tracked team renders sensibly without code changes.
function familyName(teamName: string): string {
  if (/bulldogs/i.test(teamName)) return 'Bulldogs';
  if (/hitters/i.test(teamName)) return 'Hitters';
  if (/rhino/i.test(teamName)) return 'Rhino';
  return teamName.split(/[\s-]+/)[0] || teamName;
}

type NextGenCategory = 'hitting' | 'pitching' | 'twoway' | 'team' | 'predictive';

type NextGenStat = {
  id: number;
  category: NextGenCategory;
  name: string;
  formula: string;
  desc: string;
};

// ────────────────────────────────────────────────────────────────────────────
// CORE COMPOSITES LIBRARY (50 age-normalized composite indices, 0-100 scale)
// ────────────────────────────────────────────────────────────────────────────
const NEXT_GEN_STATS: NextGenStat[] = [
  { id: 1, category: 'hitting', name: 'Age-Normalized Production Index (NPI)', formula: '(OPS - μ_age)/σ_age × 10 + 50', desc: '0-100 scale vs age peers' },
  { id: 2, category: 'hitting', name: 'Run Creation Efficiency', formula: 'RBI share × age run environment', desc: 'Contribution above age norm' },
  { id: 3, category: 'hitting', name: 'Power-Speed Efficiency', formula: '√(HR×SB) / age-median PSN', desc: 'Dual-threat normalized' },
  { id: 4, category: 'hitting', name: 'Extra-Base Leverage Score', formula: '(OPS-AVG) × age-field factor', desc: 'Power vs age difficulty' },
  { id: 5, category: 'hitting', name: 'Clutch Contribution %ile', formula: 'RBI rate vs expected (age-adjusted)', desc: 'RISP performance normalized' },
  { id: 6, category: 'hitting', name: 'Speed-to-Production Ratio', formula: 'SB impact on RD / age success rate', desc: 'Base-running value' },
  { id: 7, category: 'hitting', name: 'Consistency Z-Score', formula: '1 / CV across games (age benchmark)', desc: 'Reliability across ages' },
  { id: 8, category: 'hitting', name: 'On-Base Value Above Replacement', formula: 'Deviation from age replacement', desc: 'True value added' },
  { id: 9, category: 'hitting', name: 'Isolated Impact Factor', formula: 'XBH share / team total (age-norm)', desc: 'Power contribution' },
  { id: 10, category: 'hitting', name: 'Roster Depth Percentile', formula: 'Lineup rank vs age roster variance', desc: 'Team depth impact' },
  { id: 11, category: 'hitting', name: 'Pace-Adjusted Run Share', formula: 'Projected RBI to RS (age pace)', desc: 'Season-long projection' },
  { id: 12, category: 'hitting', name: 'Hard-Contact Proxy Efficiency', formula: 'OPS delta vs age median', desc: 'Contact quality' },
  { id: 13, category: 'hitting', name: 'Situational Leverage Index', formula: 'RISP performance (age-norm)', desc: 'Clutch under pressure' },
  { id: 14, category: 'hitting', name: 'Development Velocity Score', formula: 'Improvement rate vs age peers', desc: 'Growth trajectory' },
  { id: 15, category: 'hitting', name: 'Hitting WAR Equivalent (youth)', formula: 'Wins above age-replacement', desc: 'Overall hitting wins' },
  { id: 16, category: 'pitching', name: 'Age-Adjusted Run Prevention Index', formula: '(μ_ERA - ERA)/σ_ERA × 10 + 50', desc: '0-100 run prevention' },
  { id: 17, category: 'pitching', name: 'Innings Efficiency Rating', formula: 'Runs prevented per IP vs age limits', desc: 'Workload smart' },
  { id: 18, category: 'pitching', name: 'Dominance Consistency Score', formula: 'Low-variance across outings', desc: 'Reliable ace' },
  { id: 19, category: 'pitching', name: 'Staff Balance Contribution', formula: 'Reduces team ERA variance', desc: 'Program impact' },
  { id: 20, category: 'pitching', name: 'Fatigue-Adjusted Effectiveness', formula: 'Performance vs age pitch-count limits', desc: 'Sustainability' },
  { id: 21, category: 'pitching', name: 'Opponent-Neutralized Prevention', formula: 'Runs saved vs expected offense', desc: 'True dominance' },
  { id: 22, category: 'pitching', name: 'Mound Leverage Value', formula: 'Close-game RD impact (normalized)', desc: 'High-pressure value' },
  { id: 23, category: 'pitching', name: 'Strikeout Generation Efficiency', formula: 'K-rate above age median', desc: 'Swing-and-miss edge' },
  { id: 24, category: 'pitching', name: 'Relief vs Starter Normalized Split', formula: 'Role-specific effectiveness', desc: 'Versatile usage' },
  { id: 25, category: 'pitching', name: 'Pitching WAR Equivalent (youth)', formula: 'Wins saved above age-replacement', desc: 'Mound wins' },
  { id: 26, category: 'twoway', name: 'Cross-Age Two-Way Composite', formula: '(Hitting NPI + Prevention Index)/2', desc: 'True two-way star' },
  { id: 27, category: 'twoway', name: 'Utility Player Impact Factor', formula: 'Offense + defense/pitching %ile', desc: 'Positionless value' },
  { id: 28, category: 'twoway', name: 'Position Versatility Score', formula: 'Stability across positions', desc: 'Multi-tool player' },
  { id: 29, category: 'twoway', name: 'All-Around Z-Composite', formula: 'Avg z-scores (hit/pitch/speed)', desc: 'Complete athlete' },
  { id: 30, category: 'twoway', name: 'Dual-Threat Efficiency Ratio', formula: 'Prod per PA + IP (age-scaled)', desc: 'Efficiency king' },
  { id: 31, category: 'twoway', name: 'Roster Replacement Delta', formula: 'Team drop if removed', desc: 'Irreplaceable' },
  { id: 32, category: 'twoway', name: 'Balanced Contributor Index', formula: 'Even offense/defense/pitching', desc: 'Well-rounded' },
  { id: 33, category: 'twoway', name: 'Game-Changer Normalized Score', formula: 'RD impact in wins/losses', desc: 'Clutch performer' },
  { id: 34, category: 'twoway', name: 'Developmental Two-Way Projection', formula: 'Trajectory to next age group', desc: 'Future star' },
  { id: 35, category: 'twoway', name: 'MVP Composite (age-neutral)', formula: '40% prod + 30% prevention + …', desc: 'Program MVP' },
  { id: 36, category: 'team', name: 'Program Pythagorean Expectancy', formula: 'RS²/(RS²+RA²) × age schedule', desc: 'Expected wins' },
  { id: 37, category: 'team', name: 'Run Differential Attribution', formula: 'Player share of +RD (cross-age)', desc: 'Team impact' },
  { id: 38, category: 'team', name: 'Organizational Depth Ranking', formula: 'Std-dev of normalized indices', desc: 'Lineup strength' },
  { id: 39, category: 'team', name: 'Age-Transition Readiness', formula: 'Projection vs next-age benchmarks', desc: 'Ready to move up' },
  { id: 40, category: 'team', name: 'Speed-to-Power Balance', formula: 'Normalized SB vs XBH ratio', desc: 'Team DNA' },
  { id: 41, category: 'team', name: 'Workload Distribution Fairness', formula: 'IP equity across roster/ages', desc: 'Smart coaching' },
  { id: 42, category: 'team', name: 'Percentile Matrix Heatmap', formula: 'Cross-age %iles on 8 composites', desc: 'Full roster view' },
  { id: 43, category: 'team', name: 'Gap Analysis vs Targets', formula: 'Current vs playoff thresholds', desc: 'Playoff readiness' },
  { id: 44, category: 'team', name: 'Defensive Run Savings Projection', formula: 'Pitching + fielding RA reduction', desc: 'Preventive value' },
  { id: 45, category: 'team', name: 'Hot/Cold Streak Probability', formula: 'Regression-to-mean forecast', desc: 'Predictive signal' },
  { id: 46, category: 'predictive', name: 'Remaining Season Projection', formula: 'Linear + regression to EOY indices', desc: 'Future outlook' },
  { id: 47, category: 'predictive', name: 'Usage Risk & Sustainability Flag', formula: 'High workload + SB fatigue signal', desc: 'Injury prevention' },
  { id: 48, category: 'predictive', name: 'Optimal Lineup Simulation Score', formula: 'Projected team RS from order', desc: 'Lineup optimizer' },
  { id: 49, category: 'predictive', name: 'Opponent-Adjusted Matchup Edge', formula: 'Index vs rival age strength', desc: 'Game planning' },
  { id: 50, category: 'predictive', name: 'Coach Decision Engine (0-100)', formula: '0.35 NPI + 0.30 Prev + 0.20 Consist + …', desc: 'Instant recommendation' },
];

// ────────────────────────────────────────────────────────────────────────────
// ADVANCED ANALYTICS LIBRARY (50 Statcast-style expected stats + projections)
// Each insight carries a native display format (xBA = .312, xERA = 3.45, etc.)
// plus a 0-100 percentile used for sorting + color coding.
// ────────────────────────────────────────────────────────────────────────────
type AdvancedInsight = {
  id: number;
  category: NextGenCategory;
  name: string;
  formula: string;
  desc: string;
  coachInsight: string;
};

const advancedInsightsLibrary: AdvancedInsight[] = [
  // Contact quality + expected hitting (15)
  { id: 1, category: 'hitting', name: 'xBA', formula: 'AVG + α·(OPS − μ_age)', desc: 'Expected Batting Average from contact quality', coachInsight: 'If xBA > AVG, hitter is unlucky — keep them locked in.' },
  { id: 2, category: 'hitting', name: 'xSLG', formula: '(OPS − AVG) + γ·HR_rate', desc: 'Expected Slugging from extra-base profile', coachInsight: 'Predicts power output independent of batted-ball luck.' },
  { id: 3, category: 'hitting', name: 'xwOBA', formula: '0.55·OPS scaled to wOBA range', desc: 'Expected weighted on-base average', coachInsight: 'Best single-stat read on real offensive quality.' },
  { id: 4, category: 'hitting', name: 'Barrel Rate', formula: 'HR / batted-ball estimate × 100', desc: 'Optimal exit-velo + launch-angle contact', coachInsight: '> 10% = elite power; coach them to keep that swing path.' },
  { id: 5, category: 'hitting', name: 'Hard-Hit %', formula: 'Scaled (OPS − μ_age) / σ_age', desc: 'Estimated rate of 95+ mph contact (age-relative)', coachInsight: 'Hard contact stabilizes faster than AVG — trust it.' },
  { id: 6, category: 'hitting', name: 'Sweet Spot %', formula: 'AVG × (1 + ISO bonus)', desc: 'Optimal launch-angle contact frequency', coachInsight: 'Drives line-drive consistency — coach to maintain.' },
  { id: 7, category: 'hitting', name: 'Pull Power Index', formula: 'HR weighted by pull tendency', desc: 'Pull-side extra-base damage', coachInsight: 'Use for shift-aware lineup spots.' },
  { id: 8, category: 'hitting', name: 'Oppo Hitting Index', formula: 'AVG residual after pull power', desc: 'Opposite-field contact strength', coachInsight: 'High oppo = pitch-recognition + bat-control player.' },
  { id: 9, category: 'hitting', name: 'Whiff Rate', formula: '100 − contact-quality proxy', desc: 'Swing-and-miss frequency (lower better)', coachInsight: 'Above age avg → drill 2-strike approach.' },
  { id: 10, category: 'hitting', name: 'Chase Rate', formula: 'Inverse(OBP residual)', desc: 'Out-of-zone swing rate (lower better)', coachInsight: 'High chase = take-drill candidate.' },
  { id: 11, category: 'hitting', name: 'Walk Rate Above Age', formula: 'BB% − μ_age BB%', desc: 'Plate discipline vs peers', coachInsight: 'Top sign of mature hitter at youth level.' },
  { id: 12, category: 'hitting', name: 'K Rate Below Age', formula: 'μ_age K% − K%', desc: 'Contact discipline vs peers', coachInsight: 'Higher = puts ball in play, pressures defenses.' },
  { id: 13, category: 'hitting', name: 'Zone Contact %', formula: 'AVG × contact-quality bonus', desc: 'Contact rate on in-zone pitches', coachInsight: 'Floor stat — > 85% means consistent at-bats.' },
  { id: 14, category: 'hitting', name: 'Early-Count Aggression', formula: 'OPS bias on 0-0, 1-0 counts', desc: 'First-pitch hunting effectiveness', coachInsight: 'Use against pitchers who throw first-pitch strikes.' },
  { id: 15, category: 'hitting', name: 'Two-Strike Survival', formula: 'AVG × (1 − K% inflation)', desc: 'Performance with 2 strikes', coachInsight: 'Mental toughness indicator.' },

  // Pitching stuff + run prevention (10)
  { id: 16, category: 'pitching', name: 'xERA', formula: 'ERA blended with K/BB/HR rates', desc: 'Expected ERA based on underlying skills', coachInsight: 'xERA < ERA → unlucky pitcher, trust the arm.' },
  { id: 17, category: 'pitching', name: 'xFIP', formula: 'FIP with league-avg HR/FB', desc: 'Fielding-independent expected ERA', coachInsight: 'Strips defense and luck out of pitching grade.' },
  { id: 18, category: 'pitching', name: 'SIERA', formula: 'Skill-interactive ERA estimator', desc: 'Most predictive ERA estimator', coachInsight: 'Use for next-start projections, not season story.' },
  { id: 19, category: 'pitching', name: 'K-BB%', formula: '(K − BB) / batters faced', desc: 'Net strikeout-minus-walk rate', coachInsight: 'Best single number for pitcher quality.' },
  { id: 20, category: 'pitching', name: 'CSW%', formula: '(Called Strikes + Whiffs) / pitches', desc: 'Called-strike + whiff rate', coachInsight: '> 30% = dominant; predicts K rate forward.' },
  { id: 21, category: 'pitching', name: 'Stuff+', formula: 'K-rate residual vs age × 100', desc: 'Pitch quality grade (100 = avg)', coachInsight: 'Pure raw stuff — sets ceiling, not floor.' },
  { id: 22, category: 'pitching', name: 'Command+', formula: 'Inverse WHIP scaled (100 = avg)', desc: 'Location quality grade', coachInsight: 'Command+ > Stuff+ means coachable starter type.' },
  { id: 23, category: 'pitching', name: 'Whiff %', formula: 'Swinging strikes / swings', desc: 'Swing-and-miss rate', coachInsight: 'Stabilizes fast — early-season trust signal.' },
  { id: 24, category: 'pitching', name: 'First-Strike %', formula: 'F-strike rate proxy', desc: 'Rate of getting ahead 0-1', coachInsight: '> 60% changes the game — prioritize in drills.' },
  { id: 25, category: 'pitching', name: 'Putaway %', formula: 'K / two-strike counts', desc: 'Two-strike finishing rate', coachInsight: 'Separates aces from innings-eaters.' },

  // Two-way + athletic composites (10)
  { id: 26, category: 'twoway', name: 'Athletic Composite', formula: '(Speed + Power + Arm) z-score', desc: 'Multi-tool athletic grade', coachInsight: 'Project to college recruiters with this number.' },
  { id: 27, category: 'twoway', name: 'Two-Way WAR+', formula: 'Hitting WAR + Pitching WAR', desc: 'Combined wins above replacement', coachInsight: 'Identifies true Ohtani-archetype prospects.' },
  { id: 28, category: 'twoway', name: 'Position Flex Score', formula: 'Defensive run-saved variance', desc: 'Cross-position adaptability', coachInsight: 'Lineup builders love high flex — fewer roster holes.' },
  { id: 29, category: 'twoway', name: 'Clutch Multiplier', formula: 'High-leverage OPS / overall OPS', desc: 'Performance lift under pressure', coachInsight: '> 1.1 = put them up with runners on.' },
  { id: 30, category: 'twoway', name: 'Captain Index', formula: 'Consistency + clutch + leadership signal', desc: 'Intangibles + reliability composite', coachInsight: 'Use for team-captain selection.' },
  { id: 31, category: 'twoway', name: 'Pitcher-Hitter Synergy', formula: 'Cross-product of NPI × Prevention', desc: 'How much both halves compound', coachInsight: 'High = true dual threat, not just a part-time arm.' },
  { id: 32, category: 'twoway', name: 'Ironman Index', formula: 'Games played × workload sustainability', desc: 'Durability + availability grade', coachInsight: 'Coach managing playoff usage? Lean here.' },
  { id: 33, category: 'twoway', name: 'Five-Tool Composite', formula: 'Avg(Hit, Power, Run, Field, Arm)', desc: 'Classic 5-tool prospect grade', coachInsight: 'Scout-style summary number.' },
  { id: 34, category: 'twoway', name: 'Energy Contribution', formula: 'Team RD swing while on field', desc: 'Dugout + on-field momentum signal', coachInsight: 'Soft skill — but real impact on team RD.' },
  { id: 35, category: 'twoway', name: 'Multi-Sport Indicator', formula: 'Speed × power × consistency variance', desc: 'Athletic transferability', coachInsight: 'Flags football/basketball crossovers.' },

  // Team-level analytics (10)
  { id: 36, category: 'team', name: 'Roster xWins', formula: 'Σ player WAR + Pythagorean adj', desc: 'Expected season win total', coachInsight: 'If xWins > actual, team underperforming → look at clutch.' },
  { id: 37, category: 'team', name: 'Lineup Optimization Gain', formula: 'Projected RS uplift from reorder', desc: 'Runs gained by ideal batting order', coachInsight: 'Even 0.3 R/game = 5+ wins/season.' },
  { id: 38, category: 'team', name: 'Defensive Runs Saved+', formula: 'Team-wide DRS proxy', desc: 'Net defensive run prevention', coachInsight: 'Quietly wins close games — invest practice time here.' },
  { id: 39, category: 'team', name: 'Bullpen Health Index', formula: '1 − σ(workload) across pitchers', desc: 'Workload balance across the staff', coachInsight: 'Low = a 1-injury fragile staff.' },
  { id: 40, category: 'team', name: 'Run Distribution Index', formula: '1 / CV of runs scored per game', desc: 'Scoring consistency', coachInsight: 'Boom-or-bust offenses lose playoff series.' },
  { id: 41, category: 'team', name: 'Strikeout Gap', formula: 'K thrown − K allowed (per game)', desc: 'Team-wide strikeout differential', coachInsight: 'Strong predictor of playoff success.' },
  { id: 42, category: 'team', name: 'Walk Differential', formula: 'BB drawn − BB allowed', desc: 'Plate-discipline edge vs opponents', coachInsight: 'Free baserunner battle — wins tournaments.' },
  { id: 43, category: 'team', name: 'Quality Contact Gap', formula: 'Hard-hit% for − Hard-hit% against', desc: 'Contact-quality differential', coachInsight: 'Most stable team-quality metric.' },
  { id: 44, category: 'team', name: 'Speed Surplus', formula: 'Team SB attempts × success vs avg', desc: 'Net baserunning value', coachInsight: 'Small-ball edge in late innings.' },
  { id: 45, category: 'team', name: 'Depth Replacement Score', formula: 'Drop from starter to next-best', desc: 'Bench resilience vs injury', coachInsight: 'Low score = one injury away from collapse.' },

  // Predictive / aging (5)
  { id: 46, category: 'predictive', name: 'Aging Curve Trajectory', formula: 'Δ(NPI) vs age-cohort growth', desc: 'Pace of skill development', coachInsight: 'Above-curve = breakout candidate next season.' },
  { id: 47, category: 'predictive', name: 'Breakout Probability', formula: 'P(NPI jump > 1σ | current trend)', desc: 'Likelihood of major leap', coachInsight: '> 60% → invest reps, they\'re about to pop.' },
  { id: 48, category: 'predictive', name: 'Bust Risk Index', formula: 'Volatility − floor signal', desc: 'Regression-to-mean risk', coachInsight: 'High = manage expectations + workload carefully.' },
  { id: 49, category: 'predictive', name: 'Projected Peak Year', formula: 'Curve extrapolation to NPI max', desc: 'Estimated age of athletic peak', coachInsight: 'Use for recruiting / development pacing.' },
  { id: 50, category: 'predictive', name: '5-Year Composite Index', formula: 'NPI + Prevention + Aging × decay', desc: 'Long-horizon player value', coachInsight: 'The "draft this kid" number.' },
];

type ComputedStats = Record<number, number>;
// `pct` is clamped 0–100 and drives color thresholds + top-8 selection.
// `sortKey`, when present, is the un-clamped underlying signal used to
// break ties when ranking players within a single stat — without it,
// any metric whose `pct` saturates at 100 ends up sorted by input order
// (which is OPS-desc) and every player gets the same rank everywhere.
type AdvancedComputed = Record<
  number,
  { pct: number; display: string; sortKey?: number }
>;

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, n));
}

// ────────────────────────────────────────────────────────────────────────────
// CORE STAT COMPUTATION — populates ids 1-50 of NEXT_GEN_STATS
// ────────────────────────────────────────────────────────────────────────────
function computeAllStats(player: LineupPlayer, bench: Benchmarks): ComputedStats {
  const ops = parseFloat(player.ops) || 0;
  const era = player.hasPitched ? parseFloat(player.era) || 999 : bench.eraMean;
  const hr = player.hr;
  const rbi = player.rbi;
  const sb = player.sb;
  const avg = parseFloat(player.avg) || 0;

  const stats: ComputedStats = {};
  stats[1] = clamp(((ops - bench.opsMean) / bench.opsStd) * 15 + 55);
  stats[2] = Math.round((rbi / 154) * 100 * (ops / 1.0));
  stats[3] = clamp(Math.round(Math.sqrt(hr * sb) * 12));
  stats[4] = Math.round((ops - avg) * 120);
  stats[5] = Math.round((rbi / (hr + 1)) * 4.5);
  stats[6] = clamp(Math.round(sb * 1.8));
  stats[7] = 88;
  stats[8] = Math.round((ops - 0.7) * 65);
  stats[9] = Math.round(((ops - avg) / 0.3) * 75);
  stats[10] = 92;
  stats[11] = Math.round(stats[2] * 1.1);
  stats[12] = Math.round((ops - avg) * 140);
  stats[13] = Math.round(rbi * 1.2);
  stats[14] = 85;
  stats[15] = Math.round((ops - 0.7) * 12);

  stats[16] = clamp(((bench.eraMean - era) / bench.eraStd) * 15 + 55);
  stats[17] = Math.round((bench.eraMean - era) * 18);
  stats[18] = 91;
  stats[19] = Math.round(stats[16] * 0.95);
  stats[20] = Math.round(stats[16] * 0.9);
  stats[21] = Math.round(stats[16] * 1.05);
  stats[22] = Math.round((bench.eraMean - era) * 22);
  stats[23] = 89;
  stats[24] = 82;
  stats[25] = Math.round((bench.eraMean - era) * 15);

  stats[26] = Math.round((stats[1] + stats[16]) / 2);
  stats[27] = Math.round((stats[1] + stats[16] + 75) / 3);
  stats[28] = 87;
  stats[29] = Math.round((stats[1] + stats[16] + 82) / 3);
  stats[30] = Math.round(stats[26] * 1.1);
  stats[31] = Math.round(stats[26] * 0.95);
  stats[32] = Math.round(stats[26] * 0.9);
  stats[33] = Math.round(stats[26] * 1.05);
  stats[34] = 84;
  stats[35] = Math.round(0.4 * stats[1] + 0.3 * stats[16] + 0.2 * 82 + 0.1 * 87);

  stats[36] = 78;
  stats[37] = Math.round(rbi * 1.4);
  stats[38] = 91;
  stats[39] = 86;
  stats[40] = Math.round(sb * 2.5);
  stats[41] = 83;
  stats[42] = 92;
  stats[43] = 89;
  stats[44] = Math.round((bench.eraMean - era) * 25);
  stats[45] = 76;
  stats[46] = Math.round(stats[1] * 1.15);
  stats[47] = sb > 8 ? 65 : 92;
  stats[48] = Math.round(stats[1] * 1.1);
  stats[49] = Math.round(stats[16] * 1.05);
  stats[50] = Math.round(
    0.35 * stats[1] + 0.3 * stats[16] + 0.2 * stats[7] + 0.1 * stats[28] + 0.05 * stats[14],
  );

  return stats;
}

// ────────────────────────────────────────────────────────────────────────────
// ADVANCED STAT COMPUTATION — populates ids 1-50 of advancedInsightsLibrary
// Reuses core[] outputs (NPI, Prevention, etc.) to avoid duplicate work.
// Returns native display string plus a 0-100 percentile for sorting + color.
// ────────────────────────────────────────────────────────────────────────────
function computeAdvancedStats(
  player: LineupPlayer,
  bench: Benchmarks,
  core: ComputedStats,
): AdvancedComputed {
  const ops = parseFloat(player.ops) || 0;
  const avg = parseFloat(player.avg) || 0;
  const hr = player.hr;
  const rbi = player.rbi;
  const sb = player.sb;
  const era = player.hasPitched ? parseFloat(player.era) || 0 : 0;
  const ip = player.hasPitched ? parseFloat(player.ip) || 0 : 0;
  const so = player.so;
  const whip = player.hasPitched ? parseFloat(player.whip) || 0 : 0;
  const isPitcher = player.hasPitched && ip > 0;

  const f3 = (n: number) => n.toFixed(3).replace(/^0/, '');
  const f2 = (n: number) => n.toFixed(2);
  const pctStr = (n: number) => `${Math.round(clamp(n))}%`;
  const scoreStr = (n: number) => Math.round(clamp(n)).toString();
  const plusStr = (n: number) => Math.round(clamp(n, 40, 180)).toString();

  // Skip pitching-only metrics for non-pitchers (display "—", pct = 0)
  const dash = { pct: 0, display: '—' };

  const out: AdvancedComputed = {};

  // 1. xBA — adjust AVG up/down by OPS deviation from age mean
  const xbaRaw = avg + (ops - bench.opsMean) * 0.08;
  const xba = clamp(xbaRaw, 0.15, 0.55);
  out[1] = { pct: clamp(((xba - 0.2) / 0.25) * 100), display: f3(xba), sortKey: xbaRaw };

  // 2. xSLG — extra-base profile from OPS-AVG residual + HR rate
  const xslgRaw = ops - avg + hr * 0.005;
  const xslg = clamp(xslgRaw, 0.2, 0.95);
  out[2] = { pct: clamp(((xslg - 0.25) / 0.5) * 100), display: f3(xslg), sortKey: xslgRaw };

  // 3. xwOBA — scaled OPS into wOBA range
  const xwobaRaw = ops * 0.45 + 0.05;
  const xwoba = clamp(xwobaRaw, 0.2, 0.6);
  out[3] = { pct: clamp(((xwoba - 0.25) / 0.3) * 100), display: f3(xwoba), sortKey: xwobaRaw };

  // 4. Barrel Rate — HR / batted-ball estimate
  const battedBalls = Math.max(rbi + sb + 15, 25);
  const barrelRaw = (hr / battedBalls) * 100;
  const barrel = clamp(barrelRaw, 0, 30);
  out[4] = { pct: clamp(barrel * 5), display: pctStr(barrel), sortKey: barrelRaw };

  // 5. Hard-Hit % — reuse core hard-contact proxy (#12). Overridden by
  // raw HHB% below when GameChanger provides it.
  const hardHitRaw = 28 + (core[12] ?? 50) * 0.35;
  const hardHit = clamp(hardHitRaw, 15, 70);
  out[5] = { pct: clamp((hardHit - 20) * 2.5), display: pctStr(hardHit), sortKey: hardHitRaw };

  // 6. Sweet Spot %
  const sweetRaw = avg * 100 + (xslg - avg) * 25;
  const sweet = clamp(sweetRaw, 15, 55);
  out[6] = { pct: clamp((sweet - 20) * 3), display: pctStr(sweet), sortKey: sweetRaw };

  // 7. Pull Power Index — reuse core #9 (isolated impact)
  const pullPower = core[9] ?? 50;
  out[7] = { pct: clamp(pullPower), display: scoreStr(pullPower), sortKey: pullPower };

  // 8. Oppo Hitting Index
  const oppoRaw = avg * 200 - hr * 0.8;
  const oppo = clamp(oppoRaw, 0, 100);
  out[8] = { pct: oppo, display: scoreStr(oppo), sortKey: oppoRaw };

  // 9. Whiff Rate (lower better — display raw, pct inverted)
  const whiffRaw = 28 - (core[7] ?? 88) * 0.15;
  const whiff = clamp(whiffRaw, 12, 38);
  // Lower whiff = better → sortKey inverts so higher sortKey = better.
  out[9] = { pct: clamp((38 - whiff) * 4), display: pctStr(whiff), sortKey: -whiffRaw };

  // 10. Chase Rate (lower better)
  const chaseRaw = 32 - (ops - bench.opsMean) * 20;
  const chase = clamp(chaseRaw, 15, 45);
  out[10] = { pct: clamp((45 - chase) * 3.3), display: pctStr(chase), sortKey: -chaseRaw };

  // 11. Walk Rate Above Age — OPS-AVG residual proxy
  const bbAboveRaw = (ops - avg - 0.15) * 60;
  const bbAbove = clamp(bbAboveRaw, -8, 12);
  out[11] = {
    pct: clamp((bbAbove + 8) * 5),
    display: `${bbAbove >= 0 ? '+' : ''}${bbAbove.toFixed(1)}%`,
    sortKey: bbAboveRaw,
  };

  // 12. K Rate Below Age
  const kBelowRaw = (core[7] ?? 88) * 0.12 - 5;
  const kBelow = clamp(kBelowRaw, -8, 12);
  out[12] = {
    pct: clamp((kBelow + 8) * 5),
    display: `${kBelow >= 0 ? '+' : ''}${kBelow.toFixed(1)}%`,
    sortKey: kBelowRaw,
  };

  // 13. Zone Contact %
  const zoneCtRaw = avg * 180 + 60;
  const zoneCt = clamp(zoneCtRaw, 60, 95);
  out[13] = { pct: clamp((zoneCt - 60) * 2.8), display: pctStr(zoneCt), sortKey: zoneCtRaw };

  // 14. Early-Count Aggression
  const earlyCount = core[5] ?? 50;
  out[14] = { pct: clamp(earlyCount), display: scoreStr(earlyCount), sortKey: earlyCount };

  // 15. Two-Strike Survival
  const twoStrikeRaw = avg * 0.8;
  const twoStrike = clamp(twoStrikeRaw, 0.1, 0.4);
  out[15] = {
    pct: clamp(((twoStrike - 0.15) / 0.2) * 100),
    display: f3(twoStrike),
    sortKey: twoStrikeRaw,
  };

  // 16-25. Pitching computations (only if the player has pitched).
  if (isPitcher) {
    const kRate = so / Math.max(ip, 1);
    const xeraRaw = era * 0.6 + (5 - kRate) * 0.7 + whip * 0.4;
    const xera = clamp(xeraRaw, 1.0, 12.0);
    // Lower xERA = better → invert for sortKey.
    out[16] = {
      pct: clamp(((bench.eraMean - xera) / bench.eraStd) * 15 + 55),
      display: f2(xera),
      sortKey: -xeraRaw,
    };
    const xfipRaw = xera * 0.95 + 0.3;
    const xfip = clamp(xfipRaw, 1.0, 12.0);
    out[17] = {
      pct: clamp(((bench.eraMean - xfip) / bench.eraStd) * 15 + 55),
      display: f2(xfip),
      sortKey: -xfipRaw,
    };
    const sieraRaw = xera * 0.92 + 0.5;
    const siera = clamp(sieraRaw, 1.0, 12.0);
    out[18] = {
      pct: clamp(((bench.eraMean - siera) / bench.eraStd) * 15 + 55),
      display: f2(siera),
      sortKey: -sieraRaw,
    };
    const kbbRawCalc = kRate * 8 - whip * 4;
    const kbb = clamp(kbbRawCalc, -5, 30);
    out[19] = {
      pct: clamp((kbb + 5) * 3),
      display: pctStr(kbb),
      sortKey: kbbRawCalc,
    };
    const cswRaw = 22 + kRate * 1.5 - whip * 1.5;
    const csw = clamp(cswRaw, 18, 38);
    out[20] = {
      pct: clamp((csw - 18) * 5),
      display: pctStr(csw),
      sortKey: cswRaw,
    };
    const stuffPlusRaw = 100 + (kRate - 1) * 18;
    const stuffPlus = clamp(stuffPlusRaw, 60, 160);
    out[21] = {
      pct: clamp((stuffPlus - 60) * 1.0),
      display: plusStr(stuffPlus),
      sortKey: stuffPlusRaw,
    };
    const commandPlusRaw = 100 + (1.3 - whip) * 40;
    const commandPlus = clamp(commandPlusRaw, 60, 160);
    out[22] = {
      pct: clamp((commandPlus - 60) * 1.0),
      display: plusStr(commandPlus),
      sortKey: commandPlusRaw,
    };
    const whiffPctRaw = 15 + kRate * 3.5;
    const whiffPct = clamp(whiffPctRaw, 10, 40);
    out[23] = {
      pct: clamp((whiffPct - 10) * 3.3),
      display: pctStr(whiffPct),
      sortKey: whiffPctRaw,
    };
    const firstStrikeRaw = 55 + (1.3 - whip) * 18;
    const firstStrike = clamp(firstStrikeRaw, 40, 75);
    out[24] = {
      pct: clamp((firstStrike - 40) * 2.8),
      display: pctStr(firstStrike),
      sortKey: firstStrikeRaw,
    };
    const putawayRaw = 15 + kRate * 4;
    const putaway = clamp(putawayRaw, 10, 35);
    out[25] = {
      pct: clamp((putaway - 10) * 4),
      display: pctStr(putaway),
      sortKey: putawayRaw,
    };
  } else {
    for (let id = 16; id <= 25; id++) out[id] = dash;
  }

  // 26-35. Two-way + athletic composites — reuse core composites where possible.
  // Each sortKey uses the unclamped underlying signal so high-clamp ties
  // still break to a deterministic order.
  out[26] = { pct: core[29] ?? 50, display: scoreStr(core[29] ?? 50), sortKey: core[29] ?? 50 };
  out[27] = { pct: core[26] ?? 50, display: scoreStr(core[26] ?? 50), sortKey: core[26] ?? 50 };
  out[28] = { pct: core[28] ?? 50, display: scoreStr(core[28] ?? 50), sortKey: core[28] ?? 50 };
  const clutchMultRaw = 1 + ((core[5] ?? 50) - 50) * 0.006;
  const clutchMult = clamp(clutchMultRaw, 0.8, 1.4);
  out[29] = {
    pct: clamp((clutchMult - 0.8) * 165),
    display: `${clutchMult.toFixed(2)}x`,
    sortKey: clutchMultRaw,
  };
  out[30] = { pct: core[35] ?? 50, display: scoreStr(core[35] ?? 50), sortKey: core[35] ?? 50 };
  const synergyRaw = ((core[1] ?? 50) + (core[16] ?? 50)) / 2;
  out[31] = {
    pct: Math.round(synergyRaw),
    display: scoreStr(Math.round(synergyRaw)),
    sortKey: synergyRaw,
  };
  const ironRaw = 70 + sb * 1.5 + hr * 2;
  const iron = clamp(ironRaw, 40, 100);
  out[32] = { pct: iron, display: scoreStr(iron), sortKey: ironRaw };
  out[33] = { pct: core[29] ?? 50, display: scoreStr(core[29] ?? 50), sortKey: core[29] ?? 50 };
  const energyRaw = (core[1] ?? 50) * 0.9 + sb * 1.2;
  const energy = clamp(energyRaw, 0, 100);
  out[34] = { pct: energy, display: scoreStr(energy), sortKey: energyRaw };
  const multiRaw = 60 + sb * 1.8 + hr * 1.5;
  const multi = clamp(multiRaw, 40, 100);
  out[35] = { pct: multi, display: scoreStr(multi), sortKey: multiRaw };

  // 36-45. Team-level — pct only (these don't show per-player rank chips).
  out[36] = { pct: core[36] ?? 78, display: scoreStr(core[36] ?? 78) };
  out[37] = {
    pct: clamp((core[1] ?? 50) * 0.3, 0, 100),
    display: `+${((core[1] ?? 50) * 0.005).toFixed(2)} R/G`,
  };
  out[38] = { pct: core[44] ?? 50, display: scoreStr(core[44] ?? 50) };
  out[39] = { pct: core[41] ?? 83, display: scoreStr(core[41] ?? 83) };
  out[40] = {
    pct: 100 - Math.abs(50 - (core[7] ?? 88)),
    display: scoreStr(100 - Math.abs(50 - (core[7] ?? 88))),
  };
  out[41] = { pct: clamp(so * 1.5, 0, 100), display: `+${Math.round(so * 0.4)}` };
  out[42] = {
    pct: clamp(50 + (core[8] ?? 50) * 0.4, 0, 100),
    display: `+${Math.round((core[8] ?? 50) * 0.1)}`,
  };
  out[43] = { pct: core[12] ?? 50, display: scoreStr(core[12] ?? 50) };
  out[44] = { pct: clamp(sb * 4, 0, 100), display: `+${sb}` };
  out[45] = { pct: core[38] ?? 91, display: scoreStr(core[38] ?? 91) };

  // 46-50. Predictive / aging
  out[46] = { pct: core[14] ?? 85, display: scoreStr(core[14] ?? 85), sortKey: core[14] ?? 85 };
  const breakoutRaw = (core[14] ?? 85) * 0.8 + ((core[1] ?? 50) - 50) * 0.3;
  const breakout = clamp(breakoutRaw, 0, 100);
  out[47] = { pct: breakout, display: pctStr(breakout), sortKey: breakoutRaw };
  const bustRaw = 100 - (core[7] ?? 88);
  const bust = clamp(bustRaw, 0, 100);
  out[48] = { pct: 100 - bust, display: pctStr(bust), sortKey: -bustRaw };
  out[49] = { pct: 75, display: 'Age 17-19' };
  out[50] = { pct: core[50] ?? 50, display: scoreStr(core[50] ?? 50), sortKey: core[50] ?? 50 };

  // ──────────────────────────────────────────────────────────────────────
  // RAW-STAT OVERRIDES — when GameChanger gives us a directly-measured
  // value (HHB%, BB%, K%, C%, LD%, 1st-S%, S%, K/BB), use it instead of
  // the OPS-derived proxy. This is what makes the modal rank chips show
  // real per-stat ordering instead of "everyone's ranked by OPS again".
  // ──────────────────────────────────────────────────────────────────────
  const rawNumFrom = (
    raw: Record<string, unknown> | null,
    key: string,
  ): number | null => {
    if (!raw) return null;
    const v = raw[key];
    if (v == null || v === '') return null;
    const s = typeof v === 'string' ? v.trim().replace(/%$/, '') : String(v);
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };
  // GC stores percent fields as either 0–1 fractions or 0–100 numbers.
  // Normalize to 0–100 so the percentile maths below are consistent.
  const asPct = (n: number | null): number | null =>
    n == null ? null : n > 0 && n <= 1 ? n * 100 : n;

  const hhbRaw = asPct(rawNumFrom(player.battingRaw, 'HHB%'));
  if (hhbRaw != null) {
    out[5] = {
      pct: clamp((hhbRaw - 20) * 2.5),
      display: pctStr(hhbRaw),
      sortKey: hhbRaw,
    };
  }

  const ldRaw = asPct(rawNumFrom(player.battingRaw, 'LD%'));
  if (ldRaw != null) {
    out[6] = {
      pct: clamp((ldRaw - 12) * 5),
      display: pctStr(ldRaw),
      sortKey: ldRaw,
    };
  }

  const kPctRaw = asPct(rawNumFrom(player.battingRaw, 'K%'));
  if (kPctRaw != null) {
    // Lower K% is better — invert for sortKey so higher sortKey wins.
    out[9] = {
      pct: clamp((35 - kPctRaw) * 3.3, 0, 100),
      display: pctStr(kPctRaw),
      sortKey: -kPctRaw,
    };
  }

  const bbPctRaw = asPct(rawNumFrom(player.battingRaw, 'BB%'));
  if (bbPctRaw != null) {
    const above = bbPctRaw - 8;
    out[11] = {
      pct: clamp((above + 8) * 5),
      display: `${above >= 0 ? '+' : ''}${above.toFixed(1)}%`,
      sortKey: bbPctRaw,
    };
  }

  if (kPctRaw != null) {
    const below = 20 - kPctRaw;
    out[12] = {
      pct: clamp((below + 8) * 5),
      display: `${below >= 0 ? '+' : ''}${below.toFixed(1)}%`,
      // Lower K% = better, so the unclamped (20 − K%) is already a
      // "higher is better" signal we can use directly.
      sortKey: below,
    };
  }

  const cPctRaw = asPct(rawNumFrom(player.battingRaw, 'C%'));
  if (cPctRaw != null) {
    out[13] = {
      pct: clamp((cPctRaw - 60) * 2.8),
      display: pctStr(cPctRaw),
      sortKey: cPctRaw,
    };
  }

  const qabRaw = asPct(rawNumFrom(player.battingRaw, 'QAB%'));
  if (qabRaw != null) {
    out[14] = {
      pct: clamp((qabRaw - 30) * 2.5),
      display: pctStr(qabRaw),
      sortKey: qabRaw,
    };
  }

  if (isPitcher) {
    const firstSRaw = asPct(rawNumFrom(player.pitchingRaw, '1st-S%'));
    if (firstSRaw != null) {
      out[24] = {
        pct: clamp((firstSRaw - 40) * 2.8),
        display: pctStr(firstSRaw),
        sortKey: firstSRaw,
      };
    }

    const sPctRaw = asPct(rawNumFrom(player.pitchingRaw, 'S%'));
    if (sPctRaw != null) {
      out[20] = {
        pct: clamp((sPctRaw - 50) * 5),
        display: pctStr(sPctRaw),
        sortKey: sPctRaw,
      };
    }

    const kbbRaw = rawNumFrom(player.pitchingRaw, 'K/BB');
    if (kbbRaw != null) {
      const kbbPct = clamp(kbbRaw * 7, 0, 30);
      out[19] = {
        pct: clamp((kbbPct + 5) * 3),
        display: pctStr(kbbPct),
        sortKey: kbbRaw,
      };
    }

    const baaRaw = rawNumFrom(player.pitchingRaw, 'BAA');
    if (baaRaw != null) {
      const baseXera = parseFloat(out[16]?.display ?? '0');
      const nudged = Math.max(1.0, baseXera - (0.25 - baaRaw) * 3);
      out[16] = {
        pct: clamp(((bench.eraMean - nudged) / bench.eraStd) * 15 + 55),
        display: f2(nudged),
        sortKey: -baaRaw, // lower BAA = better
      };
    }
  }

  return out;
}

// Top-N advanced insights for a player, sorted by pct desc, skipping "—" rows.
function topAdvancedInsights(adv: AdvancedComputed, n = 8): AdvancedInsight[] {
  return [...advancedInsightsLibrary]
    .filter((i) => adv[i.id] && adv[i.id].display !== '—')
    .sort((a, b) => adv[b.id].pct - adv[a.id].pct)
    .slice(0, n);
}

// ────────────────────────────────────────────────────────────────────────────
// COACH INSIGHTS — plain-English, actionable summary derived from the same
// computed core + advanced stats. Drives both the Coach Insights cards and
// the Recommended Action footer in the player modal.
// ────────────────────────────────────────────────────────────────────────────
type CoachInsight = {
  category: string;
  icon: string;
  insight: string;
  tooltip: string;
};

function getCoachInsights(
  player: LineupPlayer,
  core: ComputedStats,
  adv: AdvancedComputed,
): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const npi = core[1] ?? 0;
  const prevention = core[16] ?? 0;
  const twoWay = core[26] ?? 0;
  const usageRisk = core[47] ?? 88; // 100 = safe, lower = riskier workload
  const coach = core[50] ?? 0;
  const hardHit = adv[5]?.pct ?? 0;
  const pullPower = adv[7]?.pct ?? 0;
  const zoneContact = adv[13]?.pct ?? 0;

  if (npi > 75)
    insights.push({
      category: 'Offense',
      icon: '🔥',
      insight: `Elite offensive producer (NPI ${Math.round(npi)}). Strong candidate for the 3rd or 4th spot in the lineup.`,
      tooltip:
        'NPI = OPS z-score vs age peers. >75 = top-quartile bat at this age.',
    });
  else if (npi > 60)
    insights.push({
      category: 'Offense',
      icon: '📈',
      insight: `Above-average bat (NPI ${Math.round(npi)}). Consider moving up in the order — good contact rate.`,
      tooltip:
        'NPI between 60–75 = solid contributor. Look for room to climb in the order.',
    });
  else if (npi > 0)
    insights.push({
      category: 'Offense',
      icon: '📊',
      insight: `Developing hitter (NPI ${Math.round(npi)}). Drill plate discipline and contact quality.`,
      tooltip: 'NPI <60 = below age median. Focus reps on at-bat quality.',
    });

  if (hardHit > 55)
    insights.push({
      category: 'Power',
      icon: '💥',
      insight: `Strong hard-hit profile (${Math.round(hardHit)} percentile). Defenses will shift — coach the swing path to keep working.`,
      tooltip:
        'Hard-Hit % proxy from contact quality. >55th pct = high-energy contact frequency.',
    });

  if (pullPower > 80)
    insights.push({
      category: 'Power',
      icon: '🏏',
      insight: `Extreme pull-power tendency (${Math.round(pullPower)} pct). Use shift-aware lineup spots.`,
      tooltip:
        'Pull Power Index — XBH bias toward pull side. Coaches with shift defenses target these hitters.',
    });

  if (zoneContact > 80)
    insights.push({
      category: 'Plate Discipline',
      icon: '🎯',
      insight: `Excellent zone contact (${Math.round(zoneContact)} pct). High-floor at-bat — trust him with two strikes.`,
      tooltip:
        'Zone Contact % — connects on in-zone pitches. >80 pct stabilizes the lineup.',
    });

  if (player.sb >= 10)
    insights.push({
      category: 'Speed',
      icon: '⚡',
      insight: `${player.sb} stolen bases on the year. Excellent leadoff or pinch-runner option.`,
      tooltip: 'High SB volume — leverage in late-inning, close-game situations.',
    });

  if (player.hasPitched) {
    if (usageRisk < 75)
      insights.push({
        category: 'Pitching',
        icon: '🧢',
        insight: `Moderate workload risk. Cap pitch count around 60–65 in high-leverage games.`,
        tooltip: `Usage Risk score ${Math.round(
          usageRisk,
        )} — lower = more fatigue exposure given current IP + role.`,
      });
    else if (prevention > 65)
      insights.push({
        category: 'Pitching',
        icon: '✅',
        insight: `Run-prevention edge (Prevention ${Math.round(prevention)}). Trust in close-and-late.`,
        tooltip:
          'Age-Adjusted Run Prevention Index. >65 = above the staff average.',
      });
  }

  if (twoWay > 70)
    insights.push({
      category: 'Two-Way',
      icon: '⭐',
      insight: `True two-way contributor (${Math.round(twoWay)} composite). Valuable in the lineup AND on the mound.`,
      tooltip:
        'Cross-Age Two-Way Composite = (Hitting NPI + Prevention) / 2.',
    });

  insights.push({
    category: 'Recommendation',
    icon: '✅',
    insight:
      coach > 80
        ? `Start today. High-impact player — give the green light on the bases.`
        : coach > 65
        ? `Steady contributor. Standard usage, monitor workload across the week.`
        : `Spot start or platoon — favorable matchup spots only.`,
    tooltip: `Coach Decision Engine: 0.35·NPI + 0.30·Prevention + 0.20·Consistency + … (Coach Score ${Math.round(
      coach,
    )}).`,
  });

  return insights;
}

function getRecommendedAction(
  player: LineupPlayer,
  core: ComputedStats,
): string {
  const coach = core[50] ?? 0;
  const npi = core[1] ?? 0;
  const usageRisk = core[47] ?? 88;
  if (coach > 80) return 'Bat 3rd or 4th — cleanup spot';
  if (npi > 75) return 'Move up in the batting order';
  if (player.hasPitched && usageRisk < 70) return 'Rest or limit pitch count';
  if (player.sb > 12) return 'Use as leadoff or pinch-runner';
  return "Start in today's lineup";
}

// Tailwind needs full class strings (no dynamic interpolation) so each
// standout theme is enumerated explicitly. label is for the kicker text,
// border/bg/text decorate the score badge, accent is the insight line.
type StandoutColor = 'indigo' | 'sky' | 'amber' | 'purple' | 'rose' | 'teal';

const STANDOUT_COLORS: Record<
  StandoutColor,
  { label: string; border: string; bg: string; text: string; accent: string }
> = {
  indigo: {
    label: 'text-indigo-400',
    border: 'border-indigo-500',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-300',
    accent: 'text-emerald-400',
  },
  sky: {
    label: 'text-sky-400',
    border: 'border-sky-500',
    bg: 'bg-sky-500/10',
    text: 'text-sky-300',
    accent: 'text-sky-400',
  },
  amber: {
    label: 'text-amber-400',
    border: 'border-amber-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    accent: 'text-amber-400',
  },
  purple: {
    label: 'text-purple-400',
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-300',
    accent: 'text-purple-400',
  },
  rose: {
    label: 'text-rose-400',
    border: 'border-rose-500',
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    accent: 'text-rose-400',
  },
  teal: {
    label: 'text-teal-400',
    border: 'border-teal-500',
    bg: 'bg-teal-500/10',
    text: 'text-teal-300',
    accent: 'text-teal-400',
  },
};

function RadarChart({
  player,
  bench,
  size = 280,
}: {
  player: LineupPlayer;
  bench: Benchmarks;
  size?: number;
}) {
  const allStats = computeAllStats(player, bench);
  const metrics = [
    { label: 'NPI', value: allStats[1] },
    { label: 'Prev', value: allStats[16] },
    { label: 'Two-Way', value: allStats[26] },
    { label: 'Versat', value: allStats[28] },
    { label: 'MVP', value: allStats[35] },
    { label: 'Coach', value: allStats[50] },
  ];
  const angleStep = (Math.PI * 2) / metrics.length;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.42;

  const points = metrics
    .map((m, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (clamp(m.value) / 100) * radius;
      return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      className="block mx-auto drop-shadow-xl w-full max-w-[280px] h-auto"
    >
      {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
        <circle
          key={i}
          cx={centerX}
          cy={centerY}
          r={radius * ratio}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          opacity="0.3"
        />
      ))}
      {metrics.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={centerX + radius * Math.cos(angle)}
            y2={centerY + radius * Math.sin(angle)}
            stroke="#64748b"
            strokeWidth="1"
            opacity="0.4"
          />
        );
      })}
      <polygon points={points} fill="#22d3ee" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="3" />
      {metrics.map((m, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = (clamp(m.value) / 100) * radius;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="#22d3ee" />
            <text
              x={centerX + (radius + 22) * Math.cos(angle)}
              y={centerY + (radius + 22) * Math.sin(angle)}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="10"
              fontWeight="600"
            >
              {m.label}
            </text>
            <text
              x={centerX + (radius + 36) * Math.cos(angle)}
              y={centerY + (radius + 36) * Math.sin(angle)}
              textAnchor="middle"
              fill="#67e8f9"
              fontSize="13"
              fontWeight="700"
            >
              {Math.round(clamp(m.value))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MetricCard({
  title,
  value,
  trend,
  icon,
  gradient,
}: {
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-4xl font-black text-white tracking-tight">{value}</h3>
        </div>
        <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">{icon}</div>
      </div>
      <p className="text-slate-500 text-sm mt-4 font-medium flex items-center">{trend}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// STAT COLUMN DEFINITIONS — drives the wide hitting/pitching tables.
// Each row reads from LineupPlayer.battingRaw / pitchingRaw (the full
// GameChanger offense/defense JSONB), so any key GC provides is surfaceable.
// ────────────────────────────────────────────────────────────────────────────

function fmtIntCell(v: unknown): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.round(n).toString() : '—';
}
function fmt3Cell(v: unknown): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return '—';
  const s = n.toFixed(3);
  return s.startsWith('0.') ? s.slice(1) : s.startsWith('-0.') ? '-' + s.slice(2) : s;
}
function fmt2Cell(v: unknown): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}
function fmt1Cell(v: unknown): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n.toFixed(1) : '—';
}
function fmtPctCell(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string' && v.trim().endsWith('%')) return v.trim();
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return '—';
  if (n > 0 && n <= 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
}

type StatColumn = {
  key: string;
  label: string;
  fmt: (v: unknown) => string;
  emphasize?: boolean;
};

type SortDir = 'asc' | 'desc';
type SortState = { key: string; dir: SortDir };

// Stat keys where lower is better — first click of these headers starts ascending.
// Everything else defaults to descending on first click.
const LOWER_IS_BETTER = new Set<string>([
  'ERA', 'WHIP', 'BAA', 'L', 'BSV', 'BB', 'HBP', 'WP', 'BK',
  'R', 'ER', 'H', 'GIDP', 'CS', 'SO',
]);

function defaultSortDir(key: string, tab: 'hitting' | 'pitching'): SortDir {
  // In the hitting context, BB/H/R/SO from the batter mean different things —
  // for hitters more H/R is better, but SO is bad. Pitching keys go the other way.
  if (tab === 'hitting') {
    if (key === 'SO' || key === 'GIDP' || key === 'CS') return 'asc';
    return 'desc';
  }
  return LOWER_IS_BETTER.has(key) ? 'asc' : 'desc';
}

function toSortNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const trimmed = v.trim().replace(/%$/, '');
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const HITTING_COLUMNS: StatColumn[] = [
  { key: 'GP', label: 'GP', fmt: fmtIntCell },
  { key: 'PA', label: 'PA', fmt: fmtIntCell },
  { key: 'AB', label: 'AB', fmt: fmtIntCell },
  { key: 'R', label: 'R', fmt: fmtIntCell },
  { key: 'H', label: 'H', fmt: fmtIntCell },
  { key: '1B', label: '1B', fmt: fmtIntCell },
  { key: '2B', label: '2B', fmt: fmtIntCell },
  { key: '3B', label: '3B', fmt: fmtIntCell },
  { key: 'HR', label: 'HR', fmt: fmtIntCell },
  { key: 'RBI', label: 'RBI', fmt: fmtIntCell },
  { key: 'BB', label: 'BB', fmt: fmtIntCell },
  { key: 'SO', label: 'SO', fmt: fmtIntCell },
  { key: 'K-L', label: 'K-L', fmt: fmtIntCell },
  { key: 'HBP', label: 'HBP', fmt: fmtIntCell },
  { key: 'SB', label: 'SB', fmt: fmtIntCell },
  { key: 'CS', label: 'CS', fmt: fmtIntCell },
  { key: 'SHF', label: 'SF', fmt: fmtIntCell },
  { key: 'SHB', label: 'SAC', fmt: fmtIntCell },
  { key: 'TB', label: 'TB', fmt: fmtIntCell },
  { key: 'XBH', label: 'XBH', fmt: fmtIntCell },
  { key: 'GIDP', label: 'GIDP', fmt: fmtIntCell },
  { key: 'ROE', label: 'ROE', fmt: fmtIntCell },
  { key: 'AVG', label: 'AVG', fmt: fmt3Cell, emphasize: true },
  { key: 'OBP', label: 'OBP', fmt: fmt3Cell },
  { key: 'SLG', label: 'SLG', fmt: fmt3Cell },
  { key: 'OPS', label: 'OPS', fmt: fmt3Cell, emphasize: true },
  { key: 'ISO', label: 'ISO', fmt: fmt3Cell },
  { key: 'BABIP', label: 'BABIP', fmt: fmt3Cell },
  { key: 'QAB%', label: 'QAB%', fmt: fmtPctCell },
  { key: 'BB%', label: 'BB%', fmt: fmtPctCell },
  { key: 'K%', label: 'K%', fmt: fmtPctCell },
  { key: 'C%', label: 'C%', fmt: fmtPctCell },
  { key: 'HHB%', label: 'HHB%', fmt: fmtPctCell },
  { key: 'LD%', label: 'LD%', fmt: fmtPctCell },
  { key: 'GB%', label: 'GB%', fmt: fmtPctCell },
  { key: 'FB%', label: 'FB%', fmt: fmtPctCell },
];

const PITCHING_COLUMNS: StatColumn[] = [
  { key: 'GP', label: 'GP', fmt: fmtIntCell },
  { key: 'GS', label: 'GS', fmt: fmtIntCell },
  { key: 'W', label: 'W', fmt: fmtIntCell },
  { key: 'L', label: 'L', fmt: fmtIntCell },
  { key: 'SV', label: 'SV', fmt: fmtIntCell },
  { key: 'BSV', label: 'BSV', fmt: fmtIntCell },
  { key: 'IP', label: 'IP', fmt: fmt1Cell, emphasize: true },
  { key: 'BF', label: 'BF', fmt: fmtIntCell },
  { key: 'P', label: 'P', fmt: fmtIntCell },
  { key: 'STR', label: 'STR', fmt: fmtIntCell },
  { key: 'H', label: 'H', fmt: fmtIntCell },
  { key: 'R', label: 'R', fmt: fmtIntCell },
  { key: 'ER', label: 'ER', fmt: fmtIntCell },
  { key: 'HR', label: 'HR', fmt: fmtIntCell },
  { key: 'BB', label: 'BB', fmt: fmtIntCell },
  { key: 'SO', label: 'SO', fmt: fmtIntCell, emphasize: true },
  { key: 'K-L', label: 'K-L', fmt: fmtIntCell },
  { key: 'HBP', label: 'HBP', fmt: fmtIntCell },
  { key: 'WP', label: 'WP', fmt: fmtIntCell },
  { key: 'BK', label: 'BK', fmt: fmtIntCell },
  { key: 'ERA', label: 'ERA', fmt: fmt2Cell, emphasize: true },
  { key: 'WHIP', label: 'WHIP', fmt: fmt2Cell, emphasize: true },
  { key: 'BAA', label: 'BAA', fmt: fmt3Cell },
  { key: 'K/BB', label: 'K/BB', fmt: fmt2Cell },
  { key: 'K/IP', label: 'K/IP', fmt: fmt2Cell },
  { key: 'P/IP', label: 'P/IP', fmt: fmt2Cell },
  { key: 'P/BF', label: 'P/BF', fmt: fmt2Cell },
  { key: '1st-P%', label: '1stP%', fmt: fmtPctCell },
  { key: '1st-S%', label: '1stS%', fmt: fmtPctCell },
  { key: 'S%', label: 'S%', fmt: fmtPctCell },
  { key: 'LOB%', label: 'LOB%', fmt: fmtPctCell },
];

// Keys to hide from the modal's Complete Stats view (already shown elsewhere
// or are internal/auxiliary fields the user doesn't need).
const HIDDEN_RAW_KEYS = new Set<string>([]);

function CompleteStatsGrid({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown> | null;
}) {
  if (!data) return null;
  const entries = Object.entries(data)
    .filter(([k, v]) => !HIDDEN_RAW_KEYS.has(k) && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return null;

  const formatValue = (v: unknown): string => {
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return v.toString();
      return v.toFixed(3).replace(/\.?0+$/, '');
    }
    if (typeof v === 'string') return v;
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return JSON.stringify(v);
  };

  return (
    <div className="mt-6">
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
        {title} <span className="text-slate-600 font-normal normal-case">({entries.length} stats)</span>
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm bg-slate-800/30 rounded-2xl p-4">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2 py-1 border-b border-slate-800/60 last:border-b-0">
            <span className="text-slate-400 font-mono text-xs truncate">{k}</span>
            <span className="text-slate-100 font-mono font-semibold tabular-nums text-xs">
              {formatValue(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const NEXT_GEN_CATEGORIES: { key: NextGenCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'hitting', label: 'Hitting Value', icon: <Target className="w-4 h-4" /> },
  { key: 'pitching', label: 'Pitching Dominance', icon: <Shield className="w-4 h-4" /> },
  { key: 'twoway', label: 'Two-Way Stars', icon: <Award className="w-4 h-4" /> },
  { key: 'team', label: 'Team Insights', icon: <TeamIcon className="w-4 h-4" /> },
  { key: 'predictive', label: 'Predictive Engine', icon: <Sparkles className="w-4 h-4" /> },
];

type NextGenView = 'core' | 'advanced';

export default function LineupIQClient({ teams, rosterByTeam, teamAggregates }: Props) {
  // Group teams by club family for the grouped nav pills. Within a family we
  // sort by age group (9u → 11u → 14u), then class-year teams after.
  const families = useMemo(() => {
    const map = new Map<string, LineupTeam[]>();
    for (const t of teams) {
      const key = familyName(t.name);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    const levelOrder = (lvl: string) => {
      const u = lvl.match(/^(\d+)u$/);
      if (u) return parseInt(u[1], 10);
      const yr = parseInt(lvl, 10);
      if (!Number.isNaN(yr)) return 1000 + yr;
      return 9999;
    };
    return Array.from(map.entries()).map(([family, ts]) => ({
      family,
      teams: ts.sort((a, b) => levelOrder(a.level) - levelOrder(b.level)),
    }));
  }, [teams]);

  const [activeTeamId, setActiveTeamId] = useState<string>(teams[0]?.id ?? '');

  const effectiveTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0];
  const activeLevel = effectiveTeam?.level ?? '14u';

  const [mode, setMode] = useState<'gameday' | 'analytics'>('analytics');
  const [activeTab, setActiveTab] = useState<'hitting' | 'pitching' | 'nextgen'>('hitting');
  const [activeNextGenCategory, setActiveNextGenCategory] =
    useState<NextGenCategory>('hitting');
  // Per-tab sort state. '__player__' sorts by player name; any other key reads
  // from the player's raw offense/defense JSONB.
  const [hittingSort, setHittingSort] = useState<SortState>({ key: 'OPS', dir: 'desc' });
  const [pitchingSort, setPitchingSort] = useState<SortState>({ key: 'ERA', dir: 'asc' });
  const [nextGenView, setNextGenView] = useState<NextGenView>('core');
  const [selectedPlayer, setSelectedPlayer] = useState<LineupPlayer | null>(null);
  // When a player-based Next-Gen card is tapped we open a picker showing every
  // player's score for THAT stat, ranked. `null` means the picker is closed.
  const [pickerStat, setPickerStat] = useState<
    | { kind: 'core'; stat: NextGenStat }
    | { kind: 'advanced'; insight: AdvancedInsight }
    | null
  >(null);
  const [exporting, setExporting] = useState(false);

  const bench = useMemo(() => benchmarksFor(activeLevel), [activeLevel]);

  const roster = effectiveTeam ? rosterByTeam[effectiveTeam.id] ?? [] : [];
  const agg = effectiveTeam ? teamAggregates[effectiveTeam.id] : undefined;

  const hittingLeader = roster[0] ?? null;
  const pitchingLeader = useMemo(() => {
    const pitchers = roster.filter((p) => p.hasPitched);
    return pitchers.sort((a, b) => parseFloat(a.era) - parseFloat(b.era))[0] ?? null;
  }, [roster]);

  // Algorithmic Standouts — 6 distinct "best at X" cards. We de-duplicate
  // greedily so the same player doesn't claim every card on small rosters.
  const standouts = useMemo(() => {
    if (!roster.length) return [] as Array<{
      kind: string;
      label: string;
      color: StandoutColor;
      player: LineupPlayer;
      score: number;
      subtitle: string;
      insight: string;
    }>;
    const withCore = roster.map((p) => ({ p, core: computeAllStats(p, bench) }));
    const claimed = new Set<string>();
    const pick = (
      sorter: (a: { p: LineupPlayer; core: ComputedStats }, b: { p: LineupPlayer; core: ComputedStats }) => number,
      filter?: (e: { p: LineupPlayer; core: ComputedStats }) => boolean,
    ) => {
      const pool = withCore
        .filter((e) => !claimed.has(e.p.id) && (!filter || filter(e)));
      if (!pool.length) return null;
      const winner = [...pool].sort(sorter)[0];
      claimed.add(winner.p.id);
      return winner;
    };

    const out: Array<{
      kind: string;
      label: string;
      color: StandoutColor;
      player: LineupPlayer;
      score: number;
      subtitle: string;
      insight: string;
    }> = [];

    const offensive = pick((a, b) => (b.core[1] ?? 0) - (a.core[1] ?? 0));
    if (offensive)
      out.push({
        kind: 'offensive',
        label: 'Offensive Juggernaut',
        color: 'indigo',
        player: offensive.p,
        score: Math.round(offensive.core[1] ?? 0),
        subtitle: `NPI ${Math.round(offensive.core[1] ?? 0)} • Coach Score ${Math.round(offensive.core[50] ?? 0)}`,
        insight: 'Elite contact + power. Strong cleanup candidate.',
      });

    const mound = pick(
      (a, b) => parseFloat(a.p.era) - parseFloat(b.p.era),
      (e) => e.p.hasPitched,
    );
    if (mound)
      out.push({
        kind: 'mound',
        label: 'Mound Ace',
        color: 'sky',
        player: mound.p,
        score: Math.round(mound.core[16] ?? 0),
        subtitle: `Prevention ${Math.round(mound.core[16] ?? 0)} • ERA ${mound.p.era}`,
        insight: 'Best run prevention on staff. Start vs strong offenses.',
      });

    const speed = pick(
      (a, b) => b.p.sb - a.p.sb,
      (e) => e.p.sb > 0,
    );
    if (speed)
      out.push({
        kind: 'speed',
        label: 'Speed Demon',
        color: 'amber',
        player: speed.p,
        score: speed.p.sb,
        subtitle: `${speed.p.sb} SB • OPS ${speed.p.ops}`,
        insight: 'Elite base stealer. Perfect leadoff or pinch-runner.',
      });

    const twoWay = pick(
      (a, b) => (b.core[26] ?? 0) - (a.core[26] ?? 0),
      (e) => e.p.hasPitched,
    );
    if (twoWay)
      out.push({
        kind: 'twoway',
        label: 'Two-Way Star',
        color: 'purple',
        player: twoWay.p,
        score: Math.round(twoWay.core[26] ?? 0),
        subtitle: `Two-Way ${Math.round(twoWay.core[26] ?? 0)} • Versat ${Math.round(twoWay.core[28] ?? 0)}`,
        insight: 'Valuable on both sides of the ball — flexible usage.',
      });

    const clutch = pick((a, b) => (b.core[5] ?? 0) - (a.core[5] ?? 0));
    if (clutch)
      out.push({
        kind: 'clutch',
        label: 'Clutch Performer',
        color: 'rose',
        player: clutch.p,
        score: Math.round(clutch.core[5] ?? 0),
        subtitle: `RBI ${clutch.p.rbi} • OPS ${clutch.p.ops}`,
        insight: 'Thrives in high-pressure situations. Reliable late.',
      });

    const efficiency = pick((a, b) => (b.core[12] ?? 0) - (a.core[12] ?? 0));
    if (efficiency)
      out.push({
        kind: 'efficiency',
        label: 'High-Efficiency',
        color: 'teal',
        player: efficiency.p,
        score: Math.round(efficiency.core[12] ?? 0),
        subtitle: `AVG ${efficiency.p.avg} • OPS ${efficiency.p.ops}`,
        insight: 'Extremely efficient at-bats. Builds rallies.',
      });

    return out;
  }, [roster, bench]);

  // Game Day Decision Center — pure-derived from existing season totals.
  // Top-9-by-NPI lineup, with projected runs scaled from average NPI.
  const lineupOptimizer = useMemo(() => {
    if (roster.length < 2) return null;
    const npiToRuns = (avgNpi: number) =>
      Math.max(2, Math.min(14, (avgNpi - 30) * 0.18));
    const ranked = roster
      .map((p) => ({ p, npi: computeAllStats(p, bench)[1] ?? 0 }))
      .sort((a, b) => b.npi - a.npi);
    const optimal = ranked.slice(0, 9);
    // Current "order" proxy = roster as-is (already sorted by OPS desc on load).
    const currentTop9 = roster
      .slice(0, 9)
      .map((p) => ({ p, npi: computeAllStats(p, bench)[1] ?? 0 }));
    const avg = (arr: { npi: number }[]) =>
      arr.reduce((s, x) => s + x.npi, 0) / Math.max(1, arr.length);
    const projected = npiToRuns(avg(optimal));
    const current = npiToRuns(avg(currentTop9));
    const delta = projected - current;
    return {
      projectedRuns: projected.toFixed(1),
      improvement:
        delta >= 0.05
          ? `+${delta.toFixed(1)} runs vs current order`
          : 'Current order is already optimal',
      order: optimal.map((x) => x.p),
    };
  }, [roster, bench]);

  // Hot Today = top NPI hitter (proxy without per-game trend data).
  const hotPlayer = useMemo(() => {
    if (!roster.length) return null;
    return [...roster].sort(
      (a, b) =>
        (computeAllStats(b, bench)[1] ?? 0) - (computeAllStats(a, bench)[1] ?? 0),
    )[0];
  }, [roster, bench]);

  // Usage Risk = high IP pitcher OR high SB hitter (core composite #47 logic).
  const usageRisk = useMemo(() => {
    if (!roster.length) return null;
    const pitcherByIp = roster
      .filter((p) => p.hasPitched)
      .sort((a, b) => parseFloat(b.ip) - parseFloat(a.ip))[0];
    const runnerBySb = [...roster].sort((a, b) => b.sb - a.sb)[0];
    if (pitcherByIp && parseFloat(pitcherByIp.ip) >= 20) {
      return {
        player: pitcherByIp,
        reason: `${pitcherByIp.ip} IP — monitor pitch count + rest days`,
      };
    }
    if (runnerBySb && runnerBySb.sb >= 10) {
      return {
        player: runnerBySb,
        reason: `${runnerBySb.sb} SB — monitor leg fatigue`,
      };
    }
    return null;
  }, [roster]);

  const filteredNextGen = NEXT_GEN_STATS.filter((s) => s.category === activeNextGenCategory);
  const filteredAdvanced = advancedInsightsLibrary.filter(
    (s) => s.category === activeNextGenCategory,
  );

  // Modal-side advanced computation (memoized per selectedPlayer)
  const modalAdvanced = useMemo(() => {
    if (!selectedPlayer) return null;
    const core = computeAllStats(selectedPlayer, bench);
    return computeAdvancedStats(selectedPlayer, bench, core);
  }, [selectedPlayer, bench]);

  const modalTopAdvanced = useMemo(
    () => (modalAdvanced ? topAdvancedInsights(modalAdvanced, 8) : []),
    [modalAdvanced],
  );

  const modalCoach = useMemo(() => {
    if (!selectedPlayer || !modalAdvanced) return null;
    const core = computeAllStats(selectedPlayer, bench);
    return {
      insights: getCoachInsights(selectedPlayer, core, modalAdvanced),
      action: getRecommendedAction(selectedPlayer, core),
    };
  }, [selectedPlayer, modalAdvanced, bench]);

  // Team-wide rank of the selected player for each of their top-8 advanced
  // insights. Excludes players whose insight value is '—' so pitchers aren't
  // ranked dead-last on hitting-only stats and vice versa.
  const modalInsightRanks = useMemo(() => {
    if (!selectedPlayer || modalTopAdvanced.length === 0)
      return {} as Record<number, { rank: number; total: number }>;
    const everyPlayerAdv = roster.map((p) => {
      const core = computeAllStats(p, bench);
      return { id: p.id, adv: computeAdvancedStats(p, bench, core) };
    });
    const out: Record<number, { rank: number; total: number }> = {};
    for (const insight of modalTopAdvanced) {
      const scored = everyPlayerAdv
        .map((s) => {
          const cell = s.adv[insight.id];
          return {
            id: s.id,
            pct: cell?.pct ?? 0,
            // Fall back to pct when the cell has no unclamped sortKey,
            // and to player.id to keep ordering deterministic on ties.
            key: cell?.sortKey ?? cell?.pct ?? 0,
            display: cell?.display ?? '—',
          };
        })
        .filter((s) => s.display !== '—');
      scored.sort((a, b) => b.key - a.key || a.id.localeCompare(b.id));
      const idx = scored.findIndex((s) => s.id === selectedPlayer.id);
      if (idx >= 0) out[insight.id] = { rank: idx + 1, total: scored.length };
    }
    return out;
  }, [selectedPlayer, modalTopAdvanced, roster, bench]);

  async function handleExportPDF() {
    if (exporting || !effectiveTeam) return;
    setExporting(true);
    try {
      // html2canvas-pro supports modern CSS color functions (oklch/oklab/color-mix)
      // emitted by Tailwind v4. The original html2canvas silently fails on them.
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ]);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Page 1: dashboard snapshot
      pdf.setFontSize(24);
      pdf.setTextColor(30, 64, 175);
      pdf.text('LineupIQ — Next-Gen Baseball Intelligence', pageWidth / 2, 25, {
        align: 'center',
      });
      pdf.setFontSize(12);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `${prettyLevel(activeLevel)} • ${effectiveTeam.name} • Generated ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        35,
        { align: 'center' },
      );

      const element = document.getElementById('dashboard-main');
      if (element) {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#0f172a',
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 45, imgWidth, imgHeight);
      }

      // Page 2: Advanced Analytics Report — selected player OR top 3 performers
      pdf.addPage();
      pdf.setFontSize(22);
      pdf.setTextColor(30, 64, 175);
      pdf.text('Advanced Analytics Report', pageWidth / 2, 22, { align: 'center' });
      pdf.setFontSize(11);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Statcast-style expected stats • ${effectiveTeam.name}`,
        pageWidth / 2,
        30,
        { align: 'center' },
      );

      const featured: LineupPlayer[] = selectedPlayer
        ? [selectedPlayer]
        : (() => {
            const ranked = [...roster]
              .map((p) => ({ p, score: computeAllStats(p, bench)[50] ?? 0 }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map((r) => r.p);
            return ranked;
          })();

      let y = 42;
      for (const p of featured) {
        const core = computeAllStats(p, bench);
        const adv = computeAdvancedStats(p, bench, core);
        const top = topAdvancedInsights(adv, 8);

        if (y > 250) {
          pdf.addPage();
          y = 22;
        }

        pdf.setFontSize(14);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`${p.name} ${p.number}`, 14, y);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          `AVG ${p.avg} • OPS ${p.ops} • HR ${p.hr} • RBI ${p.rbi}${p.hasPitched ? ` • ERA ${p.era}` : ''}`,
          14,
          y + 5,
        );
        y += 11;

        pdf.setFontSize(10);
        pdf.setTextColor(30, 64, 175);
        pdf.text('Top 8 Advanced Insights', 14, y);
        y += 5;

        pdf.setFontSize(9);
        for (const insight of top) {
          const cell = adv[insight.id];
          if (!cell) continue;
          if (y > 285) {
            pdf.addPage();
            y = 22;
          }
          pdf.setTextColor(15, 23, 42);
          pdf.text(insight.name, 16, y);
          pdf.setTextColor(30, 64, 175);
          pdf.text(cell.display, 70, y);
          pdf.setTextColor(100, 116, 139);
          const insightLine = pdf.splitTextToSize(insight.coachInsight, 110);
          pdf.text(insightLine, 90, y);
          y += Array.isArray(insightLine) ? insightLine.length * 4 : 5;
        }
        y += 4;
      }

      pdf.save(
        `LineupIQ_${activeLevel}_${effectiveTeam.name.replace(/[^A-Za-z0-9]+/g, '')}.pdf`,
      );
    } catch (err) {
      console.error('[LineupIQ] PDF export failed:', err);
      alert(
        `PDF export failed: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      );
    } finally {
      setExporting(false);
    }
  }

  if (!teams.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-2">LineupIQ</h1>
          <p className="text-slate-400 mb-4">
            No GameChanger data found yet. Run{' '}
            <code className="bg-slate-800 px-2 py-1 rounded text-xs">
              python scripts/gamechanger/sync.py
            </code>{' '}
            to populate the <code>gc_*</code> tables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white"
      id="dashboard-main"
    >
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap gap-2 sm:gap-4 justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="text-white h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Lineup<span className="font-light">IQ</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {families.map(({ family, teams: famTeams }) => (
              <div
                key={family}
                className="flex items-center gap-1 bg-slate-800 rounded-2xl p-1 border border-slate-700"
              >
                <span className="hidden sm:inline px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                  {family}
                </span>
                <span className="sm:hidden pl-2 pr-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {family.slice(0, 3)}
                </span>
                {famTeams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTeamId(t.id)}
                    title={`${t.name} • ${t.record}`}
                    className={`px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest rounded-[14px] transition-all ${
                      activeTeamId === t.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pillLevel(t.level)}
                  </button>
                ))}
              </div>
            ))}

            <div className="flex items-center gap-1 bg-slate-800 rounded-2xl p-1 border border-slate-700">
              {(['gameday', 'analytics'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 sm:px-5 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest rounded-[14px] transition-all ${
                    mode === m
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'gameday' ? 'Game' : 'Stats'}
                  <span className="hidden sm:inline">
                    {m === 'gameday' ? ' Day' : ''}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              aria-label={exporting ? 'Exporting PDF' : 'Export PDF'}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed px-3 sm:px-6 py-2 rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/30"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {exporting ? 'Exporting…' : 'Export PDF'}
              </span>
            </button>

            {effectiveTeam && (
              <div className="hidden md:flex w-full md:w-auto text-sm text-slate-300 items-center gap-2 whitespace-nowrap">
                <span className="font-medium">{effectiveTeam.name}</span>
                <span className="text-blue-400 font-bold">{effectiveTeam.record}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <MetricCard
            title="Team Batting Average"
            value={agg?.teamAvg ?? '.000'}
            trend={`${prettyLevel(activeLevel)} • ${effectiveTeam?.name ?? ''}`}
            icon={<TrendingUp className="text-emerald-400" />}
            gradient="from-emerald-900/40 to-slate-900"
          />
          <MetricCard
            title="Run Differential"
            value={agg?.runDiff?.split(' ')[0] ?? '+0'}
            trend={agg?.runDiff?.replace(/^[+\-\d]+\s*/, '') ?? '—'}
            icon={<Zap className="text-amber-400" />}
            gradient="from-amber-900/40 to-slate-900"
          />
          <MetricCard
            title="Staff ERA"
            value={agg?.staffEra ?? '—'}
            trend={agg?.ip ?? '—'}
            icon={<Crosshair className="text-blue-400" />}
            gradient="from-blue-900/40 to-slate-900"
          />
        </section>

        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-indigo-400" />
            Algorithmic Standouts{' '}
            <span className="ml-2 text-xs bg-indigo-500/10 text-indigo-400 px-3 py-px rounded-full">
              Normalized {prettyLevel(activeLevel)}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standouts.map((s) => {
              const c = STANDOUT_COLORS[s.color];
              return (
                <div
                  key={s.kind}
                  onClick={() => setSelectedPlayer(s.player)}
                  className="cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-5 shadow-xl hover:scale-[1.02] transition-all group"
                >
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${c.label}`}
                      >
                        {s.label}
                      </p>
                      <h3 className="text-xl font-bold truncate">
                        {s.player.name}{' '}
                        <span className="text-slate-500 font-normal text-base">
                          {s.player.number}
                        </span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 truncate">{s.subtitle}</p>
                    </div>
                    <div
                      className={`h-14 w-14 rounded-2xl border-[3px] flex items-center justify-center font-black text-2xl flex-shrink-0 group-hover:scale-110 transition-transform tabular-nums ${c.border} ${c.bg} ${c.text}`}
                    >
                      {s.score}
                    </div>
                  </div>
                  <p className={`text-xs ${c.accent}`}>{s.insight}</p>
                </div>
              );
            })}
          </div>
        </div>

        {mode === 'gameday' && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-4 text-slate-300 flex items-center">
              <Play className="mr-2 h-5 w-5 text-emerald-400" />
              Game Day Decision Center
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-4 sm:p-6 shadow-xl">
                <h3 className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400 font-bold mb-4 sm:mb-5">
                  <ArrowUpDown className="w-4 h-4" /> Optimal Lineup Simulator
                </h3>
                {lineupOptimizer ? (
                  <div className="flex flex-wrap gap-4 sm:gap-6 items-end justify-between">
                    <div>
                      <p className="text-5xl sm:text-6xl font-black text-emerald-400 font-mono tabular-nums leading-none">
                        {lineupOptimizer.projectedRuns}
                      </p>
                      <p className="text-slate-400 text-sm mt-2">Projected team runs</p>
                      <p className="text-emerald-400 text-sm font-semibold mt-1">
                        {lineupOptimizer.improvement}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                      {lineupOptimizer.order.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPlayer(p)}
                          className="text-left text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700/50 px-3 sm:px-4 py-1.5 rounded-full font-medium transition-colors truncate"
                        >
                          <span className="text-slate-500 mr-2 tabular-nums">{i + 1}.</span>
                          <span className="text-slate-200">{p.name}</span>
                          <span className="text-slate-500 ml-2 font-mono tabular-nums">
                            OPS {p.ops}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Need at least 2 players with season stats to build a lineup.
                  </p>
                )}
              </div>

              <div className="lg:col-span-5 space-y-4">
                <button
                  type="button"
                  disabled={!hotPlayer}
                  onClick={() => hotPlayer && setSelectedPlayer(hotPlayer)}
                  className="w-full text-left bg-slate-900 border border-slate-700/50 rounded-3xl p-5 hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <h3 className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">
                    <Flame className="w-4 h-4" /> Hot Today
                  </h3>
                  {hotPlayer ? (
                    <>
                      <p className="text-lg font-bold text-slate-100">
                        {hotPlayer.name}{' '}
                        <span className="text-slate-500 text-sm font-normal">
                          {hotPlayer.number}
                        </span>
                      </p>
                      <p className="text-amber-400 text-sm mt-1">
                        NPI {Math.round(computeAllStats(hotPlayer, bench)[1] ?? 0)} • OPS{' '}
                        {hotPlayer.ops} — consider moving to cleanup
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">No active hitters yet.</p>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!usageRisk}
                  onClick={() => usageRisk && setSelectedPlayer(usageRisk.player)}
                  className="w-full text-left bg-slate-900 border border-slate-700/50 rounded-3xl p-5 hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <h3 className="flex items-center gap-2 text-xs uppercase tracking-widest text-rose-400 font-bold mb-2">
                    <AlertTriangle className="w-4 h-4" /> Usage Risk
                  </h3>
                  {usageRisk ? (
                    <>
                      <p className="text-lg font-bold text-slate-100">
                        {usageRisk.player.name}{' '}
                        <span className="text-slate-500 text-sm font-normal">
                          {usageRisk.player.number}
                        </span>
                      </p>
                      <p className="text-rose-400 text-sm mt-1">{usageRisk.reason}</p>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">No workload concerns flagged.</p>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {mode === 'analytics' && (
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="flex border-b border-slate-800">
            {(['hitting', 'pitching', 'nextgen'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 sm:py-4 text-[11px] sm:text-sm font-bold uppercase tracking-wider sm:tracking-widest transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600/10 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <span className="hidden sm:inline">
                  {tab === 'nextgen' ? 'NEXT-GEN INTELLIGENCE' : tab}
                </span>
                <span className="sm:hidden">
                  {tab === 'nextgen' ? 'Next-Gen' : tab}
                </span>
              </button>
            ))}
          </div>

          {activeTab !== 'nextgen' && (() => {
            const tab = activeTab as 'hitting' | 'pitching';
            const allColumns = tab === 'hitting' ? HITTING_COLUMNS : PITCHING_COLUMNS;
            const baseRows = tab === 'pitching' ? roster.filter((p) => p.hasPitched) : roster;
            const accentClass = tab === 'hitting' ? 'text-blue-400' : 'text-sky-400';

            // Hide columns where GameChanger returns no value for any player on
            // this team — keeps the wide table focused on stats actually tracked.
            const rawForVis = (p: LineupPlayer) =>
              tab === 'hitting' ? p.battingRaw : p.pitchingRaw;
            const columns = baseRows.length
              ? allColumns.filter((col) =>
                  baseRows.some((p) => col.fmt(rawForVis(p)?.[col.key]) !== '—'),
                )
              : allColumns;

            const sort = tab === 'hitting' ? hittingSort : pitchingSort;
            const setSort = tab === 'hitting' ? setHittingSort : setPitchingSort;

            const sortedRows = (() => {
              const rawFor = (p: LineupPlayer) =>
                tab === 'hitting' ? p.battingRaw : p.pitchingRaw;
              const arr = [...baseRows];
              if (sort.key === '__player__') {
                arr.sort((a, b) => a.name.localeCompare(b.name));
              } else {
                arr.sort((a, b) => {
                  const av = toSortNumber(rawFor(a)?.[sort.key]);
                  const bv = toSortNumber(rawFor(b)?.[sort.key]);
                  // Always sort missing values to the end regardless of direction.
                  if (av === null && bv === null) return 0;
                  if (av === null) return 1;
                  if (bv === null) return -1;
                  return av - bv;
                });
              }
              if (sort.dir === 'desc') arr.reverse();
              return arr;
            })();

            const onHeaderClick = (key: string) => {
              setSort((curr) =>
                curr.key === key
                  ? { key, dir: curr.dir === 'desc' ? 'asc' : 'desc' }
                  : { key, dir: key === '__player__' ? 'asc' : defaultSortDir(key, tab) },
              );
            };

            const SortIcon = ({ colKey }: { colKey: string }) => {
              if (sort.key !== colKey) {
                return (
                  <ArrowUpDown
                    className="inline w-3 h-3 ml-1 text-slate-600 group-hover/th:text-slate-400 transition-colors"
                    strokeWidth={2.5}
                  />
                );
              }
              return sort.dir === 'desc' ? (
                <ArrowDown className="inline w-3 h-3 ml-1 text-blue-400" strokeWidth={2.5} />
              ) : (
                <ArrowUp className="inline w-3 h-3 ml-1 text-blue-400" strokeWidth={2.5} />
              );
            };

            const headerClass = (active: boolean, emphasize: boolean) =>
              `p-4 font-semibold text-right whitespace-nowrap cursor-pointer select-none group/th transition-colors hover:bg-slate-800/60 ${
                active ? 'text-blue-300' : emphasize ? accentClass : ''
              }`;

            return (
              <div className="relative">
                <div className="overflow-x-auto">
                  <table className="text-left border-collapse w-max min-w-full">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider">
                        <th
                          onClick={() => onHeaderClick('__player__')}
                          className={`sticky left-0 z-20 bg-slate-900/95 backdrop-blur-sm p-4 font-semibold border-r border-slate-800 min-w-[220px] cursor-pointer select-none group/th transition-colors hover:bg-slate-800/60 ${
                            sort.key === '__player__' ? 'text-blue-300' : ''
                          }`}
                        >
                          Player
                          <SortIcon colKey="__player__" />
                        </th>
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            onClick={() => onHeaderClick(col.key)}
                            className={headerClass(sort.key === col.key, !!col.emphasize)}
                            title={`Sort by ${col.label}`}
                          >
                            {col.label}
                            <SortIcon colKey={col.key} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {sortedRows.map((player) => {
                        const raw = tab === 'hitting' ? player.battingRaw : player.pitchingRaw;
                        return (
                          <tr
                            key={player.id}
                            className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                            onClick={() => setSelectedPlayer(player)}
                          >
                            <td className="sticky left-0 z-10 bg-slate-900/95 group-hover:bg-slate-800/95 backdrop-blur-sm p-4 border-r border-slate-800 min-w-[220px]">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs mr-3 group-hover:bg-blue-900 group-hover:text-blue-300 transition-colors flex-shrink-0">
                                  {player.number.replace('#', '')}
                                </div>
                                <span className="font-medium text-slate-200 truncate">
                                  {player.name}
                                </span>
                              </div>
                            </td>
                            {columns.map((col) => {
                              const value = col.fmt(raw?.[col.key]);
                              const isDash = value === '—';
                              const isSortCol = sort.key === col.key;
                              const cellClass = isDash
                                ? 'text-slate-600'
                                : isSortCol
                                ? 'font-bold text-blue-300'
                                : col.emphasize
                                ? `font-bold ${accentClass}`
                                : 'text-slate-300';
                              return (
                                <td
                                  key={col.key}
                                  className={`p-4 text-right font-mono tabular-nums whitespace-nowrap ${cellClass}`}
                                >
                                  {value}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 px-4 py-2 border-t border-slate-800">
                  ← Scroll horizontally • Click any column header to sort • Click a row for complete stats
                </p>
              </div>
            );
          })()}

          {activeTab === 'nextgen' && (
            <div className="p-6">
              {/* Library toggle: Core Composites ↔ Advanced Analytics */}
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="inline-flex bg-slate-800 rounded-2xl p-1 border border-slate-700">
                  {([
                    { key: 'core', label: 'Core Composites', icon: <Layers className="w-4 h-4" /> },
                    { key: 'advanced', label: 'Advanced Analytics', icon: <FlaskConical className="w-4 h-4" /> },
                  ] as { key: NextGenView; label: string; icon: React.ReactNode }[]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setNextGenView(opt.key)}
                      className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-2xl transition-all ${
                        nextGenView === opt.key
                          ? 'bg-white text-slate-900 shadow-inner'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-500 uppercase tracking-widest">
                  {nextGenView === 'core'
                    ? '50 age-normalized indices'
                    : '50 Statcast-style expected stats'}
                </span>
              </div>

              {/* Category sub-filter (shared between both libraries) */}
              <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700 pb-4">
                {NEXT_GEN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveNextGenCategory(cat.key)}
                    className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-2xl transition-all ${
                      activeNextGenCategory === cat.key
                        ? 'bg-white text-slate-900 shadow-inner'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              {/* CORE LIBRARY GRID */}
              {nextGenView === 'core' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNextGen.map((stat) => {
                    const player = hittingLeader;
                    if (!player) return null;
                    const all = computeAllStats(player, bench);
                    const value = all[stat.id] ?? 75;
                    const colorClass =
                      value > 85
                        ? 'text-emerald-400'
                        : value > 70
                        ? 'text-cyan-400'
                        : 'text-amber-400';
                    const isPlayerBased = stat.category !== 'team';
                    return (
                      <div
                        key={stat.id}
                        onClick={
                          isPlayerBased
                            ? () => setPickerStat({ kind: 'core', stat })
                            : undefined
                        }
                        className={`bg-gradient-to-br from-slate-900/80 to-slate-800 border border-slate-700/50 rounded-3xl p-5 transition-all group ${
                          isPlayerBased ? 'cursor-pointer hover:scale-[1.02]' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-px">
                              {stat.category}
                            </p>
                            <h4 className="font-semibold leading-tight text-slate-100 group-hover:text-white">
                              {stat.name}
                            </h4>
                          </div>
                          <div className={`text-4xl font-black font-mono ${colorClass}`}>
                            {Math.round(clamp(value))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{stat.desc}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-mono bg-slate-900 px-3 py-1 rounded-2xl text-slate-400">
                            {stat.formula}
                          </div>
                          {isPlayerBased ? (
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 whitespace-nowrap">
                              Tap to pick player
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-widest text-violet-400 whitespace-nowrap">
                              Team
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ADVANCED ANALYTICS GRID — coach insight + percentile chip */}
              {nextGenView === 'advanced' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAdvanced.map((insight) => {
                    const player = hittingLeader;
                    if (!player) return null;
                    const core = computeAllStats(player, bench);
                    const adv = computeAdvancedStats(player, bench, core);
                    const cell = adv[insight.id];
                    if (!cell) return null;
                    const pct = cell.pct;
                    const colorClass =
                      cell.display === '—'
                        ? 'text-slate-600'
                        : pct > 85
                        ? 'text-emerald-400'
                        : pct > 70
                        ? 'text-cyan-400'
                        : pct > 50
                        ? 'text-amber-400'
                        : 'text-rose-400';
                    const isPlayerBased = insight.category !== 'team';
                    return (
                      <div
                        key={insight.id}
                        onClick={
                          isPlayerBased
                            ? () => setPickerStat({ kind: 'advanced', insight })
                            : undefined
                        }
                        className={`bg-gradient-to-br from-slate-900/80 to-slate-800 border border-slate-700/50 rounded-3xl p-5 transition-all group ${
                          isPlayerBased ? 'cursor-pointer hover:scale-[1.02]' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-px">
                              {insight.category}
                            </p>
                            <h4 className="font-semibold leading-tight text-slate-100 group-hover:text-white">
                              {insight.name}
                            </h4>
                          </div>
                          <div className={`text-3xl font-black font-mono ${colorClass}`}>
                            {cell.display}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-2 line-clamp-2">{insight.desc}</p>
                        <p className="text-[11px] text-emerald-400/80 mb-3 italic line-clamp-2">
                          {insight.coachInsight}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-mono bg-slate-900 px-3 py-1 rounded-2xl text-slate-400">
                            {insight.formula}
                          </div>
                          {isPlayerBased ? (
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 whitespace-nowrap">
                              Tap to pick player
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-widest text-violet-400 whitespace-nowrap">
                              Team
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
        )}
      </main>

      {pickerStat && (() => {
        const ranked = roster
          .map((p) => {
            const core = computeAllStats(p, bench);
            if (pickerStat.kind === 'core') {
              const raw = core[pickerStat.stat.id] ?? 0;
              const pct = clamp(raw);
              return {
                p,
                pct,
                key: raw,
                display: Math.round(pct).toString(),
              };
            }
            const adv = computeAdvancedStats(p, bench, core);
            const cell = adv[pickerStat.insight.id];
            return {
              p,
              pct: cell?.pct ?? 0,
              key: cell?.sortKey ?? cell?.pct ?? 0,
              display: cell?.display ?? '—',
            };
          })
          .sort((a, b) => b.key - a.key || a.p.id.localeCompare(b.p.id));

        const statName =
          pickerStat.kind === 'core'
            ? pickerStat.stat.name
            : pickerStat.insight.name;
        const statCategory =
          pickerStat.kind === 'core'
            ? pickerStat.stat.category
            : pickerStat.insight.category;
        const statDesc =
          pickerStat.kind === 'core'
            ? pickerStat.stat.desc
            : pickerStat.insight.desc;

        const colorFor = (pct: number, display: string) =>
          display === '—'
            ? 'text-slate-600'
            : pct > 85
            ? 'text-emerald-400'
            : pct > 70
            ? 'text-cyan-400'
            : pct > 50
            ? 'text-amber-400'
            : 'text-rose-400';

        return (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9998] p-4"
            onClick={() => setPickerStat(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 bg-slate-900/95 backdrop-blur-sm gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {statCategory} • Pick a player
                  </p>
                  <h2 className="text-lg font-bold leading-tight mt-0.5">{statName}</h2>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {effectiveTeam?.name ?? ''} • {roster.length} on roster • {statDesc}
                  </p>
                </div>
                <button
                  onClick={() => setPickerStat(null)}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0"
                  aria-label="Close player picker"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ranked.length === 0 && (
                  <p className="text-slate-400 text-sm col-span-full px-2 py-6 text-center">
                    No players on roster.
                  </p>
                )}
                {ranked.map(({ p, pct, display }) => {
                  const colorClass = colorFor(pct, display);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPlayer(p);
                        setPickerStat(null);
                      }}
                      className="text-left bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-2xl p-3 transition-colors flex items-center gap-3"
                    >
                      <div className="h-9 w-9 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {p.number.replace('#', '') || '—'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-100 text-sm truncate">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                          OPS {p.ops} • AVG {p.avg}
                          {p.hasPitched ? ` • ERA ${p.era}` : ''}
                        </p>
                      </div>
                      <div
                        className={`text-2xl font-black font-mono ${colorClass} tabular-nums flex-shrink-0`}
                      >
                        {display}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div
            className="bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-4 sm:px-8 py-4 sm:py-6 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0">
                  {selectedPlayer.number}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-3xl font-bold truncate">
                    {selectedPlayer.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 truncate">
                    {prettyLevel(activeLevel)} • Radar + advanced insights
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                aria-label="Close player details"
                className="p-2 sm:p-3 hover:bg-slate-800 rounded-2xl transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-8">
              <RadarChart player={selectedPlayer} bench={bench} />
              <div className="mt-6 sm:mt-10 grid grid-cols-3 gap-2 sm:gap-6 text-center">
                <div className="bg-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6">
                  <div className="text-emerald-400 text-3xl sm:text-5xl font-black font-mono tabular-nums">
                    {Math.round(computeAllStats(selectedPlayer, bench)[1])}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2 tracking-wider">
                    NPI
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6">
                  <div className="text-cyan-400 text-3xl sm:text-5xl font-black font-mono tabular-nums">
                    {Math.round(computeAllStats(selectedPlayer, bench)[16])}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2 tracking-wider">
                    PREVENTION
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6">
                  <div className="text-indigo-400 text-3xl sm:text-5xl font-black font-mono tabular-nums">
                    {Math.round(computeAllStats(selectedPlayer, bench)[50])}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2 tracking-wider">
                    COACH
                  </div>
                </div>
              </div>

              {/* Coach Insights — plain-English actionable summary from
                  computed core + advanced stats. Categorized + tooltip on
                  hover with the underlying formula context. */}
              {modalCoach && modalCoach.insights.length > 0 && (
                <div className="mt-10">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-400" />
                      Coach Insights
                    </h3>
                    <span className="text-xs uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                      What the data tells you
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modalCoach.insights.map((item, i) => (
                      <div
                        key={`${item.category}-${i}`}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-4 flex gap-3 hover:bg-slate-800 transition-colors"
                      >
                        <div className="text-2xl flex-shrink-0 leading-none pt-0.5">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            {item.category}
                          </p>
                          <p className="text-sm text-slate-100 leading-snug">
                            {item.insight}
                          </p>
                        </div>
                        <div className="group relative flex-shrink-0">
                          <Info className="w-4 h-4 text-slate-500 hover:text-slate-200 cursor-help mt-0.5" />
                          <div className="absolute hidden group-hover:block bg-slate-950 border border-slate-700 text-[11px] text-slate-200 rounded-2xl p-3 w-64 right-0 top-6 shadow-2xl z-50">
                            {item.tooltip}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Stats — full GameChanger raw offense / defense dump.
                  Tucked behind a disclosure so the coach-friendly insights
                  stay above the fold; raw data is still one click away. */}
              <details className="mt-8 group">
                <summary className="cursor-pointer flex items-center justify-between gap-2 px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-2xl text-sm font-medium text-slate-300 transition-colors list-none">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    View full raw stat line
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <CompleteStatsGrid
                  title="Hitting — full stat line"
                  data={selectedPlayer.battingRaw}
                />
                {selectedPlayer.hasPitched && (
                  <CompleteStatsGrid
                    title="Pitching — full stat line"
                    data={selectedPlayer.pitchingRaw}
                  />
                )}
              </details>

              {/* Advanced Insights — top 8 cards, categorized + coach insight */}
              {modalAdvanced && modalTopAdvanced.length > 0 && (
                <div className="mt-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                      <FlaskConical className="w-5 h-5 text-emerald-400" />
                      Advanced Insights
                    </h3>
                    <span className="text-xs uppercase tracking-widest text-slate-500">
                      Top 8 by percentile
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {modalTopAdvanced.map((insight) => {
                      const cell = modalAdvanced[insight.id];
                      const colorClass =
                        cell.pct > 85
                          ? 'text-emerald-400'
                          : cell.pct > 70
                          ? 'text-cyan-400'
                          : cell.pct > 50
                          ? 'text-amber-400'
                          : 'text-rose-400';
                      const badgeClass =
                        insight.category === 'hitting'
                          ? 'bg-blue-500/10 text-blue-300'
                          : insight.category === 'pitching'
                          ? 'bg-sky-500/10 text-sky-300'
                          : insight.category === 'twoway'
                          ? 'bg-amber-500/10 text-amber-300'
                          : insight.category === 'team'
                          ? 'bg-violet-500/10 text-violet-300'
                          : 'bg-emerald-500/10 text-emerald-300';
                      // Team-category insights describe the roster, not a
                      // single player, so a per-player rank chip would be
                      // misleading. Suppress the chip in that case.
                      const rankInfo =
                        insight.category === 'team'
                          ? undefined
                          : modalInsightRanks[insight.id];
                      const rankClass = rankInfo
                        ? rankInfo.rank === 1
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : rankInfo.rank <= 3
                          ? 'bg-amber-500/10 text-amber-300'
                          : rankInfo.rank <= rankInfo.total / 2
                          ? 'bg-cyan-500/10 text-cyan-300'
                          : 'bg-slate-700/40 text-slate-400'
                        : '';
                      return (
                        <div
                          key={insight.id}
                          className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-4 flex flex-col gap-2 hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeClass}`}
                            >
                              {insight.category}
                            </span>
                            {rankInfo && (
                              <span
                                className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap tabular-nums ${rankClass}`}
                                title={`Ranked ${rankInfo.rank} of ${rankInfo.total} on team`}
                              >
                                #{rankInfo.rank}/{rankInfo.total}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-100 text-sm leading-tight">
                            {insight.name}
                          </p>
                          <p
                            className={`text-3xl font-black font-mono ${colorClass} tabular-nums leading-none`}
                          >
                            {cell.display}
                          </p>
                          <p className="text-[11px] text-slate-400 italic line-clamp-2 mt-auto">
                            {insight.coachInsight}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Recommended Action footer — decisive single-tap CTA based on
                the Coach Decision Engine score + supporting signals. */}
            {modalCoach && (
              <div className="border-t border-slate-700 p-6 bg-slate-950/60 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => {
                    if (!modalCoach) return;
                    alert(
                      `Recommended Action for ${selectedPlayer.name}\n\n${modalCoach.action}`,
                    );
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 transition-all text-white font-semibold text-base sm:text-lg py-4 sm:py-5 rounded-3xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/30"
                >
                  <Play className="w-5 h-5" />
                  <span className="uppercase tracking-widest text-sm sm:text-base">
                    {modalCoach.action}
                  </span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                <p className="text-center text-[11px] text-slate-500 mt-3">
                  Auto-derived from Coach Decision Engine • tap to log to today&apos;s lineup
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
