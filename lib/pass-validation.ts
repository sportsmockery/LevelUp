// Cross-validation between Pass 1 observations and Pass 2 scoring results.
// Detects inconsistencies that may indicate hallucination or over-counting.

import type { Pass2Response } from './analysis-schema';

export type QualityFlag = {
  check: string;
  severity: 'info' | 'warning' | 'error';
  detail: string;
};

export function crossValidatePasses(
  pass1Observations: Array<{ significance?: string; action?: string; frame_index?: number }>,
  pass2Result: Pass2Response,
  frameCount: number,
): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // 1. Scoring event inflation: Pass 2 stats vs Pass 1 critical actions
  const pass1CriticalCount = pass1Observations.filter(
    (obs) => (obs.significance || '').toUpperCase() === 'CRITICAL'
  ).length;

  const pass2ScoringTotal =
    (pass2Result.match_stats?.takedowns_scored ?? 0) +
    (pass2Result.match_stats?.escapes_scored ?? 0) +
    (pass2Result.match_stats?.reversals_scored ?? 0) +
    (pass2Result.match_stats?.near_falls_scored ?? 0) +
    (pass2Result.match_stats?.pins_scored ?? 0) +
    (pass2Result.match_stats?.takedowns_allowed ?? 0);

  if (pass2ScoringTotal > 0 && pass1CriticalCount > 0 && pass2ScoringTotal > pass1CriticalCount * 2) {
    flags.push({
      check: 'scoring_inflation',
      severity: 'warning',
      detail: `Pass 2 claims ${pass2ScoringTotal} scoring events but Pass 1 only found ${pass1CriticalCount} critical actions`,
    });
  }

  // 2. Position reasoning depth
  for (const [pos, text] of Object.entries(pass2Result.position_reasoning)) {
    if (text.length < 100) {
      flags.push({
        check: 'shallow_reasoning',
        severity: 'warning',
        detail: `${pos} reasoning is only ${text.length} chars`,
      });
    }
  }

  // 3. Frame evidence density per position
  const evidencePerPosition: Record<string, number> = {};
  for (const fe of pass2Result.frame_evidence) {
    evidencePerPosition[fe.position] = (evidencePerPosition[fe.position] || 0) + 1;
  }
  for (const pos of ['standing', 'top', 'bottom']) {
    if ((evidencePerPosition[pos] || 0) < 2 && frameCount >= 10) {
      flags.push({
        check: 'sparse_evidence',
        severity: 'warning',
        detail: `Only ${evidencePerPosition[pos] || 0} evidence frames for ${pos}`,
      });
    }
  }

  // 4. Key frame minimum
  const keyFrameCount = pass2Result.frame_evidence.filter(fe => fe.is_key_moment).length;
  if (keyFrameCount < 3 && frameCount >= 10) {
    flags.push({
      check: 'few_key_frames',
      severity: 'info',
      detail: `Only ${keyFrameCount} key moments identified from ${frameCount} frames`,
    });
  }

  // 5. Frame evidence index bounds
  const outOfBounds = pass2Result.frame_evidence.filter(
    fe => fe.frame_index < 0 || fe.frame_index >= frameCount
  );
  if (outOfBounds.length > 0) {
    flags.push({
      check: 'evidence_out_of_bounds',
      severity: 'error',
      detail: `${outOfBounds.length} frame evidence entries have invalid indices`,
    });
  }

  return flags;
}
