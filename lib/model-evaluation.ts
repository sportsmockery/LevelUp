// Model Evaluation & Prompt Calibration — Feature 9: Fine-Tuned Wrestling Vision Model
//
// Evaluates model accuracy against expert validations and generates
// calibration adjustments to improve scoring accuracy.

export type EvaluationMetrics = {
  sampleSize: number;
  overall: CategoryMetrics;
  standing: CategoryMetrics;
  top: CategoryMetrics;
  bottom: CategoryMetrics;
  aggregateMAE: number;
  aggregateCorrelation: number;
  biasProfile: BiasProfile;
};

export type CategoryMetrics = {
  mae: number;           // Mean Absolute Error
  rmse: number;          // Root Mean Square Error
  bias: number;          // Mean signed error (positive = AI overscores)
  correlation: number;   // Pearson r
  percentWithin5: number;  // % of scores within 5 points
  percentWithin10: number; // % of scores within 10 points
};

export type BiasProfile = {
  direction: 'over' | 'under' | 'neutral';
  magnitude: number;
  worstCategory: string;
  bestCategory: string;
  scoreRangeBias: {
    low: number;   // Bias for AI scores 0-60
    mid: number;   // Bias for AI scores 60-80
    high: number;  // Bias for AI scores 80-100
  };
};

export type CalibrationAdjustment = {
  type: 'bias_correction' | 'threshold_adjustment' | 'prompt_edit';
  category: 'overall' | 'standing' | 'top' | 'bottom';
  adjustment: number;
  confidence: number;
  reasoning: string;
};

type ScorePair = {
  aiScore: number;
  coachScore: number;
};

/**
 * Compute comprehensive evaluation metrics from AI vs coach score pairs.
 */
export function evaluateModel(
  pairs: Array<{
    aiOverall: number; coachOverall: number;
    aiStanding: number; coachStanding: number;
    aiTop: number; coachTop: number;
    aiBottom: number; coachBottom: number;
  }>,
): EvaluationMetrics {
  if (pairs.length === 0) {
    const empty: CategoryMetrics = { mae: 0, rmse: 0, bias: 0, correlation: 0, percentWithin5: 0, percentWithin10: 0 };
    return {
      sampleSize: 0,
      overall: empty,
      standing: empty,
      top: empty,
      bottom: empty,
      aggregateMAE: 0,
      aggregateCorrelation: 0,
      biasProfile: { direction: 'neutral', magnitude: 0, worstCategory: 'none', bestCategory: 'none', scoreRangeBias: { low: 0, mid: 0, high: 0 } },
    };
  }

  const overall = computeCategoryMetrics(pairs.map(p => ({ aiScore: p.aiOverall, coachScore: p.coachOverall })));
  const standing = computeCategoryMetrics(pairs.map(p => ({ aiScore: p.aiStanding, coachScore: p.coachStanding })));
  const top = computeCategoryMetrics(pairs.map(p => ({ aiScore: p.aiTop, coachScore: p.coachTop })));
  const bottom = computeCategoryMetrics(pairs.map(p => ({ aiScore: p.aiBottom, coachScore: p.coachBottom })));

  // Score range bias
  const lowPairs = pairs.filter(p => p.aiOverall < 60);
  const midPairs = pairs.filter(p => p.aiOverall >= 60 && p.aiOverall < 80);
  const highPairs = pairs.filter(p => p.aiOverall >= 80);

  const avgBias = (arr: typeof pairs) => arr.length > 0
    ? arr.reduce((s, p) => s + (p.aiOverall - p.coachOverall), 0) / arr.length
    : 0;

  // Determine worst/best category by MAE
  const categoryMAEs = [
    { name: 'standing', mae: standing.mae },
    { name: 'top', mae: top.mae },
    { name: 'bottom', mae: bottom.mae },
  ];
  categoryMAEs.sort((a, b) => a.mae - b.mae);

  return {
    sampleSize: pairs.length,
    overall,
    standing,
    top,
    bottom,
    aggregateMAE: Math.round(((overall.mae + standing.mae + top.mae + bottom.mae) / 4) * 10) / 10,
    aggregateCorrelation: overall.correlation,
    biasProfile: {
      direction: overall.bias > 2 ? 'over' : overall.bias < -2 ? 'under' : 'neutral',
      magnitude: Math.round(Math.abs(overall.bias) * 10) / 10,
      worstCategory: categoryMAEs[categoryMAEs.length - 1].name,
      bestCategory: categoryMAEs[0].name,
      scoreRangeBias: {
        low: Math.round(avgBias(lowPairs) * 10) / 10,
        mid: Math.round(avgBias(midPairs) * 10) / 10,
        high: Math.round(avgBias(highPairs) * 10) / 10,
      },
    },
  };
}

/**
 * Compute metrics for a single scoring category.
 */
function computeCategoryMetrics(pairs: ScorePair[]): CategoryMetrics {
  if (pairs.length === 0) {
    return { mae: 0, rmse: 0, bias: 0, correlation: 0, percentWithin5: 0, percentWithin10: 0 };
  }

  const errors = pairs.map(p => p.aiScore - p.coachScore);
  const absErrors = errors.map(e => Math.abs(e));
  const squaredErrors = errors.map(e => e * e);

  const mae = absErrors.reduce((a, b) => a + b, 0) / pairs.length;
  const rmse = Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / pairs.length);
  const bias = errors.reduce((a, b) => a + b, 0) / pairs.length;

  const within5 = absErrors.filter(e => e <= 5).length / pairs.length;
  const within10 = absErrors.filter(e => e <= 10).length / pairs.length;

  const correlation = pearsonR(
    pairs.map(p => p.aiScore),
    pairs.map(p => p.coachScore),
  );

  return {
    mae: Math.round(mae * 10) / 10,
    rmse: Math.round(rmse * 10) / 10,
    bias: Math.round(bias * 10) / 10,
    correlation: Math.round(correlation * 1000) / 1000,
    percentWithin5: Math.round(within5 * 100),
    percentWithin10: Math.round(within10 * 100),
  };
}

/**
 * Pearson correlation coefficient.
 */
function pearsonR(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i]; sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i]; sumY2 += y[i] * y[i];
  }
  const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Generate calibration adjustments based on evaluation metrics.
 * Returns recommended score adjustments to reduce bias.
 */
export function generateCalibrationAdjustments(metrics: EvaluationMetrics): CalibrationAdjustment[] {
  const adjustments: CalibrationAdjustment[] = [];

  if (metrics.sampleSize < 5) {
    return [{
      type: 'prompt_edit',
      category: 'overall',
      adjustment: 0,
      confidence: 0,
      reasoning: `Insufficient data (${metrics.sampleSize} pairs). Need at least 5 validated analyses for calibration.`,
    }];
  }

  // Overall bias correction
  if (Math.abs(metrics.overall.bias) > 3) {
    adjustments.push({
      type: 'bias_correction',
      category: 'overall',
      adjustment: -metrics.overall.bias,
      confidence: Math.min(metrics.sampleSize / 20, 1),
      reasoning: `AI ${metrics.overall.bias > 0 ? 'overscores' : 'underscores'} by ${Math.abs(metrics.overall.bias).toFixed(1)} points on average. Apply ${(-metrics.overall.bias).toFixed(1)} point correction.`,
    });
  }

  // Per-category bias corrections
  const categories = [
    { name: 'standing' as const, metrics: metrics.standing },
    { name: 'top' as const, metrics: metrics.top },
    { name: 'bottom' as const, metrics: metrics.bottom },
  ];

  for (const cat of categories) {
    if (Math.abs(cat.metrics.bias) > 5) {
      adjustments.push({
        type: 'bias_correction',
        category: cat.name,
        adjustment: -cat.metrics.bias,
        confidence: Math.min(metrics.sampleSize / 20, 1),
        reasoning: `${cat.name} position: AI ${cat.metrics.bias > 0 ? 'overscores' : 'underscores'} by ${Math.abs(cat.metrics.bias).toFixed(1)} points. MAE = ${cat.metrics.mae}.`,
      });
    }
  }

  // Score range bias — different corrections for different score ranges
  const { scoreRangeBias } = metrics.biasProfile;
  if (Math.abs(scoreRangeBias.high) > 5 && Math.abs(scoreRangeBias.low) > 5) {
    if (Math.sign(scoreRangeBias.high) !== Math.sign(scoreRangeBias.low)) {
      adjustments.push({
        type: 'threshold_adjustment',
        category: 'overall',
        adjustment: 0,
        confidence: Math.min(metrics.sampleSize / 30, 1),
        reasoning: `Non-linear bias detected: AI ${scoreRangeBias.high > 0 ? 'overscores' : 'underscores'} high performers (${scoreRangeBias.high.toFixed(1)}) but ${scoreRangeBias.low > 0 ? 'overscores' : 'underscores'} lower performers (${scoreRangeBias.low.toFixed(1)}). Consider prompt threshold adjustments.`,
      });
    }
  }

  return adjustments;
}

/**
 * Apply bias corrections to a raw score.
 */
export function applyCalibration(
  rawScore: number,
  adjustments: CalibrationAdjustment[],
  category: 'overall' | 'standing' | 'top' | 'bottom',
): number {
  let corrected = rawScore;
  for (const adj of adjustments) {
    if (adj.type === 'bias_correction' && adj.category === category && adj.confidence > 0.3) {
      corrected += adj.adjustment * adj.confidence;
    }
  }
  return Math.round(Math.max(0, Math.min(100, corrected)));
}
