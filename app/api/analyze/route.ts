import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildKnowledgeBasePrompt, TECHNIQUE_TAXONOMY, DRILL_DATABASE } from '../../../lib/wrestling-knowledge';
import { PASS2_RESPONSE_SCHEMA, OPPONENT_SCOUTING_SCHEMA, Pass2Response, OpponentScoutingResponse, FatigueAnalysis } from '../../../lib/analysis-schema';
import { supabase } from '../../../lib/supabase';
import { extractMatchStats } from '../../../lib/stats-extractor';
import { checkBadges } from '../../../lib/badge-checker';

type MatchContext = {
  weightClass?: string;
  competitionName?: string;
  roundNumber?: number;
  daysFromWeighIn?: number;
};

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
}

type MatchStyle = 'folkstyle' | 'hs_folkstyle' | 'college_folkstyle' | 'freestyle' | 'grecoRoman';
type AnalysisMode = 'athlete' | 'opponent';

// --- PASS 1: Perception-only prompt (no scoring, just observations) ---
function buildPass1Prompt(singletColor?: string): string {
  const athleteId = singletColor
    ? `Focus on the wrestler wearing the ${singletColor.toUpperCase()} singlet/uniform.`
    : 'Focus on the primary wrestler visible.';

  return `You are a wrestling video perception system. Your job is to describe EXACTLY what you see in each frame — body positions, grips, stances, movements, contact points. Do NOT score, judge, or recommend. Just observe.

${athleteId}

For each frame, output a JSON object with:
{
  "observations": [
    {
      "frame_index": <0-based>,
      "athlete_position": "<standing/top/bottom/transition/not_visible>",
      "athlete_body": "<describe stance width, knee bend, hip level, arm position, head position>",
      "opponent_body": "<describe opponent's position relative to athlete>",
      "contact_points": "<where are the wrestlers touching? grips, ties, holds>",
      "action": "<what movement/technique is happening in this frame>",
      "wrestler_visible": <true if athlete in specified singlet is clearly identifiable>,
      "significance": "<CRITICAL/IMPORTANT/CONTEXT/SKIP>"
    }
  ]
}

SIGNIFICANCE LEVELS:
- CRITICAL: Scoring actions (takedowns, escapes, reversals, near falls), points scored against, clear technique errors, exceptional execution
- IMPORTANT: Scrambles with position changes, defensive wins, key transitions between positions
- CONTEXT: Setup sequences, grip fighting establishing position, pre-shot setup
- SKIP: Routine hand fighting with no position change, resets, referee stoppages, inactivity

Be precise and literal. Describe body angles, limb positions, and spatial relationships. If you cannot see something clearly, say so.`;
}

// --- PASS 2: Reasoning prompt for athlete analysis ---
function buildPass2AthletePrompt(
  singletColor: string | undefined,
  matchStyle: MatchStyle,
  frameCount: number,
  matchContext?: MatchContext,
): string {
  const knowledgeBase = buildKnowledgeBasePrompt(matchStyle);
  const colorNote = singletColor ? ` wearing a ${singletColor} singlet` : '';

  let contextSection = '';
  if (matchContext) {
    const parts: string[] = [];
    if (matchContext.weightClass) parts.push(`Weight class: ${matchContext.weightClass}`);
    if (matchContext.competitionName) parts.push(`Competition: ${matchContext.competitionName}`);
    if (matchContext.roundNumber) parts.push(`Round/Match #: ${matchContext.roundNumber}`);
    if (matchContext.daysFromWeighIn !== undefined) parts.push(`Days from weigh-in: ${matchContext.daysFromWeighIn}`);
    if (parts.length > 0) {
      contextSection = `\nMATCH CONTEXT:\n${parts.join('\n')}\nUse this context to inform your analysis — e.g., if the athlete weighed in recently, consider whether technique degradation might be fatigue from weight cut vs. skill gaps.\n`;
    }
  }

  return `You are LevelUp, an expert youth wrestling AI coach and video analyst. You are given raw frame-by-frame observations from a wrestling match and must produce a detailed, rubric-based technical analysis.

ATHLETE: The wrestler${colorNote}.
${contextSection}
${knowledgeBase}

TECHNIQUE REFERENCE (use these terms in your analysis):
Standing offense: ${Object.keys(TECHNIQUE_TAXONOMY.standing.offense).join(', ')}
Standing defense: ${Object.keys(TECHNIQUE_TAXONOMY.standing.defense).join(', ')}
Top techniques: ${Object.keys(TECHNIQUE_TAXONOMY.top).join(', ')}
Bottom techniques: ${Object.keys(TECHNIQUE_TAXONOMY.bottom).join(', ')}

INSTRUCTIONS:
1. Read ALL frame observations carefully. Map each observation to the rubric sub-criteria.
2. Score each sub-criterion based ONLY on evidence from the observations. If a position was not observed, score it based on what limited evidence exists (do not assume zero).
3. Calculate position scores as the sum of their sub-criteria.
4. Calculate overall = standing*0.4 + top*0.3 + bottom*0.3 (round to nearest integer).
5. Cite specific frame indices as evidence for your scores.
6. Recommend drills that directly address the weaknesses found.
7. Set confidence based on: wrestler visibility across frames, variety of positions observed, video quality indicators.

SCORING ACTION TRACKING:
8. For frame_evidence actions that involve scoring, prefix with the actor:
   - "ATHLETE: Takedown (double leg)" — athlete scored
   - "OPPONENT: Takedown (single leg)" — opponent scored against
   - "ATHLETE: Escape (standup)" — athlete scored an escape
   This prefix is REQUIRED for any scoring action. Non-scoring actions do not need a prefix.
9. Count scoring actions in match_stats: takedowns_scored, takedowns_allowed, reversals_scored, escapes_scored, near_falls_scored, pins_scored.
10. Determine match_result if possible from the evidence (win/loss/draw/unknown) and result_type (pin/tech_fall/major_decision/decision/unknown).

FATIGUE DETECTION:
11. Split the frame observations into two halves (first half = early match, second half = late match).
12. Compare technique quality between first half and second half:
   - Did stance height increase (getting more upright = fatigue)?
   - Did defensive reaction times slow?
   - Did shot attempts become less explosive or less committed?
   - Did scoring rate decrease?
13. Calculate an estimated score for each half. If second_half is >10 points lower, set conditioning_flag=true.
14. Consider match context (weight cut, round number) when interpreting fatigue signs.

ANTI-HALLUCINATION RULES:
- Do NOT invent techniques that were not described in the observations.
- If the observations say "not visible" or "unclear", lower your confidence.
- Sub-scores within a position should NOT all be identical — differentiate based on evidence.
- Do NOT give round numbers (e.g., 70, 80, 90) for all sub-scores — use specific values justified by evidence.
- If you see fewer than 3 frames in a position, note this limitation in your reasoning.

The match had ${frameCount} frames analyzed.`;
}

// --- PASS 2: Reasoning prompt for opponent scouting ---
function buildPass2ScoutingPrompt(
  singletColor: string | undefined,
  matchStyle: MatchStyle,
): string {
  const knowledgeBase = buildKnowledgeBasePrompt(matchStyle);
  const colorNote = singletColor ? ` wearing a ${singletColor} singlet` : '';

  return `You are LevelUp, an expert wrestling scout and tactician. You are given raw frame-by-frame observations of an OPPONENT wrestler${colorNote} and must produce a tactical scouting report with a gameplan.

${knowledgeBase}

INSTRUCTIONS:
1. Analyze the opponent's attack patterns — what techniques they use most, how they set them up, how effective they are.
2. Analyze their defense patterns — how they react to attacks, their sprawl quality, their counter-wrestling.
3. Identify their position preferences and tendencies (do they prefer standing? Are they dangerous on top?).
4. Look for conditioning indicators — do they slow down in later frames? Is their technique deteriorating?
5. Build a period-by-period gameplan for how to beat this opponent.
6. Recommend specific counter-techniques for their primary attacks.

Be specific and tactical. This scouting report will be used by a wrestler preparing for a match against this opponent.`;
}

// --- Hallucination detection & validation ---
function detectHallucinations(result: Pass2Response, frameCount: number): string[] {
  const warnings: string[] = [];

  const { standing, top, bottom } = result.position_scores;

  // 1. Identical position scores
  if (standing === top && top === bottom) {
    warnings.push('All position scores are identical — possible hallucination');
  }

  // 2. All-round-number sub-scores
  const allSubScores = [
    ...Object.values(result.sub_scores.standing),
    ...Object.values(result.sub_scores.top),
    ...Object.values(result.sub_scores.bottom),
  ];
  const roundCount = allSubScores.filter((s) => s % 5 === 0).length;
  if (roundCount === allSubScores.length) {
    warnings.push('All sub-scores are round numbers (multiples of 5) — possible lack of differentiation');
  }

  // 3. Missing frame evidence
  if (result.frame_evidence.length === 0) {
    warnings.push('No frame evidence provided — analysis may not be grounded in observations');
  }

  // 4. Confidence vs evidence mismatch
  if (result.confidence > 0.8 && result.frame_evidence.length < 5) {
    warnings.push('High confidence with few frame evidence citations — may be overconfident');
  }

  // 5. Verify overall score calculation
  const expectedOverall = Math.round(standing * 0.4 + top * 0.3 + bottom * 0.3);
  if (Math.abs(result.overall_score - expectedOverall) > 3) {
    warnings.push(`Overall score ${result.overall_score} doesn't match calculated ${expectedOverall}`);
    result.overall_score = expectedOverall; // Auto-correct
  }

  // 6. Frame index bounds check
  for (const fe of result.frame_evidence) {
    if (fe.frame_index < 0 || fe.frame_index >= frameCount) {
      warnings.push(`Frame evidence references invalid index ${fe.frame_index} (valid: 0-${frameCount - 1})`);
      fe.frame_index = Math.max(0, Math.min(fe.frame_index, frameCount - 1)); // Clamp
    }
  }

  // 7. Sub-score bounds check (standing: 0-20 each, top/bottom: 0-25 each)
  const standingMax = 20;
  const tbMax = 25;
  for (const [key, val] of Object.entries(result.sub_scores.standing)) {
    if (val < 0 || val > standingMax) {
      warnings.push(`Standing sub-score ${key}=${val} out of range 0-${standingMax}`);
      (result.sub_scores.standing as Record<string, number>)[key] = Math.max(0, Math.min(val, standingMax));
    }
  }
  for (const [key, val] of Object.entries(result.sub_scores.top)) {
    if (val < 0 || val > tbMax) {
      warnings.push(`Top sub-score ${key}=${val} out of range 0-${tbMax}`);
      (result.sub_scores.top as Record<string, number>)[key] = Math.max(0, Math.min(val, tbMax));
    }
  }
  for (const [key, val] of Object.entries(result.sub_scores.bottom)) {
    if (val < 0 || val > tbMax) {
      warnings.push(`Bottom sub-score ${key}=${val} out of range 0-${tbMax}`);
      (result.sub_scores.bottom as Record<string, number>)[key] = Math.max(0, Math.min(val, tbMax));
    }
  }

  // 8. Position score vs sub-score sum validation
  const standingSum = Object.values(result.sub_scores.standing).reduce((a, b) => a + b, 0);
  if (Math.abs(standing - standingSum) > 5) {
    warnings.push(`Standing score ${standing} doesn't match sub-score sum ${standingSum}`);
    result.position_scores.standing = standingSum;
  }
  const topSum = Object.values(result.sub_scores.top).reduce((a, b) => a + b, 0);
  if (Math.abs(top - topSum) > 5) {
    warnings.push(`Top score ${top} doesn't match sub-score sum ${topSum}`);
    result.position_scores.top = topSum;
  }
  const bottomSum = Object.values(result.sub_scores.bottom).reduce((a, b) => a + b, 0);
  if (Math.abs(bottom - bottomSum) > 5) {
    warnings.push(`Bottom score ${bottom} doesn't match sub-score sum ${bottomSum}`);
    result.position_scores.bottom = bottomSum;
  }

  // Recalculate overall after potential corrections
  if (warnings.length > 0) {
    const correctedOverall = Math.round(
      result.position_scores.standing * 0.4 +
      result.position_scores.top * 0.3 +
      result.position_scores.bottom * 0.3
    );
    result.overall_score = correctedOverall;
  }

  // 9. Technique taxonomy check: warn if actions use non-standard terms
  const knownActions = new Set([
    'takedown', 'escape', 'reversal', 'near fall', 'sprawl', 'shot', 'single leg', 'double leg',
    'high crotch', 'duck under', 'arm drag', 'snap down', 'front headlock', 'half nelson',
    'tilt', 'cradle', 'standup', 'sit-out', 'switch', 'granby', 'leg ride', 'tight waist',
    'breakdown', 'mat return', 'whizzer', 'hand fighting', 'neutral', 'transition', 'scramble',
    'fireman', 'hip toss', 'body lock', 'suplex', 'gut wrench', 'ankle pick', 'head-and-arm',
  ]);
  const unknownActions: string[] = [];
  for (const fe of result.frame_evidence) {
    const actionLower = fe.action.toLowerCase();
    const hasKnown = [...knownActions].some((k) => actionLower.includes(k));
    if (!hasKnown && fe.action !== 'Frame not analyzed') {
      unknownActions.push(fe.action);
    }
  }
  if (unknownActions.length > result.frame_evidence.length * 0.5) {
    warnings.push(`Over half of frame actions use non-standard terms: ${unknownActions.slice(0, 3).join(', ')}`);
  }

  return warnings;
}

// --- Fire-and-forget Supabase persistence ---
async function saveToSupabase(
  pass2Result: Pass2Response,
  normalized: Record<string, unknown>,
  matchStyle: string,
  matchContext?: MatchContext,
): Promise<void> {
  if (!supabase) return;

  const athleteId = '00000000-0000-0000-0000-000000000000'; // Placeholder until auth is integrated
  const stats = extractMatchStats(pass2Result);
  const badges = checkBadges(pass2Result, 1); // analysisCount would come from a count query

  try {
    const results = await Promise.allSettled([
      // 1. Insert match analysis
      supabase.from('match_analyses').insert({
        athlete_id: athleteId,
        overall_score: pass2Result.overall_score,
        standing: pass2Result.position_scores.standing,
        top: pass2Result.position_scores.top,
        bottom: pass2Result.position_scores.bottom,
        confidence: pass2Result.confidence,
        sub_scores: pass2Result.sub_scores,
        match_result: pass2Result.match_result?.result,
        result_type: pass2Result.match_result?.result_type,
        match_duration_sec: pass2Result.match_result?.match_duration_seconds,
        takedowns_scored: stats.takedowns_scored,
        takedowns_allowed: stats.takedowns_allowed,
        reversals_scored: stats.reversals_scored,
        escapes_scored: stats.escapes_scored,
        near_falls_scored: stats.near_falls_scored,
        pins_scored: stats.pins_scored,
        weight_class: matchContext?.weightClass,
        competition_name: matchContext?.competitionName,
        match_style: matchStyle,
        strengths: pass2Result.strengths,
        weaknesses: pass2Result.weaknesses,
        analysis_json: normalized,
        fatigue_flag: pass2Result.fatigue_analysis.conditioning_flag,
        first_half_score: pass2Result.fatigue_analysis.first_half_score,
        second_half_score: pass2Result.fatigue_analysis.second_half_score,
      }).select('id').single(),
    ]);

    const analysisInsert = results[0];
    if (analysisInsert.status === 'fulfilled' && analysisInsert.value.data?.id) {
      const analysisId = analysisInsert.value.data.id;

      // Fire remaining inserts in parallel, all non-blocking
      await Promise.allSettled([
        // 2. Insert drill assignments
        ...pass2Result.drills.map((drill) =>
          supabase.from('drill_assignments').insert({
            analysis_id: analysisId,
            athlete_id: athleteId,
            drill_name: drill.name,
            drill_desc: drill.description,
            reps: drill.reps,
            priority: drill.priority,
            addresses: drill.addresses,
          })
        ),
        // 3. Insert earned badges (upsert to avoid duplicates)
        ...badges.map((badge) =>
          supabase.from('badges').upsert({
            athlete_id: athleteId,
            badge_key: badge.key,
            badge_label: badge.label,
            badge_icon: badge.icon,
            analysis_id: analysisId,
          }, { onConflict: 'athlete_id,badge_key' })
        ),
        // 4. Insert level history entry
        supabase.from('level_history').insert({
          athlete_id: athleteId,
          event_type: 'analysis',
          title: `Scored ${pass2Result.overall_score}`,
          subtitle: `${matchStyle} analysis completed`,
          analysis_id: analysisId,
        }),
      ]);
    }

    console.log(`[LevelUp] Supabase save: ${results.filter((r) => r.status === 'fulfilled').length}/${results.length} succeeded`);
  } catch (err) {
    // Non-blocking — Supabase errors should not affect the client response
    console.warn('[LevelUp] Supabase save failed (non-blocking):', err);
  }
}

// --- Normalize enriched response to backwards-compatible format ---
function normalizeResponse(
  pass2: Pass2Response,
  frameCount: number,
  mode: 'athlete',
  displayFrameIndices?: Set<number>,
): Record<string, unknown>;
function normalizeResponse(
  pass2: OpponentScoutingResponse,
  frameCount: number,
  mode: 'opponent',
  displayFrameIndices?: Set<number>,
): Record<string, unknown>;
function normalizeResponse(
  pass2: Pass2Response | OpponentScoutingResponse,
  frameCount: number,
  mode: AnalysisMode,
  displayFrameIndices?: Set<number>,
): Record<string, unknown> {
  if (mode === 'opponent') {
    const scouting = pass2 as OpponentScoutingResponse;
    return {
      overall_score: 0,
      position_scores: { standing: 0, top: 0, bottom: 0 },
      position_reasoning: scouting.position_tendencies,
      frame_annotations: [],
      strengths: scouting.attack_patterns.map((a) => `${a.technique} (${a.frequency})`),
      weaknesses: scouting.defense_patterns.map((d) => d.vulnerability),
      drills: scouting.gameplan.key_techniques,
      summary: scouting.summary,
      xp: 150,
      model: 'gpt-4o-2pass',
      framesAnalyzed: frameCount,
      scouting,
    };
  }

  const athlete = pass2 as Pass2Response;

  // Build backwards-compatible frame_annotations from frame_evidence
  // Only include display frames (Tier 3) if displayFrameIndices is provided
  const evidenceToUse = displayFrameIndices
    ? athlete.frame_evidence.filter((fe) => displayFrameIndices.has(fe.frame_index))
    : athlete.frame_evidence;

  const frameAnnotations = evidenceToUse.map((fe) => ({
    frame_number: fe.frame_index + 1,
    position: fe.position,
    action: fe.action,
    is_key_moment: fe.is_key_moment,
    ...(fe.key_moment_type && fe.key_moment_type !== '' ? { key_moment_type: fe.key_moment_type } : {}),
    detail: fe.detail,
    wrestler_visible: fe.wrestler_visible,
    rubric_impact: fe.rubric_impact || undefined,
    confidence: fe.wrestler_visible ? athlete.confidence : athlete.confidence * 0.5,
  }));

  // Pad remaining frames as "not analyzed"
  while (frameAnnotations.length < frameCount) {
    const idx = frameAnnotations.length;
    frameAnnotations.push({
      frame_number: idx + 1,
      position: 'other',
      action: 'Frame not analyzed',
      is_key_moment: false,
      detail: 'This frame was not selected as key evidence.',
      wrestler_visible: false,
      rubric_impact: undefined,
      confidence: 0,
    });
  }

  // Flatten drills to string array for backwards compat
  const flatDrills = athlete.drills.map((d) => `${d.name}: ${d.reps} — ${d.description}`);

  return {
    overall_score: athlete.overall_score,
    position_scores: athlete.position_scores,
    position_reasoning: athlete.position_reasoning,
    frame_annotations: frameAnnotations,
    strengths: athlete.strengths,
    weaknesses: athlete.weaknesses,
    drills: flatDrills,
    summary: athlete.summary,
    xp: 150,
    model: 'gpt-4o',
    framesAnalyzed: frameCount,
    match_result: athlete.match_result,
    match_stats: athlete.match_stats,
    enriched: {
      confidence: athlete.confidence,
      sub_scores: athlete.sub_scores,
      frame_evidence: athlete.frame_evidence,
      drills: athlete.drills,
      fatigue_analysis: athlete.fatigue_analysis,
    },
  };
}

// Allow up to 180s for two-pass analysis
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  try {
    const { frames, singletColor, referencePhoto, matchStyle = 'folkstyle', mode = 'athlete', matchContext } = await request.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: 'No frames provided. Send base64 image frames.' },
        { status: 400 }
      );
    }

    const validMatchStyle: MatchStyle = ['folkstyle', 'hs_folkstyle', 'college_folkstyle', 'freestyle', 'grecoRoman'].includes(matchStyle) ? matchStyle : 'hs_folkstyle';
    const validMode: AnalysisMode = mode === 'opponent' ? 'opponent' : 'athlete';

    const validMatchContext: MatchContext | undefined = matchContext && typeof matchContext === 'object' ? matchContext : undefined;

    console.log(`[LevelUp] 2-Pass analysis: ${frames.length} frames, singlet=${singletColor || 'none'}, style=${validMatchStyle}, mode=${validMode}, refPhoto=${!!referencePhoto}, context=${validMatchContext ? 'yes' : 'none'}`);

    const openai = getOpenAI();

    // ===== PASS 1: Parallel perception calls =====
    const BATCH_SIZE = 5;
    const batches: string[][] = [];
    for (let i = 0; i < frames.length; i += BATCH_SIZE) {
      batches.push(frames.slice(i, i + BATCH_SIZE));
    }

    console.log(`[LevelUp] Pass 1: ${batches.length} batches of up to ${BATCH_SIZE} frames`);

    const pass1Results = await Promise.all(
      batches.map(async (batch, batchIndex) => {
        const batchStartIdx = batchIndex * BATCH_SIZE;
        const frameContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

        // Include reference photo in first batch only
        if (batchIndex === 0 && referencePhoto) {
          frameContent.push({
            type: 'text' as const,
            text: '[Reference Photo — not a match frame, use to identify the athlete]',
          });
          frameContent.push({
            type: 'image_url' as const,
            image_url: {
              url: referencePhoto.startsWith('data:') ? referencePhoto : `data:image/jpeg;base64,${referencePhoto}`,
              detail: 'low' as const,
            },
          });
        }

        batch.forEach((frame, i) => {
          const globalIdx = batchStartIdx + i;
          frameContent.push({
            type: 'text' as const,
            text: `[Frame ${globalIdx}]`,
          });
          frameContent.push({
            type: 'image_url' as const,
            image_url: {
              url: frame.startsWith('data:') ? frame : `data:image/jpeg;base64,${frame}`,
              detail: 'high' as const,
            },
          });
        });

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: buildPass1Prompt(singletColor) },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Observe these ${batch.length} frames (indices ${batchStartIdx} to ${batchStartIdx + batch.length - 1}). Describe exactly what you see in each frame.`,
                },
                ...frameContent,
              ],
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 2000,
          temperature: 0,
          seed: 42,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return { observations: [] };

        try {
          const parsed = JSON.parse(content);
          return parsed;
        } catch {
          console.warn(`[LevelUp] Pass 1 batch ${batchIndex} JSON parse failed, returning empty`);
          return { observations: [] };
        }
      })
    );

    // Merge all observations
    const allObservations = pass1Results.flatMap((r: any) => r.observations || []);
    console.log(`[LevelUp] Pass 1 complete: ${allObservations.length} frame observations collected`);

    // ===== DISPLAY FRAME SELECTION (Tier 2 → Tier 3) =====
    const SIGNIFICANCE_PRIORITY: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, CONTEXT: 2, SKIP: 3 };
    const MAX_DISPLAY_FRAMES = 20;

    // Classify observations by significance
    const classified = allObservations.map((obs: any) => ({
      ...obs,
      significance: (obs.significance || 'CONTEXT').toUpperCase(),
    }));

    const critical = classified.filter((o: any) => o.significance === 'CRITICAL');
    const important = classified.filter((o: any) => o.significance === 'IMPORTANT');
    const context = classified.filter((o: any) => o.significance === 'CONTEXT');

    // Select display frames: all CRITICAL, fill with IMPORTANT, then CONTEXT
    let displayFrameIndices = new Set<number>(critical.map((o: any) => o.frame_index));
    for (const o of important) {
      if (displayFrameIndices.size >= MAX_DISPLAY_FRAMES) break;
      displayFrameIndices.add(o.frame_index);
    }
    for (const o of context) {
      if (displayFrameIndices.size >= Math.min(MAX_DISPLAY_FRAMES, 8 + critical.length + important.length)) break;
      displayFrameIndices.add(o.frame_index);
    }
    // Ensure minimum of 8 display frames if we have enough observations
    if (displayFrameIndices.size < 8 && allObservations.length >= 8) {
      for (const o of allObservations) {
        if (displayFrameIndices.size >= 8) break;
        displayFrameIndices.add(o.frame_index);
      }
    }

    console.log(`[LevelUp] Display frames: ${displayFrameIndices.size} selected (${critical.length} critical, ${important.length} important, ${context.length} context)`);

    // ALL observations still go to Pass 2 for scoring (no data loss)
    // ===== PASS 2: Reasoning call (text-only) =====
    const observationsText = allObservations
      .map((obs: any) => `Frame ${obs.frame_index}: position=${obs.athlete_position}, body=${obs.athlete_body}, opponent=${obs.opponent_body}, contact=${obs.contact_points}, action=${obs.action}, visible=${obs.wrestler_visible}, significance=${obs.significance || 'CONTEXT'}`)
      .join('\n');

    if (validMode === 'opponent') {
      // Scouting analysis
      console.log('[LevelUp] Pass 2: Opponent scouting analysis');
      const pass2Response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: buildPass2ScoutingPrompt(singletColor, validMatchStyle) },
          {
            role: 'user',
            content: `Here are the frame-by-frame observations of the opponent:\n\n${observationsText}\n\nProduce a tactical scouting report with a gameplan to beat this opponent.`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: OPPONENT_SCOUTING_SCHEMA,
        },
        max_tokens: 4096,
        temperature: 0,
        seed: 42,
      });

      const scoutContent = pass2Response.choices[0]?.message?.content;
      if (!scoutContent) throw new Error('No response from Pass 2 scouting');

      const scoutResult: OpponentScoutingResponse = JSON.parse(scoutContent);
      const normalized = normalizeResponse(scoutResult, frames.length, 'opponent');

      console.log(`[LevelUp] Scouting complete: ${scoutResult.attack_patterns.length} attack patterns, ${scoutResult.defense_patterns.length} defense patterns`);
      return NextResponse.json(normalized);
    }

    // Athlete analysis — split observations into halves for fatigue detection
    const halfIdx = Math.floor(allObservations.length / 2);
    const firstHalfObs = allObservations.slice(0, halfIdx);
    const secondHalfObs = allObservations.slice(halfIdx);
    const periodLabel = `\n\n--- FIRST HALF (frames 0-${halfIdx - 1}, early match) ---\n${firstHalfObs.map((obs: any) => `Frame ${obs.frame_index}: position=${obs.athlete_position}, body=${obs.athlete_body}, action=${obs.action}`).join('\n')}\n\n--- SECOND HALF (frames ${halfIdx}-${allObservations.length - 1}, late match) ---\n${secondHalfObs.map((obs: any) => `Frame ${obs.frame_index}: position=${obs.athlete_position}, body=${obs.athlete_body}, action=${obs.action}`).join('\n')}`;

    console.log('[LevelUp] Pass 2: Athlete technique analysis with structured output');
    const pass2Response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildPass2AthletePrompt(singletColor, validMatchStyle, frames.length, validMatchContext) },
        {
          role: 'user',
          content: `Here are the frame-by-frame observations from the match (${frames.length} frames total):\n\n${observationsText}\n\nFor fatigue analysis, here are the observations split by match half:${periodLabel}\n\nScore this wrestler's technique using the rubric. Cite specific frame indices as evidence. Also complete the fatigue analysis comparing first half vs second half.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: PASS2_RESPONSE_SCHEMA,
      },
      max_tokens: 4096,
      temperature: 0,
      seed: 42,
    });

    const pass2Content = pass2Response.choices[0]?.message?.content;
    const usage = pass2Response.usage;
    console.log(`[LevelUp] Pass 2 responded: tokens=${usage?.total_tokens}, prompt=${usage?.prompt_tokens}, completion=${usage?.completion_tokens}`);

    if (!pass2Content) throw new Error('No response from Pass 2');

    const pass2Result: Pass2Response = JSON.parse(pass2Content);

    // Hallucination checks
    const warnings = detectHallucinations(pass2Result, frames.length);
    if (warnings.length > 0) {
      console.warn(`[LevelUp] Hallucination warnings: ${warnings.join('; ')}`);
    }

    const normalized = normalizeResponse(pass2Result, frames.length, 'athlete', displayFrameIndices);

    console.log(`[LevelUp] Analysis complete: overall=${pass2Result.overall_score}, confidence=${pass2Result.confidence}, evidence=${pass2Result.frame_evidence.length} frames`);

    // Fire-and-forget Supabase save — client gets response immediately
    saveToSupabase(pass2Result, normalized, validMatchStyle, validMatchContext).catch((err) =>
      console.warn('[LevelUp] Supabase background save failed:', err)
    );

    return NextResponse.json(normalized);

  } catch (error: any) {
    console.error('Analysis error:', error);

    if (error?.status === 401 || error?.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid API key. Check OPENAI_API_KEY in Vercel environment variables.' },
        { status: 401 }
      );
    }

    // Fallback mock response so the UX never breaks
    const mockPositions = ['standing', 'standing', 'transition', 'top', 'top', 'top', 'bottom', 'bottom', 'standing', 'standing'];
    const mockActions = [
      'Neutral stance hand fighting',
      'Level change shot attempt',
      'Scramble to top position',
      'Riding with tight waist',
      'Half nelson turn attempt',
      'Mat return after standup',
      'Building base on bottom',
      'Standup escape attempt',
      'Return to neutral stance',
      'Post-whistle reset',
    ];
    const mockKeyMoments = [false, true, true, false, true, false, false, true, false, false];
    const mockKeyTypes = [undefined, 'takedown', undefined, undefined, 'near_fall', undefined, undefined, 'escape', undefined, undefined];

    const frameCount = (frames && Array.isArray(frames)) ? frames.length : 10;
    const mockAnnotations = Array.from({ length: frameCount }, (_, i) => ({
      frame_number: i + 1,
      position: mockPositions[i % mockPositions.length],
      action: mockActions[i % mockActions.length],
      is_key_moment: mockKeyMoments[i % mockKeyMoments.length],
      ...(mockKeyTypes[i % mockKeyTypes.length] ? { key_moment_type: mockKeyTypes[i % mockKeyTypes.length] } : {}),
      detail: 'Demo mode — connect OpenAI API key for real frame analysis.',
      wrestler_visible: true,
    }));

    return NextResponse.json({
      overall_score: Math.floor(68 + Math.random() * 28),
      position_scores: {
        standing: Math.floor(70 + Math.random() * 25),
        top: Math.floor(60 + Math.random() * 30),
        bottom: Math.floor(75 + Math.random() * 20),
      },
      position_reasoning: {
        standing: 'LevelUp fallback mode — connect OpenAI API key for real rubric-based analysis of standing technique.',
        top: 'LevelUp fallback mode — connect OpenAI API key for real rubric-based analysis of top position.',
        bottom: 'LevelUp fallback mode — connect OpenAI API key for real rubric-based analysis of bottom position.',
      },
      frame_annotations: mockAnnotations,
      strengths: ['Explosive level change', 'Tight waist rides', 'High-crotch finish'],
      weaknesses: ['Late sprawl reaction', 'Weak scramble defense'],
      drills: [
        '10x Chain wrestling shots (focus on re-attacks)',
        '5x30s Sprawl + shot reaction drill',
        '3x8 Tight-waist tilts from top',
      ],
      summary: 'LevelUp ran in fallback mode. Upload video frames with a valid API key for real AI feedback.',
      xp: 150,
      model: 'fallback',
      framesAnalyzed: 0,
    });
  }
}
