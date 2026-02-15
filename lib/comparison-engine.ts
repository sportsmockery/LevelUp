// Comparison Engine — Tier 2 Feature 6
//
// Handles side-by-side and overlay comparison logic for:
// - Self vs Self (match-to-match progress)
// - Self vs Elite (technique comparison against reference library)
// - Self vs Opponent (tactical comparison)

export type ComparisonType = 'self_vs_self' | 'self_vs_elite' | 'self_vs_opponent';

export type ComparisonResult = {
  comparisonType: ComparisonType;
  frameAId: string;
  frameBId: string;
  metrics: ComparisonMetrics | null;
  eliteTechnique: EliteTechniqueRef | null;
  summary: string;
};

export type ComparisonMetrics = {
  deltas: Record<string, { athlete: number; reference: number; delta: number }>;
  summary: string;
  recommendations: string[];
  overallSimilarity: number;
};

export type EliteTechniqueRef = {
  id: string;
  techniqueName: string;
  athleteName: string;
  notes: string;
  source: string;
  biomechanicalMeasurements: Record<string, number>;
};

/**
 * Compute comparison metrics between two sets of measurements.
 */
export function computeComparisonMetrics(
  athleteMeasurements: Record<string, number>,
  referenceMeasurements: Record<string, number>,
  referenceLabel: string = 'reference',
): ComparisonMetrics {
  const deltas: Record<string, { athlete: number; reference: number; delta: number }> = {};
  const recommendations: string[] = [];
  let totalSimilarity = 0;
  let count = 0;

  for (const [key, refVal] of Object.entries(referenceMeasurements)) {
    const athleteVal = athleteMeasurements[key] ?? athleteMeasurements[`avg_${key}`];
    if (athleteVal !== undefined && athleteVal !== null) {
      const delta = athleteVal - refVal;
      deltas[key] = { athlete: athleteVal, reference: refVal, delta };

      const maxVal = Math.max(Math.abs(athleteVal), Math.abs(refVal), 1);
      const similarity = Math.max(0, 1 - Math.abs(delta) / maxVal);
      totalSimilarity += similarity;
      count++;

      if (Math.abs(delta) > 15) {
        const direction = delta > 0 ? 'higher' : 'lower';
        recommendations.push(
          `Your ${key.replace(/_/g, ' ')} is ${Math.abs(delta).toFixed(0)}° ${direction} than ${referenceLabel}. ` +
          `${delta > 0 ? 'Reduce' : 'Increase'} for better technique.`
        );
      }
    }
  }

  const overallSimilarity = count > 0 ? Math.round((totalSimilarity / count) * 100) : 0;

  const significantDeltas = Object.entries(deltas)
    .filter(([, v]) => Math.abs(v.delta) > 10)
    .map(([key, v]) => `${key.replace(/_/g, ' ')}: ${v.delta > 0 ? '+' : ''}${v.delta.toFixed(0)}°`);

  const summary = significantDeltas.length > 0
    ? `Key differences from ${referenceLabel}: ${significantDeltas.join(', ')}`
    : `Measurements are close to ${referenceLabel} execution.`;

  return {
    deltas,
    summary,
    recommendations,
    overallSimilarity,
  };
}

/**
 * Compare two analyses for self-vs-self progress tracking.
 */
export function compareSelfProgress(
  analysisA: {
    overall_score: number;
    standing: number;
    top: number;
    bottom: number;
    sub_scores?: Record<string, Record<string, number>>;
    strengths?: string[];
    weaknesses?: string[];
  },
  analysisB: {
    overall_score: number;
    standing: number;
    top: number;
    bottom: number;
    sub_scores?: Record<string, Record<string, number>>;
    strengths?: string[];
    weaknesses?: string[];
  },
): {
  overallDelta: number;
  positionDeltas: Record<string, number>;
  subScoreDeltas: Record<string, number>;
  improvements: string[];
  regressions: string[];
  summary: string;
} {
  const overallDelta = analysisB.overall_score - analysisA.overall_score;
  const positionDeltas = {
    standing: analysisB.standing - analysisA.standing,
    top: analysisB.top - analysisA.top,
    bottom: analysisB.bottom - analysisA.bottom,
  };

  const subScoreDeltas: Record<string, number> = {};
  if (analysisA.sub_scores && analysisB.sub_scores) {
    for (const position of ['standing', 'top', 'bottom']) {
      const aScores = analysisA.sub_scores[position] || {};
      const bScores = analysisB.sub_scores[position] || {};
      for (const key of Object.keys(bScores)) {
        if (aScores[key] !== undefined) {
          subScoreDeltas[`${position}_${key}`] = bScores[key] - aScores[key];
        }
      }
    }
  }

  const improvements = Object.entries(subScoreDeltas)
    .filter(([, delta]) => delta > 2)
    .sort(([, a], [, b]) => b - a)
    .map(([key, delta]) => `${key.replace(/_/g, ' ')}: +${delta}`);

  const regressions = Object.entries(subScoreDeltas)
    .filter(([, delta]) => delta < -2)
    .sort(([, a], [, b]) => a - b)
    .map(([key, delta]) => `${key.replace(/_/g, ' ')}: ${delta}`);

  const direction = overallDelta > 3 ? 'improved' : overallDelta < -3 ? 'declined' : 'remained stable';
  const summary = `Overall score ${direction} by ${Math.abs(overallDelta)} points. ` +
    (improvements.length > 0 ? `Improvements in ${improvements.slice(0, 3).join(', ')}. ` : '') +
    (regressions.length > 0 ? `Regressions in ${regressions.slice(0, 3).join(', ')}.` : '');

  return {
    overallDelta,
    positionDeltas,
    subScoreDeltas,
    improvements,
    regressions,
    summary,
  };
}

/**
 * Auto-match a technique to the best elite reference.
 */
export function matchTechniqueToElite(
  actionSummary: {
    shotAttempts?: { total: number };
    escapeAttempts?: { total: number };
    turnAttempts?: { total: number };
  } | null,
): string {
  if (!actionSummary) return 'double_leg_shot';

  if ((actionSummary.shotAttempts?.total || 0) > 0) return 'double_leg_shot';
  if ((actionSummary.escapeAttempts?.total || 0) > 0) return 'standup_escape';
  if ((actionSummary.turnAttempts?.total || 0) > 0) return 'tilt_series';

  return 'double_leg_shot';
}
