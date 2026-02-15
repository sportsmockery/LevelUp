// Frame Triage Pre-Filter — Gap 1: Sport-Specific Vision Model
//
// Uses GPT-4o-mini to quickly classify frames before the full GPT-4o analysis.
// Identifies non-action frames (referee breaks, resets, celebrations) and pre-labels
// wrestling positions (standing/top/bottom) to reduce GPT-4o token usage by ~40%.
//
// Architecture:
//   Mobile extracts N frames → Triage classifies each → Non-action frames filtered
//   → Remaining frames sent to Pass 1 (GPT-4o) with pre-labels attached
//
// Cost: ~$0.001-0.003 per frame (GPT-4o-mini) vs $0.01-0.03 per frame (GPT-4o)

import OpenAI from 'openai';

export type FrameClassification =
  | 'wrestling_action'   // Active wrestling (shots, scrambles, riding, escapes)
  | 'transition'         // Between positions, getting up, resetting on mat
  | 'neutral_stance'     // Standing, hand-fighting, circling
  | 'no_action'          // Referee break, celebration, walking, crowd shot
  | 'unclear';           // Cannot determine (blurry, obstructed)

export type TriageResult = {
  frame_index: number;
  classification: FrameClassification;
  position: 'standing' | 'top' | 'bottom' | 'transition' | 'unknown';
  action_intensity: 'high' | 'medium' | 'low' | 'none';
  include_in_analysis: boolean;
};

export type TriageSummary = {
  total_frames: number;
  included_frames: number;
  filtered_frames: number;
  classification_counts: Record<FrameClassification, number>;
  triage_duration_ms: number;
};

const TRIAGE_BATCH_SIZE = 8; // More frames per batch since triage is lightweight

const TRIAGE_SYSTEM_PROMPT = `You are a wrestling video frame classifier. For each frame, quickly determine:
1. Is there active wrestling happening?
2. What position are the wrestlers in?
3. How intense is the action?

Output JSON:
{
  "classifications": [
    {
      "frame_index": <number>,
      "classification": "<wrestling_action|transition|neutral_stance|no_action|unclear>",
      "position": "<standing|top|bottom|transition|unknown>",
      "action_intensity": "<high|medium|low|none>"
    }
  ]
}

Classification guide:
- wrestling_action: Takedowns, scrambles, riding, escapes, pins, any physical wrestling contact
- transition: Moving between positions, getting up from mat, ref's position
- neutral_stance: Both wrestlers standing, hand-fighting, circling, no active attack
- no_action: Referee stoppage, celebration, walking to center, crowd/scoreboard, pre/post match
- unclear: Blurry, obstructed view, cannot determine

Position guide:
- standing: Both wrestlers on their feet
- top: One wrestler controlling from top position (riding)
- bottom: One wrestler on bottom being controlled
- transition: Changing between positions (scramble, stand-up in progress)
- unknown: Cannot determine

Be fast and accurate. Do NOT overthink — this is a quick classification, not detailed analysis.`;

/**
 * Classify frames using GPT-4o-mini for quick triage before full analysis.
 * Returns classification for each frame and a summary of filtering results.
 */
export async function triageFrames(
  openai: OpenAI,
  frames: string[],
  options?: {
    /** Minimum action intensity to include. Default: 'low' (includes low/medium/high) */
    minIntensity?: 'high' | 'medium' | 'low' | 'none';
    /** Always include first and last N frames regardless of classification. Default: 2 */
    alwaysIncludeEdgeFrames?: number;
    /** Maximum frames to keep after triage. Default: no limit */
    maxOutputFrames?: number;
  },
): Promise<{ results: TriageResult[]; summary: TriageSummary }> {
  const startTime = Date.now();
  const minIntensity = options?.minIntensity ?? 'low';
  const edgeFrames = options?.alwaysIncludeEdgeFrames ?? 2;

  // Build batches
  const batches: Array<{ startIdx: number; frames: string[] }> = [];
  for (let i = 0; i < frames.length; i += TRIAGE_BATCH_SIZE) {
    batches.push({
      startIdx: i,
      frames: frames.slice(i, i + TRIAGE_BATCH_SIZE),
    });
  }

  // Process all batches in parallel
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const frameContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

      batch.frames.forEach((frame, i) => {
        const globalIdx = batch.startIdx + i;
        frameContent.push({
          type: 'text' as const,
          text: `[Frame ${globalIdx}]`,
        });
        frameContent.push({
          type: 'image_url' as const,
          image_url: {
            url: frame.startsWith('data:') ? frame : `data:image/jpeg;base64,${frame}`,
            detail: 'low' as const, // Low detail for triage — much cheaper
          },
        });
      });

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Classify these ${batch.frames.length} wrestling video frames (indices ${batch.startIdx} to ${batch.startIdx + batch.frames.length - 1}).`,
                },
                ...frameContent,
              ],
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 500,
          temperature: 0,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return [];

        const parsed = JSON.parse(content);
        return (parsed.classifications || []) as Array<{
          frame_index: number;
          classification: FrameClassification;
          position: string;
          action_intensity: string;
        }>;
      } catch {
        // On triage failure, include all frames in this batch (fail-open)
        return batch.frames.map((_, i) => ({
          frame_index: batch.startIdx + i,
          classification: 'wrestling_action' as FrameClassification,
          position: 'unknown',
          action_intensity: 'medium',
        }));
      }
    }),
  );

  // Flatten and build results
  const allClassifications = batchResults.flat();

  // Intensity threshold map
  const intensityOrder: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };
  const minIntensityValue = intensityOrder[minIntensity] ?? 1;

  const results: TriageResult[] = frames.map((_, idx) => {
    const cls = allClassifications.find((c) => c.frame_index === idx);
    const classification = cls?.classification ?? 'unclear';
    const position = (cls?.position ?? 'unknown') as TriageResult['position'];
    const actionIntensity = (cls?.action_intensity ?? 'medium') as TriageResult['action_intensity'];

    // Determine inclusion
    const isEdgeFrame = idx < edgeFrames || idx >= frames.length - edgeFrames;
    const meetsIntensityThreshold = (intensityOrder[actionIntensity] ?? 1) >= minIntensityValue;
    const isActionFrame = classification !== 'no_action' && classification !== 'unclear';

    const include = isEdgeFrame || (isActionFrame && meetsIntensityThreshold);

    return {
      frame_index: idx,
      classification,
      position,
      action_intensity: actionIntensity,
      include_in_analysis: include,
    };
  });

  // Apply max output frames cap if specified
  if (options?.maxOutputFrames && results.filter((r) => r.include_in_analysis).length > options.maxOutputFrames) {
    // Keep edge frames, then prioritize by intensity
    const included = results.filter((r) => r.include_in_analysis);
    included.sort((a, b) => {
      // Edge frames first
      const aEdge = a.frame_index < edgeFrames || a.frame_index >= frames.length - edgeFrames;
      const bEdge = b.frame_index < edgeFrames || b.frame_index >= frames.length - edgeFrames;
      if (aEdge && !bEdge) return -1;
      if (!aEdge && bEdge) return 1;
      // Then by intensity
      return (intensityOrder[b.action_intensity] ?? 0) - (intensityOrder[a.action_intensity] ?? 0);
    });

    const keepSet = new Set(included.slice(0, options.maxOutputFrames).map((r) => r.frame_index));
    for (const r of results) {
      if (!keepSet.has(r.frame_index)) {
        r.include_in_analysis = false;
      }
    }
  }

  // Build summary
  const classificationCounts: Record<FrameClassification, number> = {
    wrestling_action: 0,
    transition: 0,
    neutral_stance: 0,
    no_action: 0,
    unclear: 0,
  };
  for (const r of results) {
    classificationCounts[r.classification]++;
  }

  const summary: TriageSummary = {
    total_frames: frames.length,
    included_frames: results.filter((r) => r.include_in_analysis).length,
    filtered_frames: results.filter((r) => !r.include_in_analysis).length,
    classification_counts: classificationCounts,
    triage_duration_ms: Date.now() - startTime,
  };

  return { results, summary };
}

/**
 * Apply triage results to filter frame array.
 * Returns only frames that passed triage, along with their original indices.
 */
export function applyTriage(
  frames: string[],
  triageResults: TriageResult[],
): { filteredFrames: string[]; originalIndices: number[]; preLabels: Map<number, TriageResult> } {
  const filteredFrames: string[] = [];
  const originalIndices: number[] = [];
  const preLabels = new Map<number, TriageResult>();

  for (const result of triageResults) {
    if (result.include_in_analysis) {
      filteredFrames.push(frames[result.frame_index]);
      originalIndices.push(result.frame_index);
      preLabels.set(result.frame_index, result);
    }
  }

  return { filteredFrames, originalIndices, preLabels };
}
