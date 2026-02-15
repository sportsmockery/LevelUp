// Validation Correlation Computation Script
//
// Computes Pearson r correlation between AI scores and expert coach scores.
// Run: npx tsx scripts/compute-validation-correlation.ts
//
// Outputs JSON with correlation coefficients for overall, standing, top, bottom,
// and all sub-score categories.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Compute Pearson correlation coefficient for two arrays.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;

  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

async function main() {
  console.log('Fetching expert validations...');

  const { data: validations, error: valError } = await supabase
    .from('expert_validations')
    .select('*')
    .order('created_at', { ascending: true });

  if (valError) {
    console.error('Error fetching validations:', valError);
    process.exit(1);
  }

  if (!validations || validations.length === 0) {
    console.log('No validations found. Submit coach scores first at /coach/validate');
    process.exit(0);
  }

  console.log(`Found ${validations.length} validations.`);

  // Fetch corresponding AI analyses
  const analysisIds = [...new Set(validations.map((v: any) => v.analysis_id))];
  const { data: analyses, error: anaError } = await supabase
    .from('match_analyses')
    .select('id, overall_score, standing, top, bottom, sub_scores')
    .in('id', analysisIds);

  if (anaError) {
    console.error('Error fetching analyses:', anaError);
    process.exit(1);
  }

  const analysisMap = new Map((analyses || []).map((a: any) => [a.id, a]));

  // Build paired score arrays
  const pairs: Array<{
    analysisId: string;
    coachName: string;
    aiOverall: number;
    coachOverall: number;
    aiStanding: number;
    coachStanding: number;
    aiTop: number;
    coachTop: number;
    aiBottom: number;
    coachBottom: number;
    aiSubScores: Record<string, Record<string, number>>;
    coachSubScores: Record<string, Record<string, number>>;
  }> = [];

  for (const v of validations) {
    const analysis = analysisMap.get(v.analysis_id);
    if (!analysis) continue;

    const coachScores = v.scores as any;
    if (!coachScores) continue;

    pairs.push({
      analysisId: v.analysis_id,
      coachName: v.coach_name,
      aiOverall: analysis.overall_score,
      coachOverall: coachScores.overall || 0,
      aiStanding: analysis.standing,
      coachStanding: coachScores.standing || 0,
      aiTop: analysis.top,
      coachTop: coachScores.top || 0,
      aiBottom: analysis.bottom,
      coachBottom: coachScores.bottom || 0,
      aiSubScores: analysis.sub_scores || {},
      coachSubScores: coachScores.sub_scores || {},
    });
  }

  if (pairs.length < 3) {
    console.log(`Only ${pairs.length} paired validations. Need at least 3 for correlation.`);
    process.exit(0);
  }

  // Compute correlations
  const overallCorr = pearsonCorrelation(
    pairs.map(p => p.aiOverall),
    pairs.map(p => p.coachOverall),
  );

  const standingCorr = pearsonCorrelation(
    pairs.map(p => p.aiStanding),
    pairs.map(p => p.coachStanding),
  );

  const topCorr = pearsonCorrelation(
    pairs.map(p => p.aiTop),
    pairs.map(p => p.coachTop),
  );

  const bottomCorr = pearsonCorrelation(
    pairs.map(p => p.aiBottom),
    pairs.map(p => p.coachBottom),
  );

  // Sub-score correlations
  const subScoreCorrelations: Record<string, { correlation: number; aiAvg: number; coachAvg: number; n: number }> = {};

  const subScoreKeys: Record<string, string[]> = {
    standing: ['stance_motion', 'shot_selection', 'shot_finishing', 'sprawl_defense', 'reattacks_chains'],
    top: ['ride_tightness', 'breakdowns', 'turns_nearfalls', 'mat_returns'],
    bottom: ['base_posture', 'standups', 'sitouts_switches', 'reversals'],
  };

  for (const [position, keys] of Object.entries(subScoreKeys)) {
    for (const key of keys) {
      const aiValues: number[] = [];
      const coachValues: number[] = [];

      for (const pair of pairs) {
        const aiVal = pair.aiSubScores[position]?.[key];
        const coachVal = pair.coachSubScores[position]?.[key];
        if (aiVal !== undefined && coachVal !== undefined) {
          aiValues.push(aiVal);
          coachValues.push(coachVal);
        }
      }

      if (aiValues.length >= 3) {
        subScoreCorrelations[`${position}_${key}`] = {
          correlation: pearsonCorrelation(aiValues, coachValues),
          aiAvg: aiValues.reduce((a, b) => a + b, 0) / aiValues.length,
          coachAvg: coachValues.reduce((a, b) => a + b, 0) / coachValues.length,
          n: aiValues.length,
        };
      }
    }
  }

  // Compute agreement rate and average error
  const deltas = pairs.map(p => p.coachOverall - p.aiOverall);
  const absErrors = deltas.map(d => Math.abs(d));
  const avgAbsError = absErrors.reduce((a, b) => a + b, 0) / absErrors.length;
  const agreementRate = Math.round(
    (absErrors.filter(e => e <= 10).length / absErrors.length) * 100
  );

  // Unique coaches
  const uniqueCoaches = new Set(pairs.map(p => p.coachName));

  const results = {
    summary: {
      totalValidations: pairs.length,
      uniqueCoaches: uniqueCoaches.size,
      avgAbsoluteError: Math.round(avgAbsError * 10) / 10,
      agreementRate,
    },
    correlations: {
      overall: Math.round(overallCorr * 1000) / 1000,
      standing: Math.round(standingCorr * 1000) / 1000,
      top: Math.round(topCorr * 1000) / 1000,
      bottom: Math.round(bottomCorr * 1000) / 1000,
    },
    subScoreCorrelations,
    interpretation: {
      overall: interpretCorrelation(overallCorr),
      standing: interpretCorrelation(standingCorr),
      top: interpretCorrelation(topCorr),
      bottom: interpretCorrelation(bottomCorr),
    },
    pairs: pairs.map(p => ({
      analysisId: p.analysisId,
      coach: p.coachName,
      aiScore: p.aiOverall,
      coachScore: p.coachOverall,
      delta: p.coachOverall - p.aiOverall,
    })),
  };

  console.log('\n=== LevelUp AI Validation Study Results ===\n');
  console.log(JSON.stringify(results, null, 2));

  // Update analyses with correlation data
  console.log('\nUpdating analyses with correlation data...');
  for (const id of analysisIds) {
    const analysisPairs = pairs.filter(p => p.analysisId === id);
    if (analysisPairs.length > 0) {
      const avgCoachScore = analysisPairs.reduce((sum, p) => sum + p.coachOverall, 0) / analysisPairs.length;
      await supabase
        .from('match_analyses')
        .update({
          expert_validation_count: analysisPairs.length,
          avg_coach_score: Math.round(avgCoachScore),
          ai_coach_correlation: overallCorr,
        })
        .eq('id', id);
    }
  }

  console.log('Done.');
}

function interpretCorrelation(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.9) return 'Very strong agreement';
  if (abs >= 0.8) return 'Strong agreement';
  if (abs >= 0.6) return 'Moderate agreement';
  if (abs >= 0.4) return 'Weak agreement';
  return 'Poor agreement — calibration needed';
}

main().catch(console.error);
