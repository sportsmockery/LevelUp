// Pipeline invariant checks — run after Pass 2 to validate output quality.
// Warnings are logged and included in the response; they do not abort analysis.

import type { Pass2Response } from './analysis-schema';

export type InvariantWarning = {
  check: string;
  severity: 'error' | 'warning' | 'info';
  detail: string;
};

export function validatePipelineInvariants(
  pass2Result: Pass2Response,
  frameCount: number,
  observationCount: number,
): InvariantWarning[] {
  const warnings: InvariantWarning[] = [];

  // 1. Observation coverage: should be >= 70% of frames
  if (observationCount < frameCount * 0.7) {
    warnings.push({
      check: 'observation_coverage',
      severity: 'warning',
      detail: `Only ${observationCount}/${frameCount} observations (${Math.round(observationCount / frameCount * 100)}% coverage)`,
    });
  }

  // 2. Evidence density: at least 2 frames per scored position
  const positionsReferenced = new Set(pass2Result.frame_evidence.map(fe => fe.position));
  for (const pos of ['standing', 'top', 'bottom']) {
    const count = pass2Result.frame_evidence.filter(fe => fe.position === pos).length;
    if (positionsReferenced.has(pos) && count < 2) {
      warnings.push({
        check: 'evidence_density',
        severity: 'warning',
        detail: `Only ${count} frame evidence for ${pos} position`,
      });
    }
  }

  // 3. Position reasoning depth: >= 100 chars each
  for (const [pos, text] of Object.entries(pass2Result.position_reasoning)) {
    if (text.length < 100) {
      warnings.push({
        check: 'reasoning_depth',
        severity: 'warning',
        detail: `${pos} reasoning only ${text.length} chars (min 100)`,
      });
    }
  }

  // 4. Score calculation consistency
  const expectedOverall = Math.round(
    pass2Result.position_scores.standing * 0.4 +
    pass2Result.position_scores.top * 0.3 +
    pass2Result.position_scores.bottom * 0.3
  );
  if (Math.abs(pass2Result.overall_score - expectedOverall) > 1) {
    warnings.push({
      check: 'score_calculation',
      severity: 'error',
      detail: `Overall ${pass2Result.overall_score} vs calculated ${expectedOverall}`,
    });
  }

  // 5. Key frame minimum: at least 3 for videos with 10+ frames
  const keyFrames = pass2Result.frame_evidence.filter(fe => fe.is_key_moment).length;
  if (keyFrames < 3 && frameCount >= 10) {
    warnings.push({
      check: 'key_frame_density',
      severity: 'info',
      detail: `Only ${keyFrames} key moments identified from ${frameCount} frames`,
    });
  }

  // 6. Frame evidence should exist
  if (pass2Result.frame_evidence.length === 0) {
    warnings.push({
      check: 'no_evidence',
      severity: 'error',
      detail: 'Pass 2 returned zero frame evidence entries',
    });
  }

  return warnings;
}
