import { NextRequest, NextResponse } from 'next/server';
import { exportTrainingData, recordExport } from '../../../../lib/training-data';
import { evaluateModel, generateCalibrationAdjustments } from '../../../../lib/model-evaluation';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const exportType = (request.nextUrl.searchParams.get('type') || 'scoring_calibration') as
    'vision_finetune' | 'scoring_calibration' | 'full_pipeline';

  try {
    const exportData = await exportTrainingData(exportType);

    if (!exportData || exportData.pairCount === 0) {
      return NextResponse.json({
        pairCount: 0,
        message: 'No validated analyses available. Submit coach validations at /coach/validate first.',
      });
    }

    // Run model evaluation
    const evalPairs = exportData.pairs.map(p => ({
      aiOverall: p.aiScores.overall,
      coachOverall: p.coachScores.overall,
      aiStanding: p.aiScores.standing,
      coachStanding: p.coachScores.standing,
      aiTop: p.aiScores.top,
      coachTop: p.coachScores.top,
      aiBottom: p.aiScores.bottom,
      coachBottom: p.coachScores.bottom,
    }));

    const metrics = evaluateModel(evalPairs);
    const calibrations = generateCalibrationAdjustments(metrics);

    // Record export
    await recordExport(exportData);

    return NextResponse.json({
      exportType,
      pairCount: exportData.pairCount,
      statistics: exportData.statistics,
      evaluation: metrics,
      calibrations,
      pairs: exportData.pairs,
    });

  } catch (err: any) {
    console.error('[LevelUp] Training export error:', err);
    return NextResponse.json({ error: err?.message || 'Export failed' }, { status: 500 });
  }
}
