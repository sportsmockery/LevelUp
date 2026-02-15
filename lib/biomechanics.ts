// Biomechanics — Tier 2 Feature 5
//
// Computes biomechanical angle measurements from pose keypoints.
// Compares against ideal ranges from coaching science literature.

import { Keypoint, PersonPose } from './pose-estimation';

export type AngleMeasurement = {
  name: string;
  angle: number;          // Degrees
  idealRange: [number, number]; // [min, max] degrees
  isWithinIdeal: boolean;
  deviation: number;      // How far from ideal range (0 if within)
  recommendation: string;
};

export type BiomechanicalReport = {
  frameIndex: number;
  technique: string;
  measurements: AngleMeasurement[];
  overallScore: number;   // 0-100, % of angles within ideal range
  violations: AngleMeasurement[];
  summary: string;
};

// Ideal angle ranges for wrestling techniques (from coaching science)
export const BIOMECHANICAL_STANDARDS: Record<string, Record<string, [number, number]>> = {
  single_leg_shot: {
    lead_knee_angle: [60, 90],
    trail_leg_angle: [140, 180],
    hip_angle: [45, 75],
    back_angle: [20, 45],
    head_angle: [0, 15],
  },
  double_leg_shot: {
    lead_knee_angle: [55, 85],
    trail_leg_angle: [145, 180],
    hip_angle: [40, 70],
    back_angle: [15, 40],
    shoulder_angle: [0, 20],
  },
  sprawl: {
    hip_angle: [150, 180],
    knee_angle: [120, 170],
    ankle_angle: [80, 110],
    shoulder_angle: [0, 30],
  },
  stance_neutral: {
    knee_angle: [110, 145],
    hip_angle: [90, 130],
    stance_width_ratio: [0.1, 0.25],
    shoulder_level: [0, 10],
  },
  penetration_step: {
    lead_knee_angle: [70, 100],
    trail_knee_angle: [130, 170],
    hip_drop: [0.15, 0.35],
    back_angle: [20, 50],
  },
  standup_escape: {
    hip_angle: [80, 120],
    knee_angle: [90, 140],
    back_angle: [10, 40],
  },
  half_nelson_turn: {
    arm_angle: [80, 120],
    hip_angle: [60, 100],
    chest_pressure_angle: [15, 45],
  },
  tilt_series: {
    hip_angle: [50, 90],
    lock_angle: [70, 110],
    back_exposure: [30, 70],
  },
};

/**
 * Compute angle between three keypoints (in degrees).
 */
function computeAngle(a: Keypoint, vertex: Keypoint, c: Keypoint): number {
  const ba = { x: a.x - vertex.x, y: a.y - vertex.y };
  const bc = { x: c.x - vertex.x, y: c.y - vertex.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2);
  if (magBA === 0 || magBC === 0) return 180;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Get a keypoint by name from a pose, with confidence threshold.
 */
function getKP(pose: PersonPose, name: string, minConf: number = 0.3): Keypoint | null {
  const kp = pose.keypoints.find(k => k.name === name && k.confidence >= minConf);
  return kp || null;
}

/**
 * Compute biomechanical measurements for a specific technique.
 */
export function measureTechnique(
  pose: PersonPose,
  technique: string,
): AngleMeasurement[] {
  const standards = BIOMECHANICAL_STANDARDS[technique];
  if (!standards) return [];

  const measurements: AngleMeasurement[] = [];

  // Fetch all common keypoints
  const lShoulder = getKP(pose, 'left_shoulder');
  const rShoulder = getKP(pose, 'right_shoulder');
  const lElbow = getKP(pose, 'left_elbow');
  const rElbow = getKP(pose, 'right_elbow');
  const lHip = getKP(pose, 'left_hip');
  const rHip = getKP(pose, 'right_hip');
  const lKnee = getKP(pose, 'left_knee');
  const rKnee = getKP(pose, 'right_knee');
  const lAnkle = getKP(pose, 'left_ankle');
  const rAnkle = getKP(pose, 'right_ankle');

  for (const [name, idealRange] of Object.entries(standards)) {
    let angle: number | null = null;

    // Map measurement names to keypoint triplets
    if (name === 'lead_knee_angle' || name === 'knee_angle') {
      if (lHip && lKnee && lAnkle) angle = computeAngle(lHip, lKnee, lAnkle);
      else if (rHip && rKnee && rAnkle) angle = computeAngle(rHip, rKnee, rAnkle);
    } else if (name === 'trail_leg_angle' || name === 'trail_knee_angle') {
      if (rHip && rKnee && rAnkle) angle = computeAngle(rHip, rKnee, rAnkle);
      else if (lHip && lKnee && lAnkle) angle = computeAngle(lHip, lKnee, lAnkle);
    } else if (name === 'hip_angle') {
      if (lShoulder && lHip && lKnee) angle = computeAngle(lShoulder, lHip, lKnee);
      else if (rShoulder && rHip && rKnee) angle = computeAngle(rShoulder, rHip, rKnee);
    } else if (name === 'back_angle' || name === 'chest_pressure_angle') {
      // Angle of back relative to horizontal
      if (lShoulder && lHip) {
        const dy = lShoulder.y - lHip.y;
        const dx = lShoulder.x - lHip.x;
        angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
      }
    } else if (name === 'shoulder_angle' || name === 'shoulder_level') {
      if (lShoulder && rShoulder) {
        const dy = rShoulder.y - lShoulder.y;
        const dx = rShoulder.x - lShoulder.x;
        angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
      }
    } else if (name === 'arm_angle' || name === 'lock_angle') {
      if (lShoulder && lElbow) {
        if (lHip) angle = computeAngle(lHip, lShoulder, lElbow);
      }
    } else if (name === 'ankle_angle') {
      if (lKnee && lAnkle) {
        // Simplified: angle of lower leg
        const dy = lAnkle.y - lKnee.y;
        const dx = lAnkle.x - lKnee.x;
        angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
      }
    } else if (name === 'stance_width_ratio') {
      // Special case: not an angle but a ratio
      if (lAnkle && rAnkle) {
        angle = Math.sqrt((lAnkle.x - rAnkle.x) ** 2 + (lAnkle.y - rAnkle.y) ** 2);
      }
    } else if (name === 'hip_drop') {
      // Special case: hip height drop
      if (lHip && rHip) {
        angle = (lHip.y + rHip.y) / 2;
      }
    } else if (name === 'back_exposure') {
      // Simplified back exposure estimation
      if (lShoulder && rShoulder && lHip) {
        angle = computeAngle(rShoulder, lShoulder, lHip);
      }
    }

    if (angle !== null) {
      const isWithin = angle >= idealRange[0] && angle <= idealRange[1];
      const deviation = isWithin ? 0 : Math.min(
        Math.abs(angle - idealRange[0]),
        Math.abs(angle - idealRange[1])
      );

      const recommendation = isWithin
        ? `${name.replace(/_/g, ' ')} is within ideal range`
        : angle < idealRange[0]
          ? `Increase ${name.replace(/_/g, ' ')} by ~${Math.round(deviation)}° for better technique`
          : `Decrease ${name.replace(/_/g, ' ')} by ~${Math.round(deviation)}° for better technique`;

      measurements.push({
        name,
        angle: Math.round(angle * 10) / 10,
        idealRange,
        isWithinIdeal: isWithin,
        deviation: Math.round(deviation * 10) / 10,
        recommendation,
      });
    }
  }

  return measurements;
}

/**
 * Build a full biomechanical report for a frame.
 */
export function buildBiomechanicalReport(
  frameIndex: number,
  pose: PersonPose,
  technique: string,
): BiomechanicalReport {
  const measurements = measureTechnique(pose, technique);

  const withinIdeal = measurements.filter(m => m.isWithinIdeal).length;
  const overallScore = measurements.length > 0
    ? Math.round((withinIdeal / measurements.length) * 100)
    : 0;

  const violations = measurements.filter(m => !m.isWithinIdeal && m.deviation > 10);

  let summary = `Frame ${frameIndex} (${technique.replace(/_/g, ' ')}): `;
  if (overallScore >= 80) {
    summary += `Excellent biomechanics — ${withinIdeal}/${measurements.length} angles within ideal range.`;
  } else if (overallScore >= 60) {
    summary += `Good form with room for improvement — ${violations.length} angle(s) outside ideal range.`;
  } else {
    summary += `Significant deviations detected — focus on ${violations.map(v => v.name.replace(/_/g, ' ')).join(', ')}.`;
  }

  return {
    frameIndex,
    technique,
    measurements,
    overallScore,
    violations,
    summary,
  };
}

/**
 * Compare athlete's measurements against elite reference data.
 */
export function compareToElite(
  athleteMeasurements: Record<string, number>,
  eliteMeasurements: Record<string, number>,
): {
  deltas: Record<string, { athlete: number; elite: number; delta: number }>;
  recommendations: string[];
  overallSimilarity: number;
} {
  const deltas: Record<string, { athlete: number; elite: number; delta: number }> = {};
  const recommendations: string[] = [];
  let totalSimilarity = 0;
  let count = 0;

  for (const [key, eliteVal] of Object.entries(eliteMeasurements)) {
    const athleteVal = athleteMeasurements[key] ?? athleteMeasurements[`avg_${key}`];
    if (athleteVal !== undefined) {
      const delta = athleteVal - eliteVal;
      deltas[key] = { athlete: athleteVal, elite: eliteVal, delta };

      // Similarity: 1 - normalized difference
      const maxVal = Math.max(Math.abs(athleteVal), Math.abs(eliteVal), 1);
      const similarity = Math.max(0, 1 - Math.abs(delta) / maxVal);
      totalSimilarity += similarity;
      count++;

      if (Math.abs(delta) > 15) {
        const direction = delta > 0 ? 'higher' : 'lower';
        recommendations.push(
          `Your ${key.replace(/_/g, ' ')} is ${Math.abs(delta).toFixed(0)}° ${direction} than elite execution. ` +
          `${delta > 0 ? 'Reduce' : 'Increase'} for better technique.`
        );
      }
    }
  }

  return {
    deltas,
    recommendations,
    overallSimilarity: count > 0 ? Math.round((totalSimilarity / count) * 100) : 0,
  };
}
