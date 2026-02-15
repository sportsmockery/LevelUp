// Confidence Calibration — Gap 4
//
// Infrastructure for comparing AI analysis scores against coach ground-truth scores.
// Computes correlation metrics, tracks calibration over time, and identifies
// systematic biases in the AI's scoring.
//
// Architecture:
//   1. Coaches submit scores for specific analyses via admin API
//   2. System computes per-analysis metrics (MAE, direction correctness)
//   3. Aggregate metrics track overall calibration health
//   4. Calibration data feeds back into confidence score computation

export type CoachScore = {
  analysis_id: string;
  coach_id: string;
  overall_score: number;
  position_scores: { standing: number; top: number; bottom: number };
  sub_scores?: {
    standing?: Record<string, number>;
    top?: Record<string, number>;
    bottom?: Record<string, number>;
  };
  techniques_observed?: string[];
  scoring_events?: Array<{
    type: string;
    frame_index?: number;
    scorer: 'athlete' | 'opponent';
  }>;
  notes?: string;
  scored_at: string;
};

export type AIScore = {
  analysis_id: string;
  overall_score: number;
  position_scores: { standing: number; top: number; bottom: number };
  confidence: number;
  identity_confidence?: number;
};

export type CalibrationMetric = {
  analysis_id: string;
  overall_mae: number;            // |AI - Coach| for overall score
  standing_mae: number;
  top_mae: number;
  bottom_mae: number;
  overall_direction: boolean;     // Did AI rank same direction as coach (above/below 70)?
  ai_confidence: number;
  confidence_calibrated: boolean; // Was confidence appropriate given the error?
  bias: number;                   // AI - Coach (positive = AI scores higher)
};

export type CalibrationSummary = {
  total_comparisons: number;
  avg_overall_mae: number;
  avg_position_mae: { standing: number; top: number; bottom: number };
  avg_bias: number;                     // Systematic over/under-scoring
  direction_accuracy: number;           // Fraction where AI agrees on "good" vs "needs work"
  confidence_correlation: number;       // Pearson correlation: AI confidence vs 1/(error)
  calibration_score: number;            // 0-100 composite calibration quality
  recommendations: string[];
  computed_at: string;
};

/**
 * Compute calibration metric for a single analysis comparison.
 */
export function computeCalibrationMetric(
  aiScore: AIScore,
  coachScore: CoachScore,
): CalibrationMetric {
  const overall_mae = Math.abs(aiScore.overall_score - coachScore.overall_score);
  const standing_mae = Math.abs(aiScore.position_scores.standing - coachScore.position_scores.standing);
  const top_mae = Math.abs(aiScore.position_scores.top - coachScore.position_scores.top);
  const bottom_mae = Math.abs(aiScore.position_scores.bottom - coachScore.position_scores.bottom);

  // Direction: both agree on "solid" (>=70) or "needs work" (<70)
  const aiGood = aiScore.overall_score >= 70;
  const coachGood = coachScore.overall_score >= 70;
  const overall_direction = aiGood === coachGood;

  // Confidence calibration: high confidence should mean low error
  // If AI confidence > 0.8, error should be < 10. If confidence < 0.5, error > 15 is "expected"
  const expectedMaxError = aiScore.confidence > 0.8 ? 10
    : aiScore.confidence > 0.6 ? 15
    : aiScore.confidence > 0.4 ? 20
    : 30;
  const confidence_calibrated = overall_mae <= expectedMaxError;

  const bias = aiScore.overall_score - coachScore.overall_score;

  return {
    analysis_id: aiScore.analysis_id,
    overall_mae,
    standing_mae,
    top_mae,
    bottom_mae,
    overall_direction,
    ai_confidence: aiScore.confidence,
    confidence_calibrated,
    bias,
  };
}

/**
 * Compute aggregate calibration summary from multiple comparisons.
 */
export function computeCalibrationSummary(
  metrics: CalibrationMetric[],
): CalibrationSummary {
  if (metrics.length === 0) {
    return {
      total_comparisons: 0,
      avg_overall_mae: 0,
      avg_position_mae: { standing: 0, top: 0, bottom: 0 },
      avg_bias: 0,
      direction_accuracy: 1,
      confidence_correlation: 0,
      calibration_score: 0,
      recommendations: ['No calibration data yet. Submit coach scores to begin calibration.'],
      computed_at: new Date().toISOString(),
    };
  }

  const n = metrics.length;
  const avgFn = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const avg_overall_mae = avgFn(metrics.map(m => m.overall_mae));
  const avg_position_mae = {
    standing: avgFn(metrics.map(m => m.standing_mae)),
    top: avgFn(metrics.map(m => m.top_mae)),
    bottom: avgFn(metrics.map(m => m.bottom_mae)),
  };
  const avg_bias = avgFn(metrics.map(m => m.bias));
  const direction_accuracy = metrics.filter(m => m.overall_direction).length / n;

  // Pearson correlation between AI confidence and 1/error
  const confidences = metrics.map(m => m.ai_confidence);
  const inverseErrors = metrics.map(m => 1 / (m.overall_mae + 1)); // +1 to avoid div/0
  const confidence_correlation = pearsonCorrelation(confidences, inverseErrors);

  // Composite calibration score (0-100)
  // Factors: low MAE (50%), direction accuracy (25%), confidence calibration (25%)
  const maePenalty = Math.min(1, avg_overall_mae / 20); // 20+ MAE = max penalty
  const maeScore = (1 - maePenalty) * 50;
  const directionScore = direction_accuracy * 25;
  const confCalibrated = metrics.filter(m => m.confidence_calibrated).length / n;
  const confScore = confCalibrated * 25;
  const calibration_score = Math.round(maeScore + directionScore + confScore);

  // Generate recommendations
  const recommendations: string[] = [];

  if (avg_overall_mae > 15) {
    recommendations.push(`High average error (${avg_overall_mae.toFixed(1)} points). Consider reviewing scoring prompts or adding more rubric examples.`);
  }
  if (Math.abs(avg_bias) > 8) {
    const direction = avg_bias > 0 ? 'over-scoring' : 'under-scoring';
    recommendations.push(`Systematic ${direction} detected (avg bias: ${avg_bias > 0 ? '+' : ''}${avg_bias.toFixed(1)}). Adjust baseline calibration in Pass 2 prompt.`);
  }
  if (direction_accuracy < 0.8) {
    recommendations.push(`Direction accuracy ${(direction_accuracy * 100).toFixed(0)}% — AI sometimes classifies "solid" wrestlers as "developing" or vice versa. Review score thresholds.`);
  }
  if (avg_position_mae.standing > avg_position_mae.top + 5 || avg_position_mae.standing > avg_position_mae.bottom + 5) {
    recommendations.push(`Standing position has higher error than other positions. May need more standing-specific rubric examples.`);
  }
  if (confidence_correlation < 0.3) {
    recommendations.push(`Low confidence-error correlation (${confidence_correlation.toFixed(2)}). AI confidence scores are not well-calibrated to actual accuracy.`);
  }
  if (n < 10) {
    recommendations.push(`Only ${n} calibration samples. Need at least 20-30 for reliable metrics.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Calibration looks good! Continue collecting coach scores to maintain quality.');
  }

  return {
    total_comparisons: n,
    avg_overall_mae,
    avg_position_mae,
    avg_bias,
    direction_accuracy,
    confidence_correlation,
    calibration_score,
    recommendations,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Given historical calibration data, compute an adjusted confidence score.
 * If AI systematically over-scores, reduce confidence. If well-calibrated, trust it.
 */
export function adjustConfidence(
  rawConfidence: number,
  calibrationSummary: CalibrationSummary,
): number {
  if (calibrationSummary.total_comparisons < 5) {
    // Not enough data to adjust — return raw confidence with a small penalty
    return Math.max(0, rawConfidence - 0.1);
  }

  // Adjust based on historical accuracy
  const maeAdjustment = Math.max(0, 1 - calibrationSummary.avg_overall_mae / 30);
  const directionAdjustment = calibrationSummary.direction_accuracy;

  // Blend raw confidence with historical calibration
  const adjusted = rawConfidence * 0.6 + maeAdjustment * 0.2 + directionAdjustment * 0.2;
  return Math.max(0, Math.min(1, adjusted));
}

// --- Helpers ---

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  return denominator === 0 ? 0 : numerator / denominator;
}
