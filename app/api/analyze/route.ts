import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import OpenAI from 'openai';
import { buildKnowledgeBasePrompt, TECHNIQUE_TAXONOMY, DRILL_DATABASE } from '../../../lib/wrestling-knowledge';
import { PASS2_RESPONSE_SCHEMA, OPPONENT_SCOUTING_SCHEMA, Pass2Response, OpponentScoutingResponse, FatigueAnalysis } from '../../../lib/analysis-schema';
import { supabase } from '../../../lib/supabase';
import { extractMatchStats } from '../../../lib/stats-extractor';
import { checkBadges } from '../../../lib/badge-checker';
import { buildAnalysisError } from '../../../lib/analysis-errors';
import { validatePipelineInvariants } from '../../../lib/pipeline-invariants';
import { crossValidatePasses } from '../../../lib/pass-validation';
import { PipelineLogger } from '../../../lib/pipeline-logger';
import { triageFrames, applyTriage } from '../../../lib/frame-triage';
import { extractSoftPoseMetrics, computePoseTrends, formatPoseContext } from '../../../lib/pose-estimation';
import { detectActionWindows, buildTemporalSummary, formatTemporalContext } from '../../../lib/temporal-actions';

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

type MatchStyle = 'youth_folkstyle' | 'folkstyle' | 'hs_folkstyle' | 'college_folkstyle' | 'freestyle' | 'grecoRoman';
type AnalysisMode = 'athlete' | 'opponent';

type WrestlerIdInfo = {
  position_in_id_frame: 'left' | 'right';
  uniform_description: string;
  distinguishing_features: string;
  bounding_box_pct?: { x: number; y: number; w: number; h: number };
};

// --- PASS 1: Perception-only prompt (no scoring, just observations) ---
function buildPass1Prompt(athleteId?: WrestlerIdInfo, opponentId?: WrestlerIdInfo, athletePosition?: 'left' | 'right'): string {
  let athleteSection: string;

  if (athleteId && opponentId) {
    athleteSection = `WRESTLER IDENTIFICATION:
In the identification frame provided, the athlete was identified as: ${athleteId.uniform_description}, positioned on the ${athleteId.position_in_id_frame} side. Distinguishing features: ${athleteId.distinguishing_features}.

The opponent was identified as: ${opponentId.uniform_description}, positioned on the ${opponentId.position_in_id_frame} side. Distinguishing features: ${opponentId.distinguishing_features}.

For every subsequent frame, track these two wrestlers consistently. Identify them by their uniform description and visible features — NOT by which side of the mat they are on, since positions change constantly during a match.

In each frame observation, confirm which wrestler is the athlete and which is the opponent. If you cannot determine this for a specific frame (e.g., wrestlers are too entangled to distinguish), set wrestler_visible to false and note "wrestler identification uncertain" in the observation.`;
    if (athletePosition) {
      athleteSection += `\n\nThe user confirmed their wrestler was initially on the ${athletePosition.toUpperCase()} side of the frame.`;
    }
  } else if (athletePosition) {
    athleteSection = `Focus on the wrestler initially on the ${athletePosition.toUpperCase()} side of the frame. Note: "initially" means their position in the first few frames — wrestlers move throughout a match, so track by appearance, not position.`;
  } else {
    athleteSection = 'Focus on the primary wrestler visible.';
  }

  return `You are a wrestling video perception system. Your job is to describe EXACTLY what you see in each frame — body positions, grips, stances, movements, contact points. Do NOT score, judge, or recommend. Just observe.

${athleteSection}

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
      "athlete_identity_consistent": <true if the athlete matches the identified wrestler from the ID frame>,
      "identity_notes": "<if uncertain, explain why — e.g., 'wrestlers entangled, cannot distinguish'>",
      "estimated_stance_height": "<low/medium/high — how tall is the athlete standing?>",
      "estimated_knee_angle": "<deep_bend/moderate/straight>",
      "relative_position": "<tied_up/separated/on_mat/scramble>",
      "weight_distribution": "<forward/centered/backward>",
      "significance": "<CRITICAL/IMPORTANT/CONTEXT/SKIP>"
    }
  ]
}

SIGNIFICANCE LEVELS:
- CRITICAL: Scoring actions (takedowns, escapes, reversals, near falls), points scored against, clear technique errors, exceptional execution
- IMPORTANT: Scrambles with position changes, defensive wins, key transitions between positions
- CONTEXT: Setup sequences, grip fighting establishing position, pre-shot setup
- SKIP: Routine hand fighting with no position change, resets, referee stoppages, inactivity

IDENTITY TRACKING: In each frame, confirm the athlete matches the wrestler identified in the ID frame by checking uniform description and visible features. Set "athlete_identity_consistent" to true only if you are confident. If the wrestlers are too entangled or the athlete is not visible, set it to false and explain in "identity_notes".

POSE ESTIMATION: Use the structured stance/posture fields (estimated_stance_height, estimated_knee_angle, relative_position, weight_distribution) to ground your observations. These estimates help Pass 2 produce more accurate scoring.

IMPORTANT: You MUST provide exactly one observation for EVERY frame provided. Do NOT skip any frames, even if they appear similar or unremarkable — mark those as significance "CONTEXT" or "SKIP" but still describe what you see.

Be precise and literal. Describe body angles, limb positions, and spatial relationships. If you cannot see something clearly, say so.`;
}

// --- PASS 2: Reasoning prompt for athlete analysis ---
function buildPass2AthletePrompt(
  matchStyle: MatchStyle,
  frameCount: number,
  matchContext?: MatchContext,
  athleteId?: WrestlerIdInfo,
  athletePosition?: 'left' | 'right',
): string {
  const knowledgeBase = buildKnowledgeBasePrompt(matchStyle);
  const descriptors: string[] = [];
  if (athleteId) {
    descriptors.push(`identified as: ${athleteId.uniform_description}`);
    if (athleteId.distinguishing_features) descriptors.push(athleteId.distinguishing_features);
  }
  if (athletePosition) {
    descriptors.push(`initially on the ${athletePosition} side of the frame`);
  }
  const colorNote = descriptors.length > 0 ? ` ${descriptors.join(', ')}` : '';

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
  matchStyle: MatchStyle,
  opponentId?: WrestlerIdInfo,
  athletePosition?: 'left' | 'right',
): string {
  const knowledgeBase = buildKnowledgeBasePrompt(matchStyle);
  const descriptors: string[] = [];
  if (opponentId) {
    descriptors.push(`identified as: ${opponentId.uniform_description}`);
    if (opponentId.distinguishing_features) descriptors.push(opponentId.distinguishing_features);
  }
  if (athletePosition) {
    const opponentSide = athletePosition === 'left' ? 'right' : 'left';
    descriptors.push(`initially on the ${opponentSide} side of the frame`);
  }
  const colorNote = descriptors.length > 0 ? ` ${descriptors.join(', ')}` : '';

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
type AnalysisMetadata = {
  athleteSide?: 'left' | 'right';
  athleteBoundingBox?: { x: number; y: number; w: number; h: number };
  opponentBoundingBox?: { x: number; y: number; w: number; h: number };
  identityConfidence?: number;
  qualityFlags?: Array<{ check: string; severity: string; detail: string }>;
  hallucinationWarnings?: string[];
  pipelineLog?: Record<string, unknown>;
  triageSummary?: Record<string, unknown>;
  temporalSummary?: Record<string, unknown>;
  poseMetrics?: Record<string, unknown>;
  framesTriaged?: number;
  framesAfterTriage?: number;
};

async function saveToSupabase(
  pass2Result: Pass2Response,
  normalized: Record<string, unknown>,
  matchStyle: string,
  matchContext?: MatchContext,
  metadata?: AnalysisMetadata,
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
        athlete_side: metadata?.athleteSide,
        athlete_bounding_box: metadata?.athleteBoundingBox,
        opponent_bounding_box: metadata?.opponentBoundingBox,
        identity_confidence: metadata?.identityConfidence,
        quality_flags: metadata?.qualityFlags,
        hallucination_warnings: metadata?.hallucinationWarnings,
        pipeline_version: 'v2',
        triage_summary: metadata?.triageSummary,
        temporal_summary: metadata?.temporalSummary,
        pose_metrics: metadata?.poseMetrics,
        frames_triaged: metadata?.framesTriaged,
        frames_after_triage: metadata?.framesAfterTriage,
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
): Record<string, unknown>;
function normalizeResponse(
  pass2: OpponentScoutingResponse,
  frameCount: number,
  mode: 'opponent',
): Record<string, unknown>;
function normalizeResponse(
  pass2: Pass2Response | OpponentScoutingResponse,
  frameCount: number,
  mode: AnalysisMode,
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
      model: 'gpt-4o',
      framesAnalyzed: frameCount,
      scouting,
    };
  }

  const athlete = pass2 as Pass2Response;

  // Build backwards-compatible frame_annotations from ALL frame_evidence
  // Use an index map so each annotation[i] corresponds to frame i
  const evidenceMap = new Map<number, (typeof athlete.frame_evidence)[0]>();
  for (const fe of athlete.frame_evidence) {
    evidenceMap.set(fe.frame_index, fe);
  }

  const frameAnnotations = Array.from({ length: frameCount }, (_, idx) => {
    const fe = evidenceMap.get(idx);
    if (fe) {
      return {
        frame_number: idx + 1,
        position: fe.position,
        action: fe.action,
        is_key_moment: fe.is_key_moment,
        ...(fe.key_moment_type && fe.key_moment_type !== '' ? { key_moment_type: fe.key_moment_type } : {}),
        detail: fe.detail,
        wrestler_visible: fe.wrestler_visible,
        rubric_impact: fe.rubric_impact || undefined,
        confidence: fe.wrestler_visible ? athlete.confidence : athlete.confidence * 0.5,
      };
    }
    return {
      frame_number: idx + 1,
      position: 'other' as const,
      action: 'Frame not analyzed',
      is_key_moment: false,
      detail: 'This frame was not selected as key evidence.',
      wrestler_visible: false,
      rubric_impact: undefined,
      confidence: 0,
    };
  });

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

// Allow up to 300s for two-pass analysis (Fluid Compute recommended)
export const maxDuration = 300;

const ANALYSIS_TIMEOUT = 240_000; // 240s — leave 60s buffer before Vercel kills it
const MAX_BATCHES = 15; // Cap Pass 1 at 15 batches (75 frames)

export async function POST(request: NextRequest) {
  let parsedFrameCount = 10;
  try {
    const body = await request.json();
    const { frames, matchStyle = 'folkstyle', mode = 'athlete', matchContext, athleteIdentification, opponentIdentification, idFrameBase64, athletePosition } = body;
    parsedFrameCount = (frames && Array.isArray(frames)) ? frames.length : 10;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: 'No frames provided. Send base64 image frames.' },
        { status: 400 }
      );
    }

    const validMatchStyle: MatchStyle = ['youth_folkstyle', 'folkstyle', 'hs_folkstyle', 'college_folkstyle', 'freestyle', 'grecoRoman'].includes(matchStyle) ? matchStyle : 'hs_folkstyle';
    const validMode: AnalysisMode = mode === 'opponent' ? 'opponent' : 'athlete';
    const validMatchContext: MatchContext | undefined = matchContext && typeof matchContext === 'object' ? matchContext : undefined;
    const validAthleteId: WrestlerIdInfo | undefined = athleteIdentification && typeof athleteIdentification === 'object' ? athleteIdentification : undefined;
    const validOpponentId: WrestlerIdInfo | undefined = opponentIdentification && typeof opponentIdentification === 'object' ? opponentIdentification : undefined;
    const validAthletePosition: 'left' | 'right' | undefined = (athletePosition === 'left' || athletePosition === 'right') ? athletePosition : undefined;

    // Async mode: return jobId immediately, run analysis in background
    const asyncMode = request.nextUrl.searchParams.get('async') === 'true';
    if (asyncMode && supabase) {
      const jobId = crypto.randomUUID();

      // Create pending job in Supabase
      await supabase.from('match_analyses').insert({
        id: jobId,
        athlete_id: '00000000-0000-0000-0000-000000000000',
        overall_score: 0,
        standing: 0,
        top: 0,
        bottom: 0,
        job_status: 'processing',
        match_style: validMatchStyle,
      });

      // Run analysis in background after response is sent
      after(async () => {
        try {
          const result = await runAnalysisPipeline({
            frames,
            matchStyle: validMatchStyle, mode: validMode,
            matchContext: validMatchContext,
            athleteIdentification: validAthleteId, opponentIdentification: validOpponentId,
            idFrameBase64, athletePosition: validAthletePosition,
          });
          await supabase!.from('match_analyses').update({
            job_status: 'complete',
            analysis_json: result,
            overall_score: (result as any).overall_score || 0,
            standing: (result as any).position_scores?.standing || 0,
            top: (result as any).position_scores?.top || 0,
            bottom: (result as any).position_scores?.bottom || 0,
          }).eq('id', jobId);
          console.log(`[LevelUp] Background job ${jobId} complete`);
        } catch (err: any) {
          console.error(`[LevelUp] Background job ${jobId} failed:`, err);
          const errorCode = err?.message === 'ANALYSIS_TIMEOUT' ? 'ANALYSIS_TIMEOUT' : 'ANALYSIS_ERROR';
          const structuredError = buildAnalysisError(errorCode as 'ANALYSIS_TIMEOUT' | 'ANALYSIS_ERROR', err?.message);
          await supabase!.from('match_analyses').update({
            job_status: 'failed',
            error_message: structuredError.userMessage,
          }).eq('id', jobId);
        }
      });

      return NextResponse.json({ jobId, status: 'processing' });
    }

    // Synchronous mode (default): run analysis and return result
    const result = await runAnalysisPipeline({
      frames,
      matchStyle: validMatchStyle, mode: validMode,
      matchContext: validMatchContext,
      athleteIdentification: validAthleteId, opponentIdentification: validOpponentId,
      idFrameBase64, athletePosition: validAthletePosition,
    });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Analysis error:', error);

    if (error?.message === 'ANALYSIS_TIMEOUT') {
      console.error(`[LevelUp] Analysis timed out after ${ANALYSIS_TIMEOUT / 1000}s`);
      return NextResponse.json(
        buildAnalysisError('ANALYSIS_TIMEOUT'),
        { status: 504 }
      );
    }

    if (error?.status === 401 || error?.code === 'invalid_api_key') {
      return NextResponse.json(
        buildAnalysisError('INVALID_API_KEY'),
        { status: 401 }
      );
    }

    return NextResponse.json(
      buildAnalysisError('ANALYSIS_ERROR', error?.message),
      { status: 500 }
    );
  }
}

// Shared analysis config type
type AnalysisConfig = {
  frames: string[];
  matchStyle: MatchStyle;
  mode: AnalysisMode;
  matchContext?: MatchContext;
  athleteIdentification?: WrestlerIdInfo;
  opponentIdentification?: WrestlerIdInfo;
  idFrameBase64?: string;
  athletePosition?: 'left' | 'right';
};

/** @deprecated Use buildAnalysisError() for all error responses. Retained for reference only. */
function buildFallbackResponse(frameCount: number) {
  const mockPositions = ['standing', 'standing', 'transition', 'top', 'top', 'top', 'bottom', 'bottom', 'standing', 'standing'];
  const mockActions = ['Neutral stance hand fighting', 'Level change shot attempt', 'Scramble to top position', 'Riding with tight waist', 'Half nelson turn attempt', 'Mat return after standup', 'Building base on bottom', 'Standup escape attempt', 'Return to neutral stance', 'Post-whistle reset'];
  const mockKeyMoments = [false, true, true, false, true, false, false, true, false, false];
  const mockKeyTypes: (string | undefined)[] = [undefined, 'takedown', undefined, undefined, 'near_fall', undefined, undefined, 'escape', undefined, undefined];

  return {
    overall_score: Math.floor(68 + Math.random() * 28),
    position_scores: { standing: Math.floor(70 + Math.random() * 25), top: Math.floor(60 + Math.random() * 30), bottom: Math.floor(75 + Math.random() * 20) },
    position_reasoning: { standing: 'LevelUp fallback mode.', top: 'LevelUp fallback mode.', bottom: 'LevelUp fallback mode.' },
    frame_annotations: Array.from({ length: frameCount }, (_, i) => ({
      frame_number: i + 1, position: mockPositions[i % mockPositions.length], action: mockActions[i % mockActions.length],
      is_key_moment: mockKeyMoments[i % mockKeyMoments.length],
      ...(mockKeyTypes[i % mockKeyTypes.length] ? { key_moment_type: mockKeyTypes[i % mockKeyTypes.length] } : {}),
      detail: 'Demo mode — connect OpenAI API key for real frame analysis.', wrestler_visible: true,
    })),
    strengths: ['Explosive level change', 'Tight waist rides', 'High-crotch finish'],
    weaknesses: ['Late sprawl reaction', 'Weak scramble defense'],
    drills: ['10x Chain wrestling shots', '5x30s Sprawl + shot reaction drill', '3x8 Tight-waist tilts from top'],
    summary: 'LevelUp ran in fallback mode. Upload video frames with a valid API key for real AI feedback.',
    xp: 150, model: 'fallback', framesAnalyzed: 0,
  };
}

// Core analysis pipeline — extracted so it can be called synchronously or in after()
async function runAnalysisPipeline(config: AnalysisConfig): Promise<Record<string, unknown>> {
  const { frames, matchStyle: validMatchStyle, mode: validMode, matchContext: validMatchContext, athleteIdentification: validAthleteId, opponentIdentification: validOpponentId, idFrameBase64, athletePosition: validAthletePosition } = config;

    const logger = new PipelineLogger();
    const openai = getOpenAI();

    // ===== FRAME TRIAGE (Gap 1): Pre-filter non-action frames =====
    let analysisFrames = frames;
    let originalFrameIndices: number[] | null = null;
    let triageSummaryData: Record<string, unknown> | undefined;

    // Only triage if we have enough frames to make it worthwhile (>10)
    if (frames.length > 10) {
      logger.log('triage_start', { total_frames: frames.length });
      try {
        const { results: triageResults, summary: tSummary } = await triageFrames(openai, frames, {
          minIntensity: 'low',
          alwaysIncludeEdgeFrames: 2,
        });

        const { filteredFrames, originalIndices } = applyTriage(frames, triageResults);

        // Only use triage results if we kept at least 60% of frames
        // (if triage is too aggressive, skip it and use all frames)
        if (filteredFrames.length >= frames.length * 0.6) {
          analysisFrames = filteredFrames;
          originalFrameIndices = originalIndices;
          triageSummaryData = tSummary as unknown as Record<string, unknown>;
          logger.log('triage_complete', {
            kept: filteredFrames.length,
            filtered: frames.length - filteredFrames.length,
            duration_ms: tSummary.triage_duration_ms,
          });
        } else {
          logger.log('triage_complete', {
            skipped: true,
            reason: 'Triage too aggressive',
            would_keep: filteredFrames.length,
            total: frames.length,
          });
        }
      } catch (err: any) {
        // Triage failure is non-fatal — continue with all frames
        logger.warn('triage_complete', { error: err?.message || 'Triage failed', using_all_frames: true });
      }
    }

    // ===== PASS 1: Parallel perception calls =====
    const BATCH_SIZE = 5;
    let batches: string[][] = [];
    for (let i = 0; i < analysisFrames.length; i += BATCH_SIZE) {
      batches.push(analysisFrames.slice(i, i + BATCH_SIZE));
    }

    // Cap batches to prevent excessive API calls on very long videos
    if (batches.length > MAX_BATCHES) {
      console.log(`[LevelUp] Capping batches from ${batches.length} to ${MAX_BATCHES}`);
      // Keep first and last batch, evenly sample the rest
      const kept = [batches[0]];
      const step = (batches.length - 2) / (MAX_BATCHES - 2);
      for (let i = 1; i < MAX_BATCHES - 1; i++) {
        kept.push(batches[Math.round(1 + (i - 1) * step)]);
      }
      kept.push(batches[batches.length - 1]);
      batches = kept;
    }

    logger.log('pass1_start', { batches: batches.length, batch_size: BATCH_SIZE, total_frames: frames.length });

    // Master timeout wrapper
    const analysisStart = Date.now();
    const checkTimeout = () => {
      if (Date.now() - analysisStart > ANALYSIS_TIMEOUT) {
        throw new Error('ANALYSIS_TIMEOUT');
      }
    };

    const pass1Results = await Promise.all(
      batches.map(async (batch, batchIndex) => {
        const batchStartIdx = batchIndex * BATCH_SIZE;
        const frameContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

        // Include ID frame in first batch only (used for wrestler identification context)
        if (batchIndex === 0 && idFrameBase64) {
          frameContent.push({
            type: 'text' as const,
            text: '[Identification Frame — this is the frame used to identify the two wrestlers. Use it as a visual reference.]',
          });
          frameContent.push({
            type: 'image_url' as const,
            image_url: {
              url: idFrameBase64.startsWith('data:') ? idFrameBase64 : `data:image/jpeg;base64,${idFrameBase64}`,
              detail: 'high' as const,
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
            { role: 'system', content: buildPass1Prompt(validAthleteId, validOpponentId, validAthletePosition) },
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
          logger.warn('pass1_batch', { batch: batchIndex, error: 'JSON parse failed' });
          return { observations: [] };
        }
      })
    );

    // Merge all observations
    const allObservations = pass1Results.flatMap((r: any) => r.observations || []);

    // Compute identity confidence from Pass 1
    const visibleFrames = allObservations.filter((obs: any) => obs.wrestler_visible);
    const identityConsistentFrames = allObservations.filter((obs: any) => obs.athlete_identity_consistent === true);
    const identityConfidence = visibleFrames.length > 0
      ? identityConsistentFrames.length / visibleFrames.length
      : 0;

    // Compute per-position confidence from frame visibility ratios
    const positionFrames: Record<string, { total: number; visible: number }> = {
      standing: { total: 0, visible: 0 },
      top: { total: 0, visible: 0 },
      bottom: { total: 0, visible: 0 },
    };
    for (const obs of allObservations) {
      const pos = (obs as any).athlete_position;
      if (pos in positionFrames) {
        positionFrames[pos].total++;
        if ((obs as any).wrestler_visible) positionFrames[pos].visible++;
      }
    }
    const positionConfidence = {
      standing: positionFrames.standing.total > 0 ? positionFrames.standing.visible / positionFrames.standing.total : 0,
      top: positionFrames.top.total > 0 ? positionFrames.top.visible / positionFrames.top.total : 0,
      bottom: positionFrames.bottom.total > 0 ? positionFrames.bottom.visible / positionFrames.bottom.total : 0,
    };

    logger.log('pass1_complete', {
      observations: allObservations.length,
      identity_confidence: identityConfidence,
      position_confidence: positionConfidence,
    });

    // Validate Pass 1 coverage — warn if many frames were skipped
    if (allObservations.length < frames.length * 0.7) {
      logger.warn('pass1_complete', {
        message: 'Under-reported',
        observations: allObservations.length,
        frames: frames.length,
        coverage: Math.round(allObservations.length / frames.length * 100),
      });
    }

    if (identityConfidence < 0.5) {
      logger.warn('identity_check', {
        identity_confidence: identityConfidence,
        visible_frames: visibleFrames.length,
        consistent_frames: identityConsistentFrames.length,
      });
    }

    checkTimeout();

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

    logger.log('pass1_complete', { display_frames: displayFrameIndices.size, critical: critical.length, important: important.length, context: context.length });

    // ===== TEMPORAL ACTION DETECTION (Gap 3): Group observations into action windows =====
    const actionWindows = detectActionWindows(allObservations);
    const temporalSummary = buildTemporalSummary(actionWindows, frames.length);
    const temporalContext = formatTemporalContext(actionWindows, temporalSummary);
    logger.log('temporal_analysis', {
      windows: actionWindows.length,
      scoring_windows: temporalSummary.scoring_windows,
      tempo: temporalSummary.tempo,
    });

    // ===== POSE ESTIMATION (Gap 2): Extract soft pose metrics from Pass 1 =====
    const softPoseMetrics = extractSoftPoseMetrics(allObservations);
    const poseTrends = computePoseTrends(softPoseMetrics);
    const poseContext = formatPoseContext(softPoseMetrics);
    logger.log('pose_estimation', {
      metrics_count: softPoseMetrics.length,
      hip_trend: poseTrends.hip_height_trend,
      stance_trend: poseTrends.stance_width_trend,
      fatigue_indicators: poseTrends.fatigue_indicators.length,
    });

    // ALL observations still go to Pass 2 for scoring (no data loss)
    // ===== PASS 2: Reasoning call (text-only) =====
    const observationsText = allObservations
      .map((obs: any) => `Frame ${obs.frame_index}: position=${obs.athlete_position}, body=${obs.athlete_body}, opponent=${obs.opponent_body}, contact=${obs.contact_points}, action=${obs.action}, visible=${obs.wrestler_visible}, significance=${obs.significance || 'CONTEXT'}`)
      .join('\n');

    if (validMode === 'opponent') {
      // Scouting analysis
      logger.log('pass2_start', { mode: 'opponent' });
      const pass2Response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: buildPass2ScoutingPrompt(validMatchStyle, validOpponentId, validAthletePosition) },
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

      logger.log('pass2_complete', { attack_patterns: scoutResult.attack_patterns.length, defense_patterns: scoutResult.defense_patterns.length });
      return normalized;
    }

    // Athlete analysis — split observations into halves for fatigue detection
    const halfIdx = Math.floor(allObservations.length / 2);
    const firstHalfObs = allObservations.slice(0, halfIdx);
    const secondHalfObs = allObservations.slice(halfIdx);
    const periodLabel = `\n\n--- FIRST HALF (frames 0-${halfIdx - 1}, early match) ---\n${firstHalfObs.map((obs: any) => `Frame ${obs.frame_index}: position=${obs.athlete_position}, body=${obs.athlete_body}, action=${obs.action}`).join('\n')}\n\n--- SECOND HALF (frames ${halfIdx}-${allObservations.length - 1}, late match) ---\n${secondHalfObs.map((obs: any) => `Frame ${obs.frame_index}: position=${obs.athlete_position}, body=${obs.athlete_body}, action=${obs.action}`).join('\n')}`;

    logger.log('pass2_start', { mode: 'athlete', frame_count: frames.length });
    const pass2Response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildPass2AthletePrompt(validMatchStyle, frames.length, validMatchContext, validAthleteId, validAthletePosition) },
        {
          role: 'user',
          content: `Here are the frame-by-frame observations from the match (${frames.length} frames total):\n\n${observationsText}${temporalContext}${poseContext}\n\nFor fatigue analysis, here are the observations split by match half:${periodLabel}\n\nScore this wrestler's technique using the rubric. Cite specific frame indices as evidence. Also complete the fatigue analysis comparing first half vs second half.${poseTrends.fatigue_indicators.length > 0 ? `\n\nPOSE-BASED FATIGUE INDICATORS:\n${poseTrends.fatigue_indicators.join('\n')}` : ''}`,
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
    logger.log('pass2_complete', { tokens: usage?.total_tokens, prompt_tokens: usage?.prompt_tokens, completion_tokens: usage?.completion_tokens });

    if (!pass2Content) throw new Error('No response from Pass 2');

    const pass2Result: Pass2Response = JSON.parse(pass2Content);

    // Hallucination checks
    const warnings = detectHallucinations(pass2Result, frames.length);
    if (warnings.length > 0) {
      logger.warn('validation', { hallucination_warnings: warnings });
    }

    // Pipeline invariant checks
    const invariantWarnings = validatePipelineInvariants(pass2Result, frames.length, allObservations.length);
    if (invariantWarnings.length > 0) {
      logger.warn('validation', { invariant_warnings: invariantWarnings });
    }

    // Cross-validate Pass 1 and Pass 2
    const qualityFlags = crossValidatePasses(allObservations, pass2Result, frames.length);
    if (qualityFlags.length > 0) {
      logger.warn('validation', { quality_flags: qualityFlags });
    }

    const allQualityFlags = [
      ...invariantWarnings.map(w => ({ check: w.check, severity: w.severity, detail: w.detail })),
      ...qualityFlags.map(f => ({ check: f.check, severity: f.severity, detail: f.detail })),
    ];

    const normalized = normalizeResponse(pass2Result, frames.length, 'athlete');

    // Enrich with hardening metadata + Tier 1 data
    (normalized as any).enriched = {
      ...(normalized as any).enriched,
      identity_confidence: identityConfidence,
      position_confidence: positionConfidence,
      analysis_quality_flags: allQualityFlags,
      triage_summary: triageSummaryData ? {
        total_frames: frames.length,
        included_frames: analysisFrames.length,
        filtered_frames: frames.length - analysisFrames.length,
      } : undefined,
      temporal_summary: {
        total_windows: temporalSummary.total_windows,
        scoring_windows: temporalSummary.scoring_windows,
        tempo: temporalSummary.tempo,
        match_phases: temporalSummary.match_phases,
      },
      action_windows: actionWindows.filter(w => w.significance !== 'context').slice(0, 20),
      pose_trends: poseTrends.fatigue_indicators.length > 0 ? poseTrends : undefined,
    };

    logger.log('save', { overall: pass2Result.overall_score, confidence: pass2Result.confidence, evidence: pass2Result.frame_evidence.length, identity_confidence: identityConfidence });

    // Fire-and-forget Supabase save — client gets response immediately
    saveToSupabase(pass2Result, normalized, validMatchStyle, validMatchContext, {
      athleteSide: validAthletePosition,
      athleteBoundingBox: validAthleteId?.bounding_box_pct,
      opponentBoundingBox: validOpponentId?.bounding_box_pct,
      identityConfidence,
      qualityFlags: allQualityFlags,
      hallucinationWarnings: warnings,
      pipelineLog: logger.summary(),
      triageSummary: triageSummaryData,
      temporalSummary: temporalSummary as unknown as Record<string, unknown>,
      poseMetrics: poseTrends as unknown as Record<string, unknown>,
      framesTriaged: frames.length,
      framesAfterTriage: analysisFrames.length,
    }).catch((err) =>
      logger.warn('save', { error: err?.message || 'Supabase save failed' })
    );

    return normalized;
}
