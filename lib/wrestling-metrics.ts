// Wrestling Metrics — Tier 1 Feature 1
//
// Computes wrestling-specific performance metrics from pose data and observations.
// Feeds into longitudinal tracking and biomechanical analysis.

import { PoseMetrics } from './pose-estimation';

export type WrestlingMetrics = {
  stanceQuality: number;       // 0-100, composite of width, height, knee bend
  levelChangeSpeed: number;    // Estimated from hip height changes between frames
  shotPenetration: number;     // Estimated from forward motion during shot attempts
  defensiveReaction: number;   // Estimated from stance changes after opponent attacks
  scrambleRate: number;        // % of transitional frames showing active scrambling
  positionControlTime: Record<string, number>; // Frames spent in each position
};

export type MatchMetrics = {
  totalFrames: number;
  wrestlingMetrics: WrestlingMetrics;
  fatigueIndex: number;        // 0-1, higher = more fatigue detected
  activityRate: number;        // % of frames with active wrestling
  scoringDensity: number;      // Scoring events per action window
};

/**
 * Compute stance quality score (0-100) from pose metrics.
 * Good wrestling stance: low hips, bent knees, moderate width.
 */
export function computeStanceQuality(metrics: PoseMetrics[]): number {
  const validMetrics = metrics.filter(m =>
    m.athlete_hip_height !== null || m.athlete_knee_angle !== null
  );

  if (validMetrics.length === 0) return 50; // Default when no data

  let totalScore = 0;
  let count = 0;

  for (const m of validMetrics) {
    let frameScore = 50;

    // Hip height: lower is better for wrestling (0.3-0.4 ideal)
    if (m.athlete_hip_height !== null) {
      if (m.athlete_hip_height <= 0.4) frameScore += 20;
      else if (m.athlete_hip_height <= 0.5) frameScore += 10;
      else if (m.athlete_hip_height >= 0.65) frameScore -= 10;
    }

    // Knee angle: moderate bend is ideal (100-140 degrees)
    if (m.athlete_knee_angle !== null) {
      if (m.athlete_knee_angle >= 100 && m.athlete_knee_angle <= 140) frameScore += 20;
      else if (m.athlete_knee_angle >= 80 && m.athlete_knee_angle <= 160) frameScore += 10;
      else frameScore -= 5;
    }

    // Stance width: moderate is best
    if (m.athlete_stance_width !== null) {
      if (m.athlete_stance_width >= 0.1 && m.athlete_stance_width <= 0.25) frameScore += 10;
      else if (m.athlete_stance_width < 0.05) frameScore -= 10;
    }

    totalScore += Math.max(0, Math.min(100, frameScore));
    count++;
  }

  return Math.round(totalScore / count);
}

/**
 * Compute level change speed from consecutive pose frames.
 * Measures how quickly hip height drops (indicating a shot).
 */
export function computeLevelChangeSpeed(metrics: PoseMetrics[]): number {
  const validHips = metrics.filter(m => m.athlete_hip_height !== null);
  if (validHips.length < 3) return 0;

  let maxDrop = 0;
  for (let i = 1; i < validHips.length; i++) {
    const drop = validHips[i - 1].athlete_hip_height! - validHips[i].athlete_hip_height!;
    if (drop > maxDrop) maxDrop = drop;
  }

  // Normalize: a drop of 0.2+ in one frame is very fast
  return Math.min(100, Math.round(maxDrop * 500));
}

/**
 * Compute fatigue index (0-1) by comparing first half vs second half metrics.
 */
export function computeFatigueIndex(metrics: PoseMetrics[]): number {
  if (metrics.length < 6) return 0;

  const half = Math.floor(metrics.length / 2);
  const firstHalf = metrics.slice(0, half);
  const secondHalf = metrics.slice(half);

  const avgHipFirst = avgNonNull(firstHalf.map(m => m.athlete_hip_height));
  const avgHipSecond = avgNonNull(secondHalf.map(m => m.athlete_hip_height));

  const avgKneeFirst = avgNonNull(firstHalf.map(m => m.athlete_knee_angle));
  const avgKneeSecond = avgNonNull(secondHalf.map(m => m.athlete_knee_angle));

  let fatigueScore = 0;

  // Rising hip height indicates fatigue
  if (avgHipFirst !== null && avgHipSecond !== null) {
    const hipDelta = avgHipSecond - avgHipFirst;
    if (hipDelta > 0.03) fatigueScore += 0.3;
    else if (hipDelta > 0.01) fatigueScore += 0.1;
  }

  // Straightening knees indicates fatigue
  if (avgKneeFirst !== null && avgKneeSecond !== null) {
    const kneeDelta = avgKneeSecond - avgKneeFirst;
    if (kneeDelta > 10) fatigueScore += 0.3;
    else if (kneeDelta > 5) fatigueScore += 0.1;
  }

  // Increasing entanglement might indicate fatigue (can't separate)
  const avgEntFirst = avgNonNull(firstHalf.map(m => m.entanglement_score));
  const avgEntSecond = avgNonNull(secondHalf.map(m => m.entanglement_score));
  if (avgEntFirst !== null && avgEntSecond !== null) {
    const entDelta = avgEntSecond - avgEntFirst;
    if (entDelta > 0.15) fatigueScore += 0.2;
  }

  return Math.min(1, fatigueScore);
}

/**
 * Compute position control time from observations.
 */
export function computePositionControl(
  observations: Array<{ athlete_position?: string }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const obs of observations) {
    const pos = obs.athlete_position || 'unknown';
    counts[pos] = (counts[pos] || 0) + 1;
  }
  return counts;
}

/**
 * Compute full match metrics from pose data and observations.
 */
export function computeMatchMetrics(
  poseMetrics: PoseMetrics[],
  observations: Array<{ athlete_position?: string; significance?: string; action?: string }>,
): MatchMetrics {
  const activeFrames = observations.filter(o =>
    o.significance !== 'SKIP' && o.action !== 'reset'
  ).length;

  const scoringActions = observations.filter(o =>
    o.significance === 'CRITICAL'
  ).length;

  const actionWindows = Math.max(1, observations.filter(o =>
    o.significance === 'CRITICAL' || o.significance === 'IMPORTANT'
  ).length);

  return {
    totalFrames: observations.length,
    wrestlingMetrics: {
      stanceQuality: computeStanceQuality(poseMetrics),
      levelChangeSpeed: computeLevelChangeSpeed(poseMetrics),
      shotPenetration: 0, // Requires explicit shot detection
      defensiveReaction: 0, // Requires reaction time measurement
      scrambleRate: observations.filter(o => o.athlete_position === 'transition').length / Math.max(1, observations.length) * 100,
      positionControlTime: computePositionControl(observations),
    },
    fatigueIndex: computeFatigueIndex(poseMetrics),
    activityRate: (activeFrames / Math.max(1, observations.length)) * 100,
    scoringDensity: scoringActions / actionWindows,
  };
}

// --- Helpers ---

function avgNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
