// Temporal Action Detection — Gap 3
//
// Groups Pass 1 frame observations into action windows with start/peak/end.
// Detects when actions begin, reach their peak intensity, and conclude.
// Feeds temporal segments into Pass 2 for more accurate scoring.
//
// Architecture:
//   Pass 1 observations → Group by position/action continuity
//   → Identify action boundaries (position changes, significance spikes)
//   → Annotate peak frames within each window
//   → Produce temporal summary for Pass 2 context

export type ActionWindow = {
  id: number;
  start_frame: number;
  end_frame: number;
  peak_frame: number;           // Frame with highest significance in this window
  duration_frames: number;
  position: string;             // Dominant position during this window
  action_type: ActionType;
  significance: 'critical' | 'important' | 'context';
  techniques: string[];         // Unique techniques observed
  scoring_event: boolean;       // Whether a scoring action occurred
  description: string;          // Auto-generated summary
};

export type ActionType =
  | 'takedown_attempt'
  | 'takedown_defense'
  | 'riding_sequence'
  | 'escape_attempt'
  | 'reversal_attempt'
  | 'scramble'
  | 'neutral_exchange'
  | 'near_fall'
  | 'transition'
  | 'reset'
  | 'unknown';

export type TemporalSummary = {
  total_windows: number;
  scoring_windows: number;
  position_distribution: Record<string, { windows: number; total_frames: number }>;
  action_type_counts: Record<ActionType, number>;
  match_phases: MatchPhase[];
  tempo: 'high' | 'medium' | 'low';
  tempo_changes: Array<{ frame: number; from: string; to: string }>;
};

export type MatchPhase = {
  phase: number;
  start_frame: number;
  end_frame: number;
  dominant_position: string;
  intensity: 'high' | 'medium' | 'low';
  scoring_events: number;
  description: string;
};

type Observation = {
  frame_index: number;
  athlete_position?: string;
  action?: string;
  significance?: string;
  wrestler_visible?: boolean;
  contact_points?: string;
  estimated_stance_height?: string;
  relative_position?: string;
};

// Significance weight for peak frame detection
const SIGNIFICANCE_WEIGHT: Record<string, number> = {
  CRITICAL: 4,
  IMPORTANT: 2,
  CONTEXT: 1,
  SKIP: 0,
};

// Keywords that indicate specific action types
const ACTION_KEYWORDS: Record<ActionType, string[]> = {
  takedown_attempt: ['shot', 'takedown', 'single leg', 'double leg', 'high crotch', 'fireman', 'ankle pick', 'duck under', 'arm drag', 'snap down', 'level change'],
  takedown_defense: ['sprawl', 'whizzer', 'front headlock', 'crossface', 'defense'],
  riding_sequence: ['ride', 'riding', 'tight waist', 'half nelson', 'leg ride', 'breakdown', 'chest-to-back', 'spiral'],
  escape_attempt: ['escape', 'standup', 'stand-up', 'sit-out', 'switch', 'granby', 'hand control'],
  reversal_attempt: ['reversal', 'roll-through', 'peterson'],
  scramble: ['scramble', 'chaos', 'transition', 'both wrestlers'],
  neutral_exchange: ['circling', 'hand fight', 'tie', 'collar tie', 'underhook', 'neutral'],
  near_fall: ['near fall', 'back points', 'tilt', 'cradle', 'pin', 'back exposure'],
  transition: ['getting up', 'moving', 'position change'],
  reset: ['reset', 'referee', 'whistle', 'center', 'break'],
  unknown: [],
};

/**
 * Detect action windows from Pass 1 observations.
 * Groups consecutive frames with similar position/action into coherent windows.
 */
export function detectActionWindows(observations: Observation[]): ActionWindow[] {
  if (observations.length === 0) return [];

  // Sort by frame index
  const sorted = [...observations].sort((a, b) => a.frame_index - b.frame_index);

  const windows: ActionWindow[] = [];
  let currentWindow: {
    startIdx: number;
    frames: Observation[];
    position: string;
  } | null = null;

  for (const obs of sorted) {
    const position = obs.athlete_position || 'unknown';
    const significance = (obs.significance || 'CONTEXT').toUpperCase();

    // Start new window if:
    // 1. No current window
    // 2. Position changed (standing → top, etc.)
    // 3. Gap of >2 frames (non-consecutive)
    // 4. Significance jumps from low to CRITICAL (new action started)
    const shouldStartNew = !currentWindow
      || position !== currentWindow.position
      || (obs.frame_index - currentWindow.frames[currentWindow.frames.length - 1].frame_index > 2)
      || (significance === 'CRITICAL' && currentWindow.frames.length > 0
        && (currentWindow.frames[currentWindow.frames.length - 1].significance || 'CONTEXT').toUpperCase() !== 'CRITICAL');

    if (shouldStartNew) {
      // Close current window
      if (currentWindow && currentWindow.frames.length > 0) {
        windows.push(buildWindow(windows.length, currentWindow.frames, currentWindow.position));
      }
      currentWindow = { startIdx: obs.frame_index, frames: [obs], position };
    } else {
      currentWindow!.frames.push(obs);
    }
  }

  // Close final window
  if (currentWindow && currentWindow.frames.length > 0) {
    windows.push(buildWindow(windows.length, currentWindow.frames, currentWindow.position));
  }

  return windows;
}

function buildWindow(id: number, frames: Observation[], position: string): ActionWindow {
  // Find peak frame (highest significance)
  let peakIdx = frames[0].frame_index;
  let peakWeight = 0;
  for (const f of frames) {
    const weight = SIGNIFICANCE_WEIGHT[(f.significance || 'CONTEXT').toUpperCase()] ?? 1;
    if (weight > peakWeight) {
      peakWeight = weight;
      peakIdx = f.frame_index;
    }
  }

  // Determine action type from keywords
  const allActions = frames.map(f => (f.action || '').toLowerCase()).join(' ');
  const allContacts = frames.map(f => (f.contact_points || '').toLowerCase()).join(' ');
  const combinedText = `${allActions} ${allContacts}`;
  const actionType = classifyActionType(combinedText, position);

  // Collect unique techniques
  const techniques = [...new Set(
    frames
      .map(f => f.action || '')
      .filter(a => a.length > 0 && a !== 'unknown')
  )];

  // Determine significance level
  const maxSig = Math.max(...frames.map(f =>
    SIGNIFICANCE_WEIGHT[(f.significance || 'CONTEXT').toUpperCase()] ?? 1
  ));
  const significance: ActionWindow['significance'] =
    maxSig >= 4 ? 'critical' : maxSig >= 2 ? 'important' : 'context';

  // Detect scoring event
  const scoringKeywords = ['takedown', 'escape', 'reversal', 'near fall', 'pin', 'points'];
  const scoring = scoringKeywords.some(k => combinedText.includes(k));

  // Auto-generate description
  const description = buildWindowDescription(actionType, techniques, frames.length, scoring);

  return {
    id,
    start_frame: frames[0].frame_index,
    end_frame: frames[frames.length - 1].frame_index,
    peak_frame: peakIdx,
    duration_frames: frames.length,
    position,
    action_type: actionType,
    significance,
    techniques,
    scoring_event: scoring,
    description,
  };
}

function classifyActionType(text: string, position: string): ActionType {
  // Check each action type's keywords
  const scores: Array<{ type: ActionType; score: number }> = [];

  for (const [type, keywords] of Object.entries(ACTION_KEYWORDS)) {
    const matchCount = keywords.filter(k => text.includes(k)).length;
    if (matchCount > 0) {
      scores.push({ type: type as ActionType, score: matchCount });
    }
  }

  if (scores.length > 0) {
    scores.sort((a, b) => b.score - a.score);
    return scores[0].type;
  }

  // Fallback: infer from position
  if (position === 'top') return 'riding_sequence';
  if (position === 'bottom') return 'escape_attempt';
  if (position === 'standing') return 'neutral_exchange';
  if (position === 'transition') return 'scramble';
  return 'unknown';
}

function buildWindowDescription(
  actionType: ActionType,
  techniques: string[],
  frameCount: number,
  scoring: boolean,
): string {
  const typeLabels: Record<ActionType, string> = {
    takedown_attempt: 'Takedown attempt',
    takedown_defense: 'Takedown defense',
    riding_sequence: 'Riding/control sequence',
    escape_attempt: 'Escape attempt',
    reversal_attempt: 'Reversal attempt',
    scramble: 'Scramble sequence',
    neutral_exchange: 'Neutral exchange',
    near_fall: 'Near fall attempt',
    transition: 'Position transition',
    reset: 'Reset/break',
    unknown: 'Wrestling action',
  };

  let desc = `${typeLabels[actionType]} (${frameCount} frames)`;
  if (techniques.length > 0) {
    desc += `: ${techniques.slice(0, 3).join(', ')}`;
  }
  if (scoring) desc += ' [SCORING]';
  return desc;
}

/**
 * Build temporal summary from action windows.
 * Provides high-level match structure for Pass 2 context.
 */
export function buildTemporalSummary(windows: ActionWindow[], totalFrames: number): TemporalSummary {
  // Position distribution
  const positionDist: Record<string, { windows: number; total_frames: number }> = {};
  for (const w of windows) {
    if (!positionDist[w.position]) {
      positionDist[w.position] = { windows: 0, total_frames: 0 };
    }
    positionDist[w.position].windows++;
    positionDist[w.position].total_frames += w.duration_frames;
  }

  // Action type counts
  const actionCounts: Record<ActionType, number> = {} as Record<ActionType, number>;
  for (const w of windows) {
    actionCounts[w.action_type] = (actionCounts[w.action_type] || 0) + 1;
  }

  // Match phases: divide into 3 phases (early/middle/late)
  const phases: MatchPhase[] = [];
  if (windows.length >= 3) {
    const third = Math.ceil(windows.length / 3);
    for (let p = 0; p < 3; p++) {
      const phaseWindows = windows.slice(p * third, (p + 1) * third);
      if (phaseWindows.length === 0) continue;

      const positionCounts: Record<string, number> = {};
      let scoringCount = 0;
      for (const w of phaseWindows) {
        positionCounts[w.position] = (positionCounts[w.position] || 0) + w.duration_frames;
        if (w.scoring_event) scoringCount++;
      }

      const dominantPosition = Object.entries(positionCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'standing';

      const criticalCount = phaseWindows.filter(w => w.significance === 'critical').length;
      const intensity: MatchPhase['intensity'] =
        criticalCount >= phaseWindows.length * 0.4 ? 'high'
        : criticalCount >= phaseWindows.length * 0.15 ? 'medium'
        : 'low';

      phases.push({
        phase: p + 1,
        start_frame: phaseWindows[0].start_frame,
        end_frame: phaseWindows[phaseWindows.length - 1].end_frame,
        dominant_position: dominantPosition,
        intensity,
        scoring_events: scoringCount,
        description: `Phase ${p + 1}: ${intensity} intensity, primarily ${dominantPosition}, ${scoringCount} scoring events`,
      });
    }
  }

  // Overall tempo
  const scoringWindows = windows.filter(w => w.scoring_event).length;
  const tempo: TemporalSummary['tempo'] =
    scoringWindows >= windows.length * 0.3 ? 'high'
    : scoringWindows >= windows.length * 0.1 ? 'medium'
    : 'low';

  // Tempo changes: detect where intensity shifts
  const tempoChanges: TemporalSummary['tempo_changes'] = [];
  for (let i = 1; i < windows.length; i++) {
    const prevSig = windows[i - 1].significance;
    const currSig = windows[i].significance;
    if (prevSig !== currSig && (prevSig === 'critical' || currSig === 'critical')) {
      tempoChanges.push({
        frame: windows[i].start_frame,
        from: prevSig,
        to: currSig,
      });
    }
  }

  return {
    total_windows: windows.length,
    scoring_windows: scoringWindows,
    position_distribution: positionDist,
    action_type_counts: actionCounts,
    match_phases: phases,
    tempo,
    tempo_changes: tempoChanges,
  };
}

/**
 * Format temporal analysis as text context for Pass 2 prompt injection.
 */
export function formatTemporalContext(
  windows: ActionWindow[],
  summary: TemporalSummary,
): string {
  const lines: string[] = ['\nTEMPORAL ACTION ANALYSIS:'];

  // Match structure overview
  lines.push(`Match tempo: ${summary.tempo} | ${summary.total_windows} action windows | ${summary.scoring_windows} scoring events`);

  // Position time distribution
  const posDist = Object.entries(summary.position_distribution)
    .sort(([, a], [, b]) => b.total_frames - a.total_frames)
    .map(([pos, data]) => `${pos}: ${data.total_frames} frames (${data.windows} sequences)`)
    .join(', ');
  lines.push(`Position distribution: ${posDist}`);

  // Match phases
  for (const phase of summary.match_phases) {
    lines.push(`  ${phase.description}`);
  }

  // Key action windows (critical + important only)
  const keyWindows = windows
    .filter(w => w.significance === 'critical' || w.significance === 'important')
    .slice(0, 15);

  if (keyWindows.length > 0) {
    lines.push('\nKey action sequences:');
    for (const w of keyWindows) {
      lines.push(`  Frames ${w.start_frame}-${w.end_frame} (peak: ${w.peak_frame}): ${w.description}`);
    }
  }

  // Tempo changes
  if (summary.tempo_changes.length > 0) {
    lines.push('\nTempo shifts:');
    for (const tc of summary.tempo_changes) {
      lines.push(`  Frame ${tc.frame}: intensity ${tc.from} → ${tc.to}`);
    }
  }

  return lines.join('\n');
}
