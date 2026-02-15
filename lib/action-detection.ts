// Action Detection — Tier 1 Feature 2
//
// Complements temporal-actions.ts with frame-level motion analysis.
// Detects action intensity from frame data and groups into sequences.
// Used for: action sequence DB records, smart frame selection, motion scoring.

export type MotionFrame = {
  frameIndex: number;
  motionDelta: number;     // 0-1 normalized motion intensity
  isActive: boolean;       // Above activity threshold
};

export type ActionSequence = {
  startFrame: number;
  endFrame: number;
  peakFrame: number;
  peakMotionDelta: number;
  frameCount: number;
  actionType: string;
  techniqueAttempted: string | null;
  outcome: 'successful' | 'unsuccessful' | 'unknown';
  representativeFrames: number[];
};

/**
 * Estimate motion intensity from base64 frame data.
 * Uses string length delta as a proxy for pixel changes between frames.
 * Larger differences in compressed size = more visual change = more motion.
 */
export function estimateMotionDeltas(frames: string[]): MotionFrame[] {
  if (frames.length === 0) return [];

  const lengths = frames.map(f => f.length);
  const deltas: number[] = [0];

  for (let i = 1; i < lengths.length; i++) {
    deltas.push(Math.abs(lengths[i] - lengths[i - 1]));
  }

  // Normalize to 0-1
  const maxDelta = Math.max(...deltas, 1);
  const threshold = maxDelta * 0.15; // Activity threshold at 15% of max

  return deltas.map((delta, i) => ({
    frameIndex: i,
    motionDelta: delta / maxDelta,
    isActive: delta > threshold,
  }));
}

/**
 * Group motion frames into action sequences.
 * Consecutive active frames are grouped, with gaps of <=2 frames bridged.
 */
export function groupIntoSequences(
  motionFrames: MotionFrame[],
  observations?: Array<{ frame_index: number; action?: string; significance?: string }>,
): ActionSequence[] {
  const sequences: ActionSequence[] = [];
  let currentFrames: MotionFrame[] = [];
  let gapCount = 0;

  for (const frame of motionFrames) {
    if (frame.isActive) {
      if (gapCount > 0 && gapCount <= 2) {
        // Bridge small gaps
        currentFrames.push(frame);
      } else if (currentFrames.length === 0) {
        currentFrames = [frame];
      } else {
        currentFrames.push(frame);
      }
      gapCount = 0;
    } else {
      gapCount++;
      if (gapCount > 2 && currentFrames.length > 0) {
        sequences.push(buildSequence(currentFrames, observations));
        currentFrames = [];
      }
    }
  }

  if (currentFrames.length > 0) {
    sequences.push(buildSequence(currentFrames, observations));
  }

  return sequences;
}

function buildSequence(
  frames: MotionFrame[],
  observations?: Array<{ frame_index: number; action?: string; significance?: string }>,
): ActionSequence {
  const peakFrame = frames.reduce((best, f) =>
    f.motionDelta > best.motionDelta ? f : best, frames[0]);

  // Try to determine action type from observations
  let actionType = 'unknown';
  let techniqueAttempted: string | null = null;
  let outcome: ActionSequence['outcome'] = 'unknown';

  if (observations) {
    const relevantObs = observations.filter(o =>
      o.frame_index >= frames[0].frameIndex &&
      o.frame_index <= frames[frames.length - 1].frameIndex
    );

    for (const obs of relevantObs) {
      const action = (obs.action || '').toLowerCase();
      if (action.includes('takedown')) { actionType = 'takedown_attempt'; techniqueAttempted = obs.action || null; }
      else if (action.includes('escape') || action.includes('standup')) { actionType = 'escape_attempt'; techniqueAttempted = obs.action || null; }
      else if (action.includes('reversal')) { actionType = 'reversal_attempt'; techniqueAttempted = obs.action || null; }
      else if (action.includes('near fall') || action.includes('tilt')) { actionType = 'near_fall_attempt'; techniqueAttempted = obs.action || null; }
      else if (action.includes('scramble')) { actionType = 'scramble'; }
      else if (action.includes('shot')) { actionType = 'shot_attempt'; techniqueAttempted = obs.action || null; }

      // Check outcome from action text
      if (action.includes('successful') || action.includes('completed') || action.includes('scored'))
        outcome = 'successful';
      else if (action.includes('defended') || action.includes('stuffed') || action.includes('failed'))
        outcome = 'unsuccessful';
    }
  }

  // Select representative frames (start, peak, end)
  const representativeFrames = [
    frames[0].frameIndex,
    peakFrame.frameIndex,
    frames[frames.length - 1].frameIndex,
  ].filter((v, i, a) => a.indexOf(v) === i); // Deduplicate

  return {
    startFrame: frames[0].frameIndex,
    endFrame: frames[frames.length - 1].frameIndex,
    peakFrame: peakFrame.frameIndex,
    peakMotionDelta: peakFrame.motionDelta,
    frameCount: frames.length,
    actionType,
    techniqueAttempted,
    outcome,
    representativeFrames,
  };
}

/**
 * Select the best frames for analysis based on motion and action significance.
 * Returns frame indices sorted by importance.
 */
export function selectKeyFrames(
  motionFrames: MotionFrame[],
  maxFrames: number = 30,
): number[] {
  // Sort by motion delta descending
  const sorted = [...motionFrames]
    .sort((a, b) => b.motionDelta - a.motionDelta);

  // Take top N but ensure temporal spread
  const selected: number[] = [];
  const minGap = Math.max(1, Math.floor(motionFrames.length / maxFrames));

  for (const frame of sorted) {
    if (selected.length >= maxFrames) break;
    const tooClose = selected.some(idx => Math.abs(idx - frame.frameIndex) < minGap);
    if (!tooClose) {
      selected.push(frame.frameIndex);
    }
  }

  // Always include first and last frame
  if (!selected.includes(0)) selected.push(0);
  if (!selected.includes(motionFrames.length - 1)) selected.push(motionFrames.length - 1);

  return selected.sort((a, b) => a - b);
}

/**
 * Format action sequences as DB-ready records.
 */
export function formatSequencesForDB(
  sequences: ActionSequence[],
  analysisId: string,
): Array<Record<string, unknown>> {
  return sequences.map(seq => ({
    analysis_id: analysisId,
    start_timestamp: seq.startFrame,
    end_timestamp: seq.endFrame,
    action_type: seq.actionType,
    technique_attempted: seq.techniqueAttempted,
    outcome: seq.outcome,
    peak_frame_index: seq.peakFrame,
    peak_motion_delta: seq.peakMotionDelta,
    frame_count: seq.frameCount,
    representative_frames: seq.representativeFrames,
  }));
}
