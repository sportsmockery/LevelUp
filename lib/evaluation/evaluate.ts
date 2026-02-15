// Evaluation functions for comparing AI analysis against coach-labeled gold labels.
// This is a skeleton — populate gold-labels/ directory to run actual evaluations.

import type { GoldLabel, EvaluationResult, EvaluationRunSummary, RegressionThresholds } from './types';
import { REGRESSION_THRESHOLDS } from './config';

type AnalysisOutput = {
  overall_score: number;
  position_scores: { standing: number; top: number; bottom: number };
  frame_evidence: Array<{ frame_index: number; action: string; is_key_moment: boolean; key_moment_type: string }>;
  match_result?: { result: string; result_type: string };
};

export function evaluateAgainstGold(
  analysis: AnalysisOutput,
  gold: GoldLabel,
): EvaluationResult {
  // Overall MAE
  const overall_mae = Math.abs(analysis.overall_score - gold.overall_score);

  // Position MAE
  const position_mae = {
    standing: Math.abs(analysis.position_scores.standing - gold.position_scores.standing),
    top: Math.abs(analysis.position_scores.top - gold.position_scores.top),
    bottom: Math.abs(analysis.position_scores.bottom - gold.position_scores.bottom),
  };

  // Technique recall: fraction of gold techniques found in AI output
  const aiActions = new Set(
    analysis.frame_evidence.map(fe => fe.action.toLowerCase().replace(/^(athlete|opponent):\s*/i, ''))
  );
  const goldTechniques = gold.techniques_observed.map(t => t.toLowerCase());
  const foundTechniques = goldTechniques.filter(t =>
    [...aiActions].some(a => a.includes(t) || t.includes(a))
  );
  const technique_recall = goldTechniques.length > 0 ? foundTechniques.length / goldTechniques.length : 1;

  // Technique precision: fraction of AI techniques that match gold
  const aiTechniqueList = [...aiActions];
  const precisionMatches = aiTechniqueList.filter(a =>
    goldTechniques.some(t => a.includes(t) || t.includes(a))
  );
  const technique_precision = aiTechniqueList.length > 0 ? precisionMatches.length / aiTechniqueList.length : 1;

  // Key moment recall
  const aiKeyMoments = analysis.frame_evidence.filter(fe => fe.is_key_moment);
  const goldKeyMoments = gold.key_moments;
  let keyMomentMatches = 0;
  for (const gm of goldKeyMoments) {
    const found = aiKeyMoments.some(
      ak => Math.abs(ak.frame_index - gm.frame_index) <= 2 && ak.key_moment_type.toLowerCase().includes(gm.type)
    );
    if (found) keyMomentMatches++;
  }
  const key_moment_recall = goldKeyMoments.length > 0 ? keyMomentMatches / goldKeyMoments.length : 1;

  // Winner prediction
  const winner_correct = analysis.match_result?.result === gold.match_result.result;

  return {
    matchId: gold.matchId,
    overall_mae,
    position_mae,
    technique_recall,
    technique_precision,
    key_moment_recall,
    winner_correct,
  };
}

export async function runRegressionSuite(
  goldLabels: GoldLabel[],
  analysisFn: (matchId: string) => Promise<AnalysisOutput>,
  thresholds: RegressionThresholds = REGRESSION_THRESHOLDS,
): Promise<EvaluationRunSummary> {
  const results: EvaluationResult[] = [];

  for (const gold of goldLabels) {
    const analysis = await analysisFn(gold.matchId);
    results.push(evaluateAgainstGold(analysis, gold));
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const avg_overall_mae = avg(results.map(r => r.overall_mae));
  const avg_position_mae = {
    standing: avg(results.map(r => r.position_mae.standing)),
    top: avg(results.map(r => r.position_mae.top)),
    bottom: avg(results.map(r => r.position_mae.bottom)),
  };
  const avg_technique_recall = avg(results.map(r => r.technique_recall));
  const avg_key_moment_recall = avg(results.map(r => r.key_moment_recall));
  const winner_accuracy = results.length > 0 ? results.filter(r => r.winner_correct).length / results.length : 1;

  const failedChecks: string[] = [];
  if (avg_overall_mae > thresholds.max_overall_mae) failedChecks.push(`overall_mae ${avg_overall_mae.toFixed(1)} > ${thresholds.max_overall_mae}`);
  if (avg_position_mae.standing > thresholds.max_position_mae) failedChecks.push(`standing_mae ${avg_position_mae.standing.toFixed(1)} > ${thresholds.max_position_mae}`);
  if (avg_position_mae.top > thresholds.max_position_mae) failedChecks.push(`top_mae ${avg_position_mae.top.toFixed(1)} > ${thresholds.max_position_mae}`);
  if (avg_position_mae.bottom > thresholds.max_position_mae) failedChecks.push(`bottom_mae ${avg_position_mae.bottom.toFixed(1)} > ${thresholds.max_position_mae}`);
  if (avg_technique_recall < thresholds.min_technique_recall) failedChecks.push(`technique_recall ${avg_technique_recall.toFixed(2)} < ${thresholds.min_technique_recall}`);
  if (avg_key_moment_recall < thresholds.min_key_moment_recall) failedChecks.push(`key_moment_recall ${avg_key_moment_recall.toFixed(2)} < ${thresholds.min_key_moment_recall}`);
  if (winner_accuracy < thresholds.min_winner_accuracy) failedChecks.push(`winner_accuracy ${winner_accuracy.toFixed(2)} < ${thresholds.min_winner_accuracy}`);

  return {
    runId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    pipelineVersion: 'v2',
    matchCount: results.length,
    avg_overall_mae,
    avg_position_mae,
    avg_technique_recall,
    avg_key_moment_recall,
    winner_accuracy,
    passed: failedChecks.length === 0,
    failedChecks,
  };
}
