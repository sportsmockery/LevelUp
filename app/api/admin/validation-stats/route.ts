import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

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

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Fetch validations
    const { data: validations, error: valError } = await supabase
      .from('expert_validations')
      .select('*')
      .order('created_at', { ascending: false });

    if (valError) {
      return NextResponse.json({ error: 'Failed to fetch validations' }, { status: 500 });
    }

    if (!validations || validations.length === 0) {
      return NextResponse.json({
        totalValidations: 0,
        totalAnalyses: 0,
        avgCorrelation: 0,
        positionCorrelations: { standing: 0, top: 0, bottom: 0 },
        avgAbsError: 0,
        coachCount: 0,
        agreementRate: 0,
        recentValidations: [],
        categoryBreakdown: [],
      });
    }

    // Fetch AI analyses
    const analysisIds = [...new Set(validations.map((v: any) => v.analysis_id))];
    const { data: analyses } = await supabase
      .from('match_analyses')
      .select('id, overall_score, standing, top, bottom, sub_scores')
      .in('id', analysisIds);

    const analysisMap = new Map((analyses || []).map((a: any) => [a.id, a]));

    // Build pairs
    type Pair = {
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
      createdAt: string;
    };

    const pairs: Pair[] = [];
    for (const v of validations) {
      const analysis = analysisMap.get((v as any).analysis_id) as any;
      if (!analysis) continue;

      const coachScores = (v as any).scores as any;
      if (!coachScores) continue;

      pairs.push({
        analysisId: (v as any).analysis_id,
        coachName: (v as any).coach_name,
        aiOverall: analysis.overall_score,
        coachOverall: coachScores.overall || 0,
        aiStanding: analysis.standing,
        coachStanding: coachScores.standing || 0,
        aiTop: analysis.top,
        coachTop: coachScores.top || 0,
        aiBottom: analysis.bottom,
        coachBottom: coachScores.bottom || 0,
        createdAt: (v as any).created_at,
      });
    }

    // Compute correlations
    const avgCorrelation = pairs.length >= 3
      ? pearsonCorrelation(pairs.map(p => p.aiOverall), pairs.map(p => p.coachOverall))
      : 0;

    const positionCorrelations = {
      standing: pairs.length >= 3
        ? pearsonCorrelation(pairs.map(p => p.aiStanding), pairs.map(p => p.coachStanding))
        : 0,
      top: pairs.length >= 3
        ? pearsonCorrelation(pairs.map(p => p.aiTop), pairs.map(p => p.coachTop))
        : 0,
      bottom: pairs.length >= 3
        ? pearsonCorrelation(pairs.map(p => p.aiBottom), pairs.map(p => p.coachBottom))
        : 0,
    };

    // Error and agreement
    const deltas = pairs.map(p => p.coachOverall - p.aiOverall);
    const absErrors = deltas.map(d => Math.abs(d));
    const avgAbsError = absErrors.length > 0
      ? absErrors.reduce((a, b) => a + b, 0) / absErrors.length
      : 0;
    const agreementRate = absErrors.length > 0
      ? Math.round((absErrors.filter(e => e <= 10).length / absErrors.length) * 100)
      : 0;

    const uniqueCoaches = new Set(pairs.map(p => p.coachName));

    // Recent validations
    const recentValidations = pairs.slice(0, 20).map(p => ({
      id: p.analysisId,
      analysisId: p.analysisId,
      coachName: p.coachName,
      aiScore: p.aiOverall,
      coachScore: p.coachOverall,
      delta: p.coachOverall - p.aiOverall,
      createdAt: p.createdAt,
    }));

    // Category breakdown
    const categoryBreakdown = [
      { category: 'overall', aiAvg: avg(pairs.map(p => p.aiOverall)), coachAvg: avg(pairs.map(p => p.coachOverall)), correlation: avgCorrelation, sampleSize: pairs.length },
      { category: 'standing', aiAvg: avg(pairs.map(p => p.aiStanding)), coachAvg: avg(pairs.map(p => p.coachStanding)), correlation: positionCorrelations.standing, sampleSize: pairs.length },
      { category: 'top', aiAvg: avg(pairs.map(p => p.aiTop)), coachAvg: avg(pairs.map(p => p.coachTop)), correlation: positionCorrelations.top, sampleSize: pairs.length },
      { category: 'bottom', aiAvg: avg(pairs.map(p => p.aiBottom)), coachAvg: avg(pairs.map(p => p.coachBottom)), correlation: positionCorrelations.bottom, sampleSize: pairs.length },
    ];

    return NextResponse.json({
      totalValidations: pairs.length,
      totalAnalyses: analysisIds.length,
      avgCorrelation: Math.round(avgCorrelation * 1000) / 1000,
      positionCorrelations: {
        standing: Math.round(positionCorrelations.standing * 1000) / 1000,
        top: Math.round(positionCorrelations.top * 1000) / 1000,
        bottom: Math.round(positionCorrelations.bottom * 1000) / 1000,
      },
      avgAbsError: Math.round(avgAbsError * 10) / 10,
      coachCount: uniqueCoaches.size,
      agreementRate,
      recentValidations,
      categoryBreakdown,
    });

  } catch (err: any) {
    console.error('[LevelUp] Validation stats error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

function avg(nums: number[]): number {
  return nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 0;
}
