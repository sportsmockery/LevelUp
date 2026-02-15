// Longitudinal Analysis — Tier 1 Feature 3
//
// Computes trends across multiple match analyses for a wrestler.
// Powers the progress tracking API and mobile dashboard insights.

export type ScoreTrend = {
  category: string;           // 'overall', 'standing', 'top', 'bottom', or sub-score key
  scores: number[];           // Chronological scores
  dates: string[];            // ISO date strings
  analysisIds: string[];      // Corresponding analysis IDs
  slope: number;              // Linear regression slope (positive = improving)
  direction: 'improving' | 'declining' | 'stable';
  recentAvg: number;          // Average of last 3 scores
  allTimeAvg: number;         // Average of all scores
  personalBest: number;
  personalWorst: number;
};

export type LongitudinalReport = {
  wrestlerProfileId: string;
  matchCount: number;
  dateRange: { first: string; last: string };
  trends: Record<string, ScoreTrend>;
  recurringWeaknesses: string[];
  biggestImprovement: { category: string; delta: number } | null;
  bestPosition: string;
  consistencyScore: number;   // 0-100, lower variance = higher consistency
};

type AnalysisRecord = {
  id: string;
  created_at: string;
  overall_score: number;
  standing: number;
  top: number;
  bottom: number;
  sub_scores?: {
    standing?: Record<string, number>;
    top?: Record<string, number>;
    bottom?: Record<string, number>;
  };
  strengths?: string[];
  weaknesses?: string[];
};

/**
 * Compute linear regression slope for a series of values.
 */
function linearSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Build a score trend for a single category.
 */
function buildTrend(
  category: string,
  scores: number[],
  dates: string[],
  analysisIds: string[],
): ScoreTrend {
  const slope = linearSlope(scores);
  const recentN = Math.min(3, scores.length);
  const recentAvg = scores.slice(-recentN).reduce((a, b) => a + b, 0) / recentN;
  const allTimeAvg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const direction: ScoreTrend['direction'] =
    slope > 1.5 ? 'improving' :
    slope < -1.5 ? 'declining' :
    'stable';

  return {
    category,
    scores,
    dates,
    analysisIds,
    slope: Math.round(slope * 100) / 100,
    direction,
    recentAvg: Math.round(recentAvg),
    allTimeAvg: Math.round(allTimeAvg),
    personalBest: Math.max(...scores),
    personalWorst: Math.min(...scores),
  };
}

/**
 * Compute longitudinal report from a series of analyses.
 * Analyses should be sorted chronologically (oldest first).
 */
export function computeLongitudinalReport(
  wrestlerProfileId: string,
  analyses: AnalysisRecord[],
): LongitudinalReport {
  if (analyses.length === 0) {
    return {
      wrestlerProfileId,
      matchCount: 0,
      dateRange: { first: '', last: '' },
      trends: {},
      recurringWeaknesses: [],
      biggestImprovement: null,
      bestPosition: 'standing',
      consistencyScore: 0,
    };
  }

  const sorted = [...analyses].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const dates = sorted.map(a => a.created_at);
  const ids = sorted.map(a => a.id);

  // Main position trends
  const trends: Record<string, ScoreTrend> = {
    overall: buildTrend('overall', sorted.map(a => a.overall_score), dates, ids),
    standing: buildTrend('standing', sorted.map(a => a.standing), dates, ids),
    top: buildTrend('top', sorted.map(a => a.top), dates, ids),
    bottom: buildTrend('bottom', sorted.map(a => a.bottom), dates, ids),
  };

  // Sub-score trends (if available)
  const subScoreKeys = {
    standing: ['stance_motion', 'shot_selection', 'shot_finishing', 'sprawl_defense', 'reattacks_chains'],
    top: ['ride_tightness', 'breakdowns', 'turns_nearfalls', 'mat_returns'],
    bottom: ['base_posture', 'standups', 'sitouts_switches', 'reversals'],
  };

  for (const [position, keys] of Object.entries(subScoreKeys)) {
    for (const key of keys) {
      const scores = sorted.map(a => {
        const posScores = a.sub_scores?.[position as keyof typeof a.sub_scores] as Record<string, number> | undefined;
        return posScores?.[key] ?? 0;
      });
      // Only include if we have actual data (not all zeros)
      if (scores.some(s => s > 0)) {
        trends[`${position}_${key}`] = buildTrend(`${position}_${key}`, scores, dates, ids);
      }
    }
  }

  // Find recurring weaknesses (appear in 50%+ of analyses)
  const weaknessCounts: Record<string, number> = {};
  for (const analysis of sorted) {
    const weaknesses = analysis.weaknesses || [];
    for (const w of weaknesses) {
      const normalized = w.toLowerCase().trim();
      weaknessCounts[normalized] = (weaknessCounts[normalized] || 0) + 1;
    }
  }
  const recurringWeaknesses = Object.entries(weaknessCounts)
    .filter(([, count]) => count >= Math.ceil(sorted.length * 0.5))
    .sort(([, a], [, b]) => b - a)
    .map(([weakness]) => weakness);

  // Find biggest improvement
  const trendEntries = Object.entries(trends);
  let biggestImprovement: LongitudinalReport['biggestImprovement'] = null;
  let maxSlope = 0;
  for (const [category, trend] of trendEntries) {
    if (trend.slope > maxSlope && trend.scores.length >= 3) {
      maxSlope = trend.slope;
      biggestImprovement = {
        category,
        delta: Math.round(trend.scores[trend.scores.length - 1] - trend.scores[0]),
      };
    }
  }

  // Best position
  const positionAvgs = {
    standing: trends.standing?.allTimeAvg || 0,
    top: trends.top?.allTimeAvg || 0,
    bottom: trends.bottom?.allTimeAvg || 0,
  };
  const bestPosition = Object.entries(positionAvgs)
    .sort(([, a], [, b]) => b - a)[0][0];

  // Consistency score: inverse of coefficient of variation for overall scores
  const overallScores = sorted.map(a => a.overall_score);
  const mean = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
  const variance = overallScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / overallScores.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const consistencyScore = Math.round(Math.max(0, Math.min(100, (1 - cv) * 100)));

  return {
    wrestlerProfileId,
    matchCount: sorted.length,
    dateRange: { first: dates[0], last: dates[dates.length - 1] },
    trends,
    recurringWeaknesses,
    biggestImprovement,
    bestPosition,
    consistencyScore,
  };
}

/**
 * Format trend data for DB storage in longitudinal_trends table.
 */
export function formatTrendsForDB(
  wrestlerProfileId: string,
  trends: Record<string, ScoreTrend>,
): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];

  for (const [category, trend] of Object.entries(trends)) {
    for (let i = 0; i < trend.scores.length; i++) {
      records.push({
        wrestler_profile_id: wrestlerProfileId,
        category,
        match_sequence: i + 1,
        score: trend.scores[i],
        match_date: trend.dates[i],
        analysis_id: trend.analysisIds[i],
      });
    }
  }

  return records;
}
