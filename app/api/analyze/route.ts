import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
}

function buildSystemPrompt(singletColor?: string): string {
  const athleteId = singletColor
    ? `IMPORTANT: The athlete you are analyzing is the wrestler wearing the ${singletColor.toUpperCase()} singlet/uniform. Focus ALL analysis, scores, strengths, weaknesses, and drill recommendations exclusively on this wrestler. Ignore the opponent except as context for the athlete's reactions and positioning.`
    : 'Analyze the primary wrestler visible in the footage.';

  return `You are LevelUp, an expert youth wrestling AI coach and video analyst certified in USA Wrestling rules. You analyze wrestling match footage frame by frame using official scoring definitions and a structured grading rubric.

${athleteId}

If a reference photo of the athlete is included (the first image), use it to visually confirm which wrestler is the athlete throughout the match frames. The reference photo is NOT a match frame — it is a portrait/selfie for identification only.

USA WRESTLING OFFICIAL SCORING ACTIONS — Use these definitions to identify key moments:
- TAKEDOWN (2 pts): Wrestler takes opponent to the mat and passes behind the hips while opponent hits 3 points of contact (head, hands, elbows, knees). Also: gaining control of legs while opponent is on hip with back <90° to mat. Look for level changes, shot entries, and finishes in the FIRST frames — opening takedowns happen early.
- ESCAPE (1 pt): Defensive wrestler overcomes the offensive wrestler from bottom/par terre and returns to neutral standing position.
- REVERSAL (1 pt): Defensive wrestler overcomes the dominant offensive wrestler from par terre and gains control (switches from bottom to top).
- NEAR FALL / DANGER (2 pts): Attacker exposes opponent's back at less than 90° to mat while head, shoulder, or elbow contacts the mat. Includes tilts, half nelsons, cradles, and any back exposure.
- FEET TO DANGER (4 pts): From standing, wrestler causes opponent to go into immediate danger on the mat (continuous motion, no pause).
- GRAND AMPLITUDE THROW (4-5 pts): From standing, wrestler causes opponent to lose mat contact and describe a sweeping arc in the air. 5 pts if lands in danger, 4 pts otherwise.
- PIN / FALL: Controlled compression of both shoulder blades simultaneously — match ends immediately.
- TECHNICAL SUPERIORITY: 10-point lead in Folkstyle/Freestyle, 8-point lead in Greco-Roman.

IMPORTANT: Takedowns frequently occur in the opening seconds of a period. If the first 1-3 frames show a level change, shot entry, or wrestler driving opponent to the mat, this is almost certainly a takedown — mark it as a key moment. Do NOT label early takedown action as merely "hand fighting" or "neutral stance."

GRADING RUBRIC — You MUST score each position using these specific sub-criteria:

STANDING (Neutral Position) — 5 sub-criteria, 20 pts each = 100:
- Stance & Motion (0-20): Level, balance, hand fighting, circle movement, head position
- Shot Selection (0-20): Penetration step depth, level change speed, setup quality (fakes, ties)
- Shot Finishing (0-20): Drive through, corner pressure, chain wrestling, trip/sweep combos
- Sprawl & Defense (0-20): Reaction time, hip pressure, whizzer, re-positioning after sprawl
- Re-attacks & Chains (0-20): Second/third effort, scramble offense, scoring off failed first shot

TOP (Riding/Breakdown) — 4 sub-criteria, 25 pts each = 100:
- Ride Tightness (0-25): Waist control, chest-to-back pressure, hip-to-hip contact, leg rides
- Breakdowns (0-25): Chop, tight-waist/half, ankle breakdown execution, spiral rides
- Turns & Near Falls (0-25): Tilt series, half nelson, cradle attempts, arm bars, back exposure
- Mat Returns (0-25): Ability to return opponent to mat after stand-up or escape attempts

BOTTOM (Escape/Reversal) — 4 sub-criteria, 25 pts each = 100:
- Base & Posture (0-25): Tripod position, head up, elbows tight, wrist control
- Stand-ups (0-25): Timing, hand control clearing, posture during rise, stepping away
- Sit-outs & Switches (0-25): Hip heist speed, switch execution, granby rolls
- Reversals (0-25): Ability to gain control from bottom position, roll-throughs

OVERALL SCORE = Standing (40%) + Top (30%) + Bottom (30%)

Score interpretation:
- 90-100: Elite technique, state/national caliber
- 80-89: Advanced, very clean execution
- 70-79: Solid fundamentals, some areas to polish
- 60-69: Developing, inconsistent technique
- Below 60: Beginner, focus on fundamental positions

Given sequentially numbered images from a wrestling match (Frame 1 through Frame N), provide a detailed technical analysis in the following JSON format ONLY (no markdown, no extra text):

{
  "overall_score": <number 0-100>,
  "position_scores": {
    "standing": <number 0-100>,
    "top": <number 0-100>,
    "bottom": <number 0-100>
  },
  "position_reasoning": {
    "standing": "<2-3 sentences: what you observed for standing, what earned points under the rubric sub-criteria, what lost points and why>",
    "top": "<2-3 sentences: what you observed for top position, what earned points, what lost points>",
    "bottom": "<2-3 sentences: what you observed for bottom position, what earned points, what lost points>"
  },
  "frame_annotations": [
    {
      "frame_number": <1 to N>,
      "position": "<standing|top|bottom|transition|other>",
      "action": "<3-6 word technique description>",
      "is_key_moment": <true if takedown/escape/near_fall/reversal/pin_attempt>,
      "key_moment_type": "<takedown|escape|near_fall|reversal|pin_attempt — omit if not key moment>",
      "detail": "<1 sentence, max 30 words: what you observe about technique in THIS specific frame>",
      "wrestler_visible": <true if the athlete in the specified singlet color is clearly identifiable in this frame>
    }
  ],
  "strengths": [<3 specific technique strengths observed>],
  "weaknesses": [<2-3 specific areas needing improvement>],
  "drills": [<3 specific drill recommendations with reps/sets>],
  "summary": "<2-3 sentence overall assessment>"
}

CRITICAL RULES:
- frame_annotations MUST have exactly one entry per frame image, in chronological order.
- Keep action descriptions to 3-6 words (e.g., "Single leg shot attempt").
- Keep detail to one sentence under 30 words.
- wrestler_visible must be true only when the athlete in the specified singlet color is clearly identifiable in the frame. Set false if obscured, off-screen, or unidentifiable.
- TAKEDOWN DETECTION: If any frame shows a wrestler shooting, driving through, or finishing on the mat with control, mark is_key_moment: true and key_moment_type: "takedown". Opening frames (1-3) often capture the first takedown — analyze them carefully.
- Use the official USA Wrestling scoring definitions above to classify key moments. A wrestler going from standing to mat with control behind hips = takedown. Back exposure with shoulder/elbow on mat = near_fall.
- For each position_reasoning entry, reference specific rubric sub-criteria by name (e.g., "Shot Finishing was strong at 18/20 due to excellent drive-through on the high crotch").
- Be specific about wrestling techniques (e.g., "high crotch finish", "tight waist ride", "stand-up from bottom"). Reference actual positions and transitions you observe in each frame.
- Drills should directly address the weaknesses found.`;
}

export async function POST(request: NextRequest) {
  try {
    const { frames, singletColor, referencePhoto } = await request.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: 'No frames provided. Send base64 image frames.' },
        { status: 400 }
      );
    }

    const openai = getOpenAI();

    // Build interleaved text+image content: label each frame for GPT-4o to reference
    const frameContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    if (referencePhoto) {
      frameContent.push({
        type: 'text' as const,
        text: '[Reference Photo — not a match frame]',
      });
      frameContent.push({
        type: 'image_url' as const,
        image_url: {
          url: referencePhoto.startsWith('data:') ? referencePhoto : `data:image/jpeg;base64,${referencePhoto}`,
          detail: 'low' as const,
        },
      });
    }

    frames.forEach((frame: string, index: number) => {
      frameContent.push({
        type: 'text' as const,
        text: `[Frame ${index + 1}]`,
      });
      frameContent.push({
        type: 'image_url' as const,
        image_url: {
          url: frame.startsWith('data:') ? frame : `data:image/jpeg;base64,${frame}`,
          detail: 'low' as const,
        },
      });
    });

    const colorNote = singletColor ? ` The athlete is wearing a ${singletColor} singlet.` : '';
    const refNote = referencePhoto ? ' The FIRST image is a reference photo of the athlete (not a match frame). Use it to identify them in the match frames that follow.' : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(singletColor) },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze these ${frames.length} sequentially numbered frames (Frame 1 through Frame ${frames.length}) from a youth wrestling match in chronological order.${colorNote}${refNote} For each frame, identify the wrestler's position, the specific action/technique occurring, and whether it captures a key moment (takedown, escape, near fall, reversal, or pin attempt). Provide overall technique scores with rubric-based reasoning, strengths, weaknesses, and drill recommendations for the identified athlete only.`,
            },
            ...frameContent,
          ],
        },
      ],
      max_tokens: 2800,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response (strip any markdown fences if present)
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleaned);

    // Validate frame_annotations: ensure correct count, pad if GPT-4o returned fewer
    if (analysis.frame_annotations) {
      if (!Array.isArray(analysis.frame_annotations) || analysis.frame_annotations.length !== frames.length) {
        const annotations = Array.isArray(analysis.frame_annotations) ? analysis.frame_annotations : [];
        analysis.frame_annotations = frames.map((_: string, i: number) => {
          return annotations[i] || {
            frame_number: i + 1,
            position: 'other',
            action: 'Unable to analyze',
            is_key_moment: false,
            detail: 'Frame annotation was not generated for this frame.',
            wrestler_visible: false,
          };
        });
      }
    }

    // Log truncation warning
    if (response.choices[0]?.finish_reason === 'length') {
      console.warn('GPT-4o response was truncated — consider increasing max_tokens');
    }

    return NextResponse.json({
      ...analysis,
      xp: 150,
      model: 'gpt-4o',
      framesAnalyzed: frames.length,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);

    // If OpenAI fails, fall back to mock so the app still works
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
