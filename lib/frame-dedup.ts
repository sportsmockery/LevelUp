// Frame Deduplication — Feature 8: Near-Real-Time Optimization
//
// Detects and removes near-duplicate consecutive frames before analysis.
// Uses lightweight comparison of base64 image data to identify frames
// that are visually almost identical (e.g., during pauses, resets, slow motion).
//
// This reduces the number of API calls to GPT-4o without losing action coverage.
// Dedup runs BEFORE triage, so triage also benefits from fewer frames.

export type DedupResult = {
  /** Indices of frames to keep (0-based into original array) */
  keptIndices: number[];
  /** Number of frames removed as near-duplicates */
  removedCount: number;
  /** Groups of duplicate frame indices */
  duplicateGroups: number[][];
  /** Processing time in milliseconds */
  durationMs: number;
};

/**
 * Simple frame similarity check using base64 data length and header comparison.
 * This is a fast heuristic — not a perceptual hash, but effective for consecutive
 * video frames that are truly near-identical (pauses, slow motion, replays).
 *
 * Two frames are considered "similar" if:
 * 1. Their base64 data lengths differ by less than the threshold percentage
 * 2. Their first N characters of base64 data match (same image header region)
 *
 * This catches: frozen frames, very slow motion, camera-still pauses
 * This misses: different angles with similar file sizes (acceptable — we want fast, not perfect)
 */
export function deduplicateFrames(
  frames: string[],
  options?: {
    /** Maximum percentage difference in base64 length to consider similar. Default: 2 (%) */
    lengthThresholdPct?: number;
    /** Number of base64 characters to compare from frame data. Default: 200 */
    headerCompareLength?: number;
    /** Minimum frames to keep regardless of dedup. Default: 8 */
    minFrames?: number;
    /** Maximum consecutive duplicates to remove. Default: 3 */
    maxConsecutiveRemoval?: number;
  },
): DedupResult {
  const startTime = Date.now();
  const lengthThreshold = (options?.lengthThresholdPct ?? 2) / 100;
  const headerLen = options?.headerCompareLength ?? 200;
  const minFrames = options?.minFrames ?? 8;
  const maxConsecutiveRemoval = options?.maxConsecutiveRemoval ?? 3;

  if (frames.length <= minFrames) {
    return {
      keptIndices: frames.map((_, i) => i),
      removedCount: 0,
      duplicateGroups: [],
      durationMs: Date.now() - startTime,
    };
  }

  const kept: number[] = [0]; // Always keep first frame
  const duplicateGroups: number[][] = [];
  let currentGroup: number[] = [];
  let consecutiveRemoved = 0;

  for (let i = 1; i < frames.length; i++) {
    const prev = frames[kept[kept.length - 1]];
    const curr = frames[i];

    if (areSimilar(prev, curr, lengthThreshold, headerLen) && consecutiveRemoved < maxConsecutiveRemoval) {
      // Similar to last kept frame — mark as duplicate
      if (currentGroup.length === 0) {
        currentGroup.push(kept[kept.length - 1]);
      }
      currentGroup.push(i);
      consecutiveRemoved++;
    } else {
      // Different enough — keep this frame
      if (currentGroup.length > 0) {
        duplicateGroups.push(currentGroup);
        currentGroup = [];
      }
      kept.push(i);
      consecutiveRemoved = 0;
    }
  }

  // Flush last group
  if (currentGroup.length > 0) {
    duplicateGroups.push(currentGroup);
  }

  // Ensure we always keep the last frame
  if (kept[kept.length - 1] !== frames.length - 1) {
    kept.push(frames.length - 1);
  }

  // Ensure minimum frame count — add back evenly spaced frames if needed
  if (kept.length < minFrames && frames.length >= minFrames) {
    const step = frames.length / minFrames;
    const keptSet = new Set(kept);
    for (let i = 0; i < minFrames; i++) {
      const idx = Math.round(i * step);
      if (idx < frames.length) {
        keptSet.add(idx);
      }
    }
    const allKept = [...keptSet].sort((a, b) => a - b);
    return {
      keptIndices: allKept,
      removedCount: frames.length - allKept.length,
      duplicateGroups,
      durationMs: Date.now() - startTime,
    };
  }

  return {
    keptIndices: kept,
    removedCount: frames.length - kept.length,
    duplicateGroups,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Check if two base64 frame strings are visually similar using fast heuristics.
 */
function areSimilar(
  frameA: string,
  frameB: string,
  lengthThreshold: number,
  headerLen: number,
): boolean {
  // Strip data URL prefix if present
  const dataA = stripDataPrefix(frameA);
  const dataB = stripDataPrefix(frameB);

  // Length comparison
  const lenA = dataA.length;
  const lenB = dataB.length;
  const lenDiff = Math.abs(lenA - lenB) / Math.max(lenA, lenB, 1);
  if (lenDiff > lengthThreshold) return false;

  // Header region comparison (first N chars of base64 payload)
  const compareLen = Math.min(headerLen, dataA.length, dataB.length);
  const headerA = dataA.substring(0, compareLen);
  const headerB = dataB.substring(0, compareLen);

  // Count matching characters (allow small differences)
  let matches = 0;
  for (let i = 0; i < compareLen; i++) {
    if (headerA[i] === headerB[i]) matches++;
  }

  const matchRatio = matches / compareLen;
  return matchRatio > 0.95; // 95% header match threshold
}

/**
 * Strip data:image/...;base64, prefix if present.
 */
function stripDataPrefix(frame: string): string {
  const commaIdx = frame.indexOf(',');
  if (commaIdx > 0 && commaIdx < 50 && frame.startsWith('data:')) {
    return frame.substring(commaIdx + 1);
  }
  return frame;
}

/**
 * Apply dedup results to extract kept frames.
 */
export function applyDedup(
  frames: string[],
  dedupResult: DedupResult,
): { frames: string[]; originalIndices: number[] } {
  return {
    frames: dedupResult.keptIndices.map(i => frames[i]),
    originalIndices: dedupResult.keptIndices,
  };
}
