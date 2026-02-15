// Training Data Export Pipeline — Feature 9: Fine-Tuned Wrestling Vision Model
//
// Exports matched pairs of (AI analysis, expert validation) for model fine-tuning.
// Three export formats:
// 1. vision_finetune — Frame observations + correct scores for vision model training
// 2. scoring_calibration — AI scores vs coach scores for calibration
// 3. full_pipeline — Complete pipeline data (frames, observations, scores, validations)

import { supabase } from './supabase';

export type TrainingPair = {
  analysisId: string;
  matchStyle: string;
  aiScores: {
    overall: number;
    standing: number;
    top: number;
    bottom: number;
    subScores?: Record<string, Record<string, number>>;
  };
  coachScores: {
    overall: number;
    standing: number;
    top: number;
    bottom: number;
    subScores?: Record<string, Record<string, number>>;
  };
  scoreDelta: {
    overall: number;
    standing: number;
    top: number;
    bottom: number;
  };
  coachName: string;
  coachCertification?: string;
  coachNotes?: string;
  analysisJson?: Record<string, unknown>;
  createdAt: string;
};

export type TrainingExport = {
  exportType: 'vision_finetune' | 'scoring_calibration' | 'full_pipeline';
  exportedAt: string;
  pairCount: number;
  pairs: TrainingPair[];
  statistics: {
    avgOverallDelta: number;
    avgAbsError: number;
    correlationOverall: number;
    biasDirection: 'ai_higher' | 'ai_lower' | 'neutral';
    biasAmount: number;
    categoryBias: {
      standing: number;
      top: number;
      bottom: number;
    };
  };
};

/**
 * Export matched AI-coach score pairs for model training/calibration.
 */
export async function exportTrainingData(
  exportType: 'vision_finetune' | 'scoring_calibration' | 'full_pipeline' = 'scoring_calibration',
): Promise<TrainingExport | null> {
  if (!supabase) return null;

  // Fetch all expert validations with their analyses
  const { data: validations, error: valError } = await supabase
    .from('expert_validations')
    .select('*')
    .order('created_at', { ascending: true });

  if (valError || !validations || validations.length === 0) return null;

  const analysisIds = [...new Set(validations.map((v: any) => v.analysis_id))];

  const selectFields = exportType === 'full_pipeline'
    ? 'id, overall_score, standing, top, bottom, sub_scores, match_style, analysis_json, strengths, weaknesses, created_at'
    : 'id, overall_score, standing, top, bottom, sub_scores, match_style, created_at';

  const { data: analyses, error: anaError } = await supabase
    .from('match_analyses')
    .select(selectFields)
    .in('id', analysisIds);

  if (anaError || !analyses) return null;

  const analysisMap = new Map((analyses as any[]).map(a => [a.id, a]));

  // Build training pairs
  const pairs: TrainingPair[] = [];
  for (const v of validations as any[]) {
    const analysis = analysisMap.get(v.analysis_id);
    if (!analysis) continue;

    const coachScores = v.scores as any;
    if (!coachScores) continue;

    pairs.push({
      analysisId: v.analysis_id,
      matchStyle: analysis.match_style || 'folkstyle',
      aiScores: {
        overall: analysis.overall_score,
        standing: analysis.standing,
        top: analysis.top,
        bottom: analysis.bottom,
        subScores: analysis.sub_scores,
      },
      coachScores: {
        overall: coachScores.overall || 0,
        standing: coachScores.standing || 0,
        top: coachScores.top || 0,
        bottom: coachScores.bottom || 0,
        subScores: coachScores.sub_scores,
      },
      scoreDelta: {
        overall: (coachScores.overall || 0) - analysis.overall_score,
        standing: (coachScores.standing || 0) - analysis.standing,
        top: (coachScores.top || 0) - analysis.top,
        bottom: (coachScores.bottom || 0) - analysis.bottom,
      },
      coachName: v.coach_name,
      coachCertification: v.coach_certification,
      coachNotes: v.notes,
      ...(exportType === 'full_pipeline' ? { analysisJson: analysis.analysis_json } : {}),
      createdAt: v.created_at,
    });
  }

  // Compute statistics
  const overallDeltas = pairs.map(p => p.scoreDelta.overall);
  const absErrors = overallDeltas.map(d => Math.abs(d));
  const avgDelta = overallDeltas.length > 0
    ? overallDeltas.reduce((a, b) => a + b, 0) / overallDeltas.length
    : 0;
  const avgAbsError = absErrors.length > 0
    ? absErrors.reduce((a, b) => a + b, 0) / absErrors.length
    : 0;

  const biasDirection = avgDelta > 2 ? 'ai_lower' as const : avgDelta < -2 ? 'ai_higher' as const : 'neutral' as const;

  const standingDeltas = pairs.map(p => p.scoreDelta.standing);
  const topDeltas = pairs.map(p => p.scoreDelta.top);
  const bottomDeltas = pairs.map(p => p.scoreDelta.bottom);

  const avgArr = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    exportType,
    exportedAt: new Date().toISOString(),
    pairCount: pairs.length,
    pairs,
    statistics: {
      avgOverallDelta: Math.round(avgDelta * 10) / 10,
      avgAbsError: Math.round(avgAbsError * 10) / 10,
      correlationOverall: 0, // Computed by caller if needed
      biasDirection,
      biasAmount: Math.round(Math.abs(avgDelta) * 10) / 10,
      categoryBias: {
        standing: Math.round(avgArr(standingDeltas) * 10) / 10,
        top: Math.round(avgArr(topDeltas) * 10) / 10,
        bottom: Math.round(avgArr(bottomDeltas) * 10) / 10,
      },
    },
  };
}

/**
 * Save export metadata to database for tracking.
 */
export async function recordExport(exportData: TrainingExport): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('training_data_exports')
    .insert({
      export_type: exportData.exportType,
      analysis_count: exportData.pairCount,
      validation_count: exportData.pairCount,
      metadata: exportData.statistics,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[LevelUp] Failed to record export:', error);
    return null;
  }

  return data?.id || null;
}
