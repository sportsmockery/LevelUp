// Observation Summarizer — Feature 8: Near-Real-Time Optimization
//
// Compresses Pass 1 frame-by-frame observations into a condensed format
// before sending to Pass 2. Reduces prompt tokens by 40-60% while preserving
// all scoring-relevant information.
//
// Strategy:
// 1. Group consecutive frames with same position + similar action into "segments"
// 2. Deduplicate repetitive body/contact descriptions within segments
// 3. Preserve all CRITICAL/IMPORTANT observations verbatim
// 4. Condense CONTEXT/SKIP observations into segment summaries
// 5. Output a structured text format that Pass 2 can still reason over

export type Pass1Observation = {
  frame_index: number;
  athlete_position: string;
  athlete_body: string;
  opponent_body: string;
  contact_points: string;
  action: string;
  wrestler_visible: boolean;
  athlete_identity_consistent?: boolean;
  identity_notes?: string;
  estimated_stance_height?: string;
  estimated_knee_angle?: string;
  relative_position?: string;
  weight_distribution?: string;
  significance: string;
};

export type ObservationSegment = {
  startFrame: number;
  endFrame: number;
  frameCount: number;
  position: string;
  actions: string[];
  keyObservations: Pass1Observation[];
  contextSummary: string;
  significance: 'CRITICAL' | 'IMPORTANT' | 'CONTEXT' | 'SKIP';
};

export type SummarizedObservations = {
  segments: ObservationSegment[];
  totalFrames: number;
  compressedFrames: number;
  compressionRatio: number;
  criticalCount: number;
  importantCount: number;
};

/**
 * Summarize Pass 1 observations into compressed segments for Pass 2.
 * All CRITICAL and IMPORTANT observations are preserved verbatim.
 * CONTEXT/SKIP frames are grouped and summarized.
 */
export function summarizeObservations(observations: Pass1Observation[]): SummarizedObservations {
  if (observations.length === 0) {
    return {
      segments: [],
      totalFrames: 0,
      compressedFrames: 0,
      compressionRatio: 1,
      criticalCount: 0,
      importantCount: 0,
    };
  }

  const segments: ObservationSegment[] = [];
  let currentSegment: Pass1Observation[] = [];
  let currentPosition = '';

  for (const obs of observations) {
    const sig = (obs.significance || 'CONTEXT').toUpperCase();
    const pos = obs.athlete_position || 'unknown';

    // CRITICAL/IMPORTANT observations always start their own segment
    if (sig === 'CRITICAL' || sig === 'IMPORTANT') {
      // Flush current context segment
      if (currentSegment.length > 0) {
        segments.push(buildContextSegment(currentSegment));
        currentSegment = [];
        currentPosition = '';
      }
      // Add as standalone segment
      segments.push({
        startFrame: obs.frame_index,
        endFrame: obs.frame_index,
        frameCount: 1,
        position: pos,
        actions: [obs.action],
        keyObservations: [obs],
        contextSummary: '',
        significance: sig as 'CRITICAL' | 'IMPORTANT',
      });
    } else {
      // CONTEXT/SKIP — group with same position
      if (pos !== currentPosition && currentSegment.length > 0) {
        segments.push(buildContextSegment(currentSegment));
        currentSegment = [];
      }
      currentPosition = pos;
      currentSegment.push(obs);
    }
  }

  // Flush remaining
  if (currentSegment.length > 0) {
    segments.push(buildContextSegment(currentSegment));
  }

  const criticalCount = segments.filter(s => s.significance === 'CRITICAL').length;
  const importantCount = segments.filter(s => s.significance === 'IMPORTANT').length;
  const compressedFrames = segments.reduce((sum, s) => sum + (s.significance === 'CONTEXT' || s.significance === 'SKIP' ? s.frameCount : 0), 0);

  return {
    segments,
    totalFrames: observations.length,
    compressedFrames,
    compressionRatio: segments.length / Math.max(observations.length, 1),
    criticalCount,
    importantCount,
  };
}

/**
 * Build a condensed context segment from grouped observations.
 */
function buildContextSegment(observations: Pass1Observation[]): ObservationSegment {
  const position = observations[0].athlete_position || 'unknown';
  const uniqueActions = [...new Set(observations.map(o => o.action))];
  const visibleCount = observations.filter(o => o.wrestler_visible).length;

  // Build summary: position, frame range, unique actions, visibility
  const summaryParts: string[] = [];
  summaryParts.push(`${observations.length} frames in ${position}`);
  if (uniqueActions.length <= 3) {
    summaryParts.push(`actions: ${uniqueActions.join(', ')}`);
  } else {
    summaryParts.push(`${uniqueActions.length} distinct actions including ${uniqueActions.slice(0, 2).join(', ')}`);
  }
  if (visibleCount < observations.length) {
    summaryParts.push(`wrestler visible in ${visibleCount}/${observations.length} frames`);
  }

  // Extract stance/posture summary if available
  const stanceHeights = observations.map(o => o.estimated_stance_height).filter(Boolean);
  if (stanceHeights.length > 0) {
    const uniqueHeights = [...new Set(stanceHeights)];
    summaryParts.push(`stance: ${uniqueHeights.join(' -> ')}`);
  }

  return {
    startFrame: observations[0].frame_index,
    endFrame: observations[observations.length - 1].frame_index,
    frameCount: observations.length,
    position,
    actions: uniqueActions,
    keyObservations: [],
    contextSummary: summaryParts.join('; '),
    significance: 'CONTEXT',
  };
}

/**
 * Format summarized observations into text for Pass 2 prompt.
 * This replaces the raw frame-by-frame text and is ~40-60% shorter.
 */
export function formatSummarizedForPass2(summary: SummarizedObservations): string {
  if (summary.segments.length === 0) return 'No observations available.';

  const parts: string[] = [];
  parts.push(`Match observations (${summary.totalFrames} frames, ${summary.segments.length} segments, ${summary.criticalCount} critical moments, ${summary.importantCount} important moments):\n`);

  for (const seg of summary.segments) {
    if (seg.significance === 'CRITICAL' || seg.significance === 'IMPORTANT') {
      // Preserve full detail for key moments
      const obs = seg.keyObservations[0];
      parts.push(
        `[${seg.significance}] Frame ${obs.frame_index}: position=${obs.athlete_position}, ` +
        `body=${obs.athlete_body}, opponent=${obs.opponent_body}, ` +
        `contact=${obs.contact_points}, action=${obs.action}, ` +
        `visible=${obs.wrestler_visible}` +
        (obs.estimated_stance_height ? `, stance=${obs.estimated_stance_height}` : '') +
        (obs.estimated_knee_angle ? `, knees=${obs.estimated_knee_angle}` : '') +
        (obs.weight_distribution ? `, weight=${obs.weight_distribution}` : '')
      );
    } else {
      // Condensed segment
      parts.push(
        `[CONTEXT] Frames ${seg.startFrame}-${seg.endFrame}: ${seg.contextSummary}`
      );
    }
  }

  return parts.join('\n');
}

/**
 * Format raw observations in the original verbose format (for backwards compat or quick mode).
 */
export function formatRawObservations(observations: Pass1Observation[]): string {
  return observations
    .map(obs =>
      `Frame ${obs.frame_index}: position=${obs.athlete_position}, ` +
      `body=${obs.athlete_body}, opponent=${obs.opponent_body}, ` +
      `contact=${obs.contact_points}, action=${obs.action}, ` +
      `visible=${obs.wrestler_visible}, significance=${obs.significance || 'CONTEXT'}`
    )
    .join('\n');
}
