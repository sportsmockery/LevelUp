// Pose Estimation Integration — Gap 2: Skeletal Tracking
//
// Provides structured pose/keypoint data to augment GPT-4o's visual analysis.
// Architecture: Pluggable provider pattern supporting multiple backends:
//   1. GPT-4o Pass 1 "soft" pose fields (already exists — enhanced here)
//   2. Cloud API providers (Roboflow, Google Cloud) — REST calls from Vercel
//   3. Future: Python sidecar with YOLO-Pose on GPU
//
// Key insight from research: ALL pose estimators struggle with entangled wrestlers.
// GPT-4o's visual understanding is often better for close-contact positions.
// Keypoints are most valuable for: stance analysis, position transitions, fatigue quantification.

export type Keypoint = {
  name: string;
  x: number;    // Normalized 0-1 (fraction of image width)
  y: number;    // Normalized 0-1 (fraction of image height)
  confidence: number; // 0-1
};

export type PersonPose = {
  person_id: number;
  keypoints: Keypoint[];
  bounding_box?: { x: number; y: number; w: number; h: number };
  confidence: number;
};

export type FramePoseData = {
  frame_index: number;
  persons: PersonPose[];
  provider: string;
  latency_ms: number;
};

export type PoseMetrics = {
  frame_index: number;
  athlete_stance_width: number | null;    // Normalized distance between ankles
  athlete_knee_angle: number | null;      // Degrees (180 = straight, 90 = deep bend)
  athlete_hip_height: number | null;      // Normalized y-position of hip midpoint
  athlete_shoulder_angle: number | null;  // Degrees of shoulder line relative to horizontal
  athlete_center_of_mass_y: number | null; // Estimated CoM height
  opponent_proximity: number | null;       // Distance between athlete and opponent CoMs
  entanglement_score: number | null;       // 0-1, how overlapping the two poses are
};

// COCO 17 keypoint names (standard across MoveNet, YOLO-Pose, etc.)
const COCO_KEYPOINTS = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
] as const;

/**
 * Compute wrestling-relevant metrics from raw keypoint data.
 * These metrics are injected into Pass 1/Pass 2 prompts as structured context.
 */
export function computePoseMetrics(
  poseData: FramePoseData,
  athletePersonId?: number,
): PoseMetrics {
  const athlete = athletePersonId !== undefined
    ? poseData.persons.find(p => p.person_id === athletePersonId)
    : poseData.persons[0]; // Default to first detected person

  const opponent = poseData.persons.find(p => p !== athlete);

  const getKeypoint = (person: PersonPose, name: string): Keypoint | undefined =>
    person.keypoints.find(k => k.name === name && k.confidence > 0.3);

  const result: PoseMetrics = {
    frame_index: poseData.frame_index,
    athlete_stance_width: null,
    athlete_knee_angle: null,
    athlete_hip_height: null,
    athlete_shoulder_angle: null,
    athlete_center_of_mass_y: null,
    opponent_proximity: null,
    entanglement_score: null,
  };

  if (!athlete) return result;

  // Stance width: distance between ankles
  const leftAnkle = getKeypoint(athlete, 'left_ankle');
  const rightAnkle = getKeypoint(athlete, 'right_ankle');
  if (leftAnkle && rightAnkle) {
    result.athlete_stance_width = Math.sqrt(
      (leftAnkle.x - rightAnkle.x) ** 2 + (leftAnkle.y - rightAnkle.y) ** 2
    );
  }

  // Knee angle: angle at knee joint (hip-knee-ankle)
  const leftHip = getKeypoint(athlete, 'left_hip');
  const rightHip = getKeypoint(athlete, 'right_hip');
  const leftKnee = getKeypoint(athlete, 'left_knee');
  const rightKnee = getKeypoint(athlete, 'right_knee');
  if (leftHip && leftKnee && leftAnkle) {
    result.athlete_knee_angle = computeAngle(leftHip, leftKnee, leftAnkle);
  } else if (rightHip && rightKnee && rightAnkle) {
    result.athlete_knee_angle = computeAngle(rightHip, rightKnee, rightAnkle);
  }

  // Hip height: average y of hips (lower = better wrestling stance)
  if (leftHip && rightHip) {
    result.athlete_hip_height = (leftHip.y + rightHip.y) / 2;
  }

  // Shoulder angle: tilt of shoulder line
  const leftShoulder = getKeypoint(athlete, 'left_shoulder');
  const rightShoulder = getKeypoint(athlete, 'right_shoulder');
  if (leftShoulder && rightShoulder) {
    const dy = rightShoulder.y - leftShoulder.y;
    const dx = rightShoulder.x - leftShoulder.x;
    result.athlete_shoulder_angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
  }

  // Center of mass estimate (weighted average of torso keypoints)
  const torsoPoints = [leftShoulder, rightShoulder, leftHip, rightHip].filter(
    (p): p is Keypoint => p !== undefined
  );
  if (torsoPoints.length >= 2) {
    result.athlete_center_of_mass_y =
      torsoPoints.reduce((sum, p) => sum + p.y, 0) / torsoPoints.length;
  }

  // Opponent proximity
  if (opponent) {
    const opponentTorso = [
      getKeypoint(opponent, 'left_shoulder'),
      getKeypoint(opponent, 'right_shoulder'),
      getKeypoint(opponent, 'left_hip'),
      getKeypoint(opponent, 'right_hip'),
    ].filter((p): p is Keypoint => p !== undefined);

    if (torsoPoints.length >= 2 && opponentTorso.length >= 2) {
      const athleteCenter = {
        x: torsoPoints.reduce((s, p) => s + p.x, 0) / torsoPoints.length,
        y: torsoPoints.reduce((s, p) => s + p.y, 0) / torsoPoints.length,
      };
      const opponentCenter = {
        x: opponentTorso.reduce((s, p) => s + p.x, 0) / opponentTorso.length,
        y: opponentTorso.reduce((s, p) => s + p.y, 0) / opponentTorso.length,
      };
      result.opponent_proximity = Math.sqrt(
        (athleteCenter.x - opponentCenter.x) ** 2 +
        (athleteCenter.y - opponentCenter.y) ** 2
      );
    }

    // Entanglement score: how much the bounding boxes overlap
    if (athlete.bounding_box && opponent.bounding_box) {
      result.entanglement_score = computeIoU(athlete.bounding_box, opponent.bounding_box);
    }
  }

  return result;
}

/**
 * Format pose metrics as structured text for injection into GPT-4o prompts.
 */
export function formatPoseContext(metrics: PoseMetrics[]): string {
  if (metrics.length === 0) return '';

  const lines = metrics.map(m => {
    const parts: string[] = [`Frame ${m.frame_index}:`];
    if (m.athlete_stance_width !== null) parts.push(`stance_width=${m.athlete_stance_width.toFixed(3)}`);
    if (m.athlete_knee_angle !== null) parts.push(`knee_angle=${Math.round(m.athlete_knee_angle)}°`);
    if (m.athlete_hip_height !== null) parts.push(`hip_height=${m.athlete_hip_height.toFixed(3)}`);
    if (m.athlete_shoulder_angle !== null) parts.push(`shoulder_tilt=${Math.round(m.athlete_shoulder_angle)}°`);
    if (m.opponent_proximity !== null) parts.push(`opponent_dist=${m.opponent_proximity.toFixed(3)}`);
    if (m.entanglement_score !== null) parts.push(`entanglement=${m.entanglement_score.toFixed(2)}`);
    return parts.join(' ');
  });

  return `\nSTRUCTURED POSE DATA (from skeletal analysis):\n${lines.join('\n')}\nUse this numeric data to validate your visual observations. Stance width <0.1 = narrow stance. Hip height >0.6 = upright. Knee angle >160° = straight legs.`;
}

/**
 * Track pose metrics over time to detect fatigue indicators.
 * Returns trends that are injected into fatigue analysis context.
 */
export function computePoseTrends(metrics: PoseMetrics[]): {
  hip_height_trend: 'rising' | 'stable' | 'falling' | 'insufficient_data';
  stance_width_trend: 'narrowing' | 'stable' | 'widening' | 'insufficient_data';
  knee_angle_trend: 'straightening' | 'stable' | 'deepening' | 'insufficient_data';
  fatigue_indicators: string[];
} {
  const result: {
    hip_height_trend: 'rising' | 'stable' | 'falling' | 'insufficient_data';
    stance_width_trend: 'narrowing' | 'stable' | 'widening' | 'insufficient_data';
    knee_angle_trend: 'straightening' | 'stable' | 'deepening' | 'insufficient_data';
    fatigue_indicators: string[];
  } = {
    hip_height_trend: 'insufficient_data',
    stance_width_trend: 'insufficient_data',
    knee_angle_trend: 'insufficient_data',
    fatigue_indicators: [],
  };

  const validHips = metrics.filter(m => m.athlete_hip_height !== null);
  const validStance = metrics.filter(m => m.athlete_stance_width !== null);
  const validKnees = metrics.filter(m => m.athlete_knee_angle !== null);

  if (validHips.length >= 6) {
    const half = Math.floor(validHips.length / 2);
    const firstHalf = validHips.slice(0, half);
    const secondHalf = validHips.slice(half);
    const firstAvg = avg(firstHalf.map(m => m.athlete_hip_height!));
    const secondAvg = avg(secondHalf.map(m => m.athlete_hip_height!));
    const delta = secondAvg - firstAvg;

    if (delta > 0.03) {
      result.hip_height_trend = 'rising';
      result.fatigue_indicators.push(`Hip height rising (+${(delta * 100).toFixed(1)}%) — wrestler getting more upright, possible fatigue`);
    } else if (delta < -0.03) {
      result.hip_height_trend = 'falling';
    } else {
      result.hip_height_trend = 'stable';
    }
  }

  if (validStance.length >= 6) {
    const half = Math.floor(validStance.length / 2);
    const firstAvg = avg(validStance.slice(0, half).map(m => m.athlete_stance_width!));
    const secondAvg = avg(validStance.slice(half).map(m => m.athlete_stance_width!));
    const delta = secondAvg - firstAvg;

    if (delta < -0.02) {
      result.stance_width_trend = 'narrowing';
      result.fatigue_indicators.push(`Stance narrowing (${(delta * 100).toFixed(1)}%) — possible balance/fatigue issue`);
    } else if (delta > 0.02) {
      result.stance_width_trend = 'widening';
    } else {
      result.stance_width_trend = 'stable';
    }
  }

  if (validKnees.length >= 6) {
    const half = Math.floor(validKnees.length / 2);
    const firstAvg = avg(validKnees.slice(0, half).map(m => m.athlete_knee_angle!));
    const secondAvg = avg(validKnees.slice(half).map(m => m.athlete_knee_angle!));
    const delta = secondAvg - firstAvg;

    if (delta > 5) {
      result.knee_angle_trend = 'straightening';
      result.fatigue_indicators.push(`Knee angle straightening (+${delta.toFixed(0)}°) — legs less bent, possible fatigue`);
    } else if (delta < -5) {
      result.knee_angle_trend = 'deepening';
    } else {
      result.knee_angle_trend = 'stable';
    }
  }

  return result;
}

// --- Helpers ---

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

function computeIoU(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const union = areaA + areaB - intersection;
  return union > 0 ? intersection / union : 0;
}

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

/**
 * Extract structured pose metrics from Pass 1 "soft" pose observations.
 * Maps GPT-4o's qualitative fields to quantitative-ish values.
 * This is the zero-cost option — no external API needed.
 */
export function extractSoftPoseMetrics(
  observations: Array<{
    frame_index: number;
    estimated_stance_height?: string;
    estimated_knee_angle?: string;
    relative_position?: string;
    weight_distribution?: string;
    wrestler_visible?: boolean;
  }>,
): PoseMetrics[] {
  return observations
    .filter(obs => obs.wrestler_visible !== false)
    .map(obs => {
      // Map qualitative stance height to hip height estimate
      const hipHeightMap: Record<string, number> = { low: 0.35, medium: 0.5, high: 0.65 };
      const kneeAngleMap: Record<string, number> = { deep_bend: 90, moderate: 130, straight: 170 };

      return {
        frame_index: obs.frame_index,
        athlete_stance_width: null, // Not available from soft pose
        athlete_knee_angle: kneeAngleMap[obs.estimated_knee_angle || ''] ?? null,
        athlete_hip_height: hipHeightMap[obs.estimated_stance_height || ''] ?? null,
        athlete_shoulder_angle: null,
        athlete_center_of_mass_y: null,
        opponent_proximity: obs.relative_position === 'tied_up' ? 0.05
          : obs.relative_position === 'on_mat' ? 0.08
          : obs.relative_position === 'scramble' ? 0.1
          : obs.relative_position === 'separated' ? 0.3
          : null,
        entanglement_score: obs.relative_position === 'tied_up' ? 0.7
          : obs.relative_position === 'scramble' ? 0.5
          : obs.relative_position === 'on_mat' ? 0.4
          : obs.relative_position === 'separated' ? 0.0
          : null,
      };
    });
}

// Export keypoint names for reference
export { COCO_KEYPOINTS };
