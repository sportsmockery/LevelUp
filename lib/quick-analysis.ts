// Quick Analysis Prompts — Feature 8: Tournament Quick Analysis Mode
//
// Abbreviated prompts for 30-second turnaround during tournaments.
// Key differences from full analysis:
// - 8 frames max (vs 18-20)
// - No triage step (too few frames to benefit)
// - Shorter Pass 1 prompt (no pose estimation fields)
// - Compressed Pass 2 prompt (no fatigue analysis, fewer drills)
// - Lower max_tokens limits
// - Single Pass 1 batch (8 frames in one call)

import { PASS2_RESPONSE_SCHEMA, Pass2Response } from './analysis-schema';
import { buildKnowledgeBasePrompt } from './wrestling-knowledge';

export const QUICK_MAX_FRAMES = 8;
export const QUICK_PASS1_MAX_TOKENS = 1200;
export const QUICK_PASS2_MAX_TOKENS = 2500;

type WrestlerIdInfo = {
  position_in_id_frame: 'left' | 'right';
  uniform_description: string;
  distinguishing_features: string;
};

/**
 * Build abbreviated Pass 1 prompt for quick mode.
 * Fewer output fields, more concise instructions.
 */
export function buildQuickPass1Prompt(
  athleteId?: WrestlerIdInfo,
  athletePosition?: 'left' | 'right',
): string {
  let athleteSection: string;
  if (athleteId) {
    athleteSection = `ATHLETE: ${athleteId.uniform_description} (${athleteId.position_in_id_frame} side). Features: ${athleteId.distinguishing_features}.`;
  } else if (athletePosition) {
    athleteSection = `Focus on the wrestler initially on the ${athletePosition.toUpperCase()} side.`;
  } else {
    athleteSection = 'Focus on the primary wrestler visible.';
  }

  return `Wrestling video frame observer. Describe what you see — no scoring.

${athleteSection}

Output JSON:
{
  "observations": [
    {
      "frame_index": <0-based>,
      "athlete_position": "<standing/top/bottom/transition/not_visible>",
      "athlete_body": "<brief stance/position description>",
      "contact_points": "<grips, ties, holds>",
      "action": "<technique or movement happening>",
      "wrestler_visible": <true/false>,
      "significance": "<CRITICAL/IMPORTANT/CONTEXT>"
    }
  ]
}

CRITICAL = scoring actions (takedowns, escapes, reversals, near falls)
IMPORTANT = scrambles, key transitions
CONTEXT = routine positioning

One observation per frame. Be precise and brief.`;
}

/**
 * Build abbreviated Pass 2 prompt for quick mode.
 * No fatigue analysis, fewer drill recommendations, compressed rubric.
 */
export function buildQuickPass2Prompt(
  matchStyle: string,
  frameCount: number,
  athleteId?: WrestlerIdInfo,
  athletePosition?: 'left' | 'right',
): string {
  const knowledgeBase = buildKnowledgeBasePrompt(matchStyle as any);
  const desc: string[] = [];
  if (athleteId) desc.push(athleteId.uniform_description);
  if (athletePosition) desc.push(`${athletePosition} side`);
  const colorNote = desc.length > 0 ? ` (${desc.join(', ')})` : '';

  return `You are LevelUp, an expert wrestling AI coach. Quick tournament analysis mode — be concise.

ATHLETE${colorNote}

${knowledgeBase}

INSTRUCTIONS:
1. Score each sub-criterion based on frame observations.
2. Calculate: overall = standing*0.4 + top*0.3 + bottom*0.3
3. Cite frame indices as evidence.
4. List top 2 strengths and top 2 weaknesses.
5. Recommend 2 priority drills.
6. Set confidence based on visibility and position variety.
7. For fatigue_analysis: set all fields to default (first_half_score=0, second_half_score=0, conditioning_flag=false, notes="Quick mode - fatigue analysis skipped").
8. For match_result: estimate if possible, otherwise set result="unknown".

${frameCount} frames analyzed. Quick mode — focus on key moments.`;
}

/**
 * Quick analysis schema — same as full but we set lower expectations.
 * We reuse PASS2_RESPONSE_SCHEMA since the output structure is identical.
 */
export const QUICK_PASS2_SCHEMA = PASS2_RESPONSE_SCHEMA;

/**
 * Select up to QUICK_MAX_FRAMES from a larger frame set.
 * Strategy: keep first, last, and evenly sample the middle.
 * Prefer frames at position changes if triage data is available.
 */
export function selectQuickFrames(
  frames: string[],
  maxFrames: number = QUICK_MAX_FRAMES,
): { frames: string[]; originalIndices: number[] } {
  if (frames.length <= maxFrames) {
    return {
      frames: [...frames],
      originalIndices: frames.map((_, i) => i),
    };
  }

  const indices: number[] = [0]; // Always first
  const step = (frames.length - 1) / (maxFrames - 1);
  for (let i = 1; i < maxFrames - 1; i++) {
    indices.push(Math.round(i * step));
  }
  indices.push(frames.length - 1); // Always last

  // Deduplicate indices
  const unique = [...new Set(indices)].sort((a, b) => a - b);

  return {
    frames: unique.map(i => frames[i]),
    originalIndices: unique,
  };
}
