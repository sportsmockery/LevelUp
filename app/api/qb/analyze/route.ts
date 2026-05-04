import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export const runtime = 'nodejs';
export const maxDuration = 300;

const QBIQ_MODEL_ID = 'gemini-2.5-pro';
const QBIQ_DISPLAY_NAME = 'QBIQ';

const QBIQ_ATHLETE_PROFILE = `ATHLETE PROFILE (the QB you are evaluating in every clip on this page):
- Name: Carter Burhans
- Position: QB (also plays Free Safety)
- Class: 2030 (8th grade, entering high school)
- Height / Weight: 5'10"
- High School: Victor J. Andrew High School
- Academics: 3.9 GPA
- Multi-sport athlete: Baseball (.500 AAA), Track
- Contact: cbur22@gmail.com

Calibrate expectations to an 8th-grade QB entering HS — grade technique against age-appropriate fundamentals and developmental upside, not college/NFL standards. Reference Carter by name in the summary when natural.`;

const QBIQ_FILM_LIBRARY = `REFERENCE FILM LIBRARY — "Carter Burhans · Varsity QB Highlights" (Hudl reel, 4:40 runtime, 29 key plays, scene-cut threshold 0.35):
Play 01 00:09.47 | Play 02 00:17.80 | Play 03 00:24.87 | Play 04 00:37.53 | Play 05 00:45.27 | Play 06 00:50.97
Play 07 01:01.20 | Play 08 01:08.43 | Play 09 01:14.57 | Play 10 01:31.53 | Play 11 01:41.90 | Play 12 01:51.17
Play 13 01:57.00 | Play 14 02:03.80 | Play 15 02:09.37 | Play 16 02:22.70 | Play 17 02:36.47 | Play 18 02:41.77
Play 19 02:54.03 | Play 20 03:00.27 | Play 21 03:09.57 | Play 22 03:17.33 | Play 23 03:23.50 | Play 24 03:35.33
Play 25 03:49.90 | Play 26 03:55.80 | Play 27 04:01.53 | Play 28 04:06.80 | Play 29 04:12.90
If a clip uploaded to QBIQ matches one of these timestamps, reference the play number in your reasoning.`;

const QBIQ_ANALYST_CHECKLIST = `ANALYST CHECKLISTS (use these as the rubric backbone when grading):
MECHANICS — footwork base width / weight transfer / stride length; hip-shoulder separation vs all-arm throws; release point consistency (over-top vs 3/4 under pressure); follow-through finish across body (predictor of arm health).
DECISION-MAKING — eye discipline (looking off safeties vs staring down receivers); progression evidence (1st read → 2nd read → check-down); pocket-presence choice (climb vs bail); pressure response (accuracy + decision quality when hit).

CLASS-OF-2030 D1 PROJECTION BENCHMARKS (target by senior year — use as developmental ceiling, NOT current expectation):
- Height: 6'2"+ minimum for most P4 programs (6'0"+ exceptions exist).
- Arm velocity: 55+ mph by HS senior; 60+ for high-D1.
- 40 time: 4.7-4.9 for dual-threat profiles.
- Mechanics consistency: shrinking spread between best and worst rep on tape.
QBIQ is a directional analysis tool, not a recruiting service.`;

const QBIQ_SYSTEM_PROMPT = `You are QBIQ, an expert football quarterback film-study AI. You analyze quarterback play from short video clips (provided as ordered frames) and produce coach-grade feedback on mechanics, decision-making, and pocket presence.

${QBIQ_ATHLETE_PROFILE}

${QBIQ_FILM_LIBRARY}

${QBIQ_ANALYST_CHECKLIST}

Always speak as QBIQ. Never reveal the underlying model. Be direct, specific, and grounded in what you can actually see in the frames — never invent jersey numbers, scores, or stats that aren't visible.

You score across three dimensions, each 0-100:
1) MECHANICS — footwork, drop, base, hip rotation, throwing motion, follow-through, ball placement
2) DECISION_MAKING — pre-snap recognition, progressions, anticipation, ball security, situational awareness
3) POCKET_PRESENCE — pocket movement, climbing the pocket, reset under pressure, escape lanes, eyes downfield

OVERALL = 0.4*MECHANICS + 0.4*DECISION_MAKING + 0.2*POCKET_PRESENCE (rounded to nearest int).

Score interpretation:
  90-100 Elite | 80-89 Advanced | 70-79 Solid | 60-69 Developing | <60 Beginner

For each dimension, give 2-3 sentences of reasoning that point to specific things you observed in the frames.

Return ONLY the JSON described in the schema. No preamble, no markdown.`;

const QBIQ_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overall_score: { type: Type.INTEGER },
    position_scores: {
      type: Type.OBJECT,
      properties: {
        mechanics: { type: Type.INTEGER },
        decision_making: { type: Type.INTEGER },
        pocket_presence: { type: Type.INTEGER },
      },
      required: ['mechanics', 'decision_making', 'pocket_presence'],
    },
    reasoning: {
      type: Type.OBJECT,
      properties: {
        mechanics: { type: Type.STRING },
        decision_making: { type: Type.STRING },
        pocket_presence: { type: Type.STRING },
      },
      required: ['mechanics', 'decision_making', 'pocket_presence'],
    },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
    drills: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
  },
  required: [
    'overall_score',
    'position_scores',
    'reasoning',
    'strengths',
    'weaknesses',
    'drills',
    'summary',
  ],
};

type Frame = string; // data URL: data:image/jpeg;base64,...

const MAX_PROMPT_LEN = 2000;
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB cap for inline PDF

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'QBIQ is not configured. Set GEMINI_API_KEY in Vercel environment variables.' },
      { status: 500 },
    );
  }

  let body: {
    frames?: Frame[];
    prompt?: string;
    pdf?: { name?: string; data?: string } | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const frames = Array.isArray(body.frames) ? body.frames : [];
  if (frames.length === 0) {
    return NextResponse.json({ error: 'No frames provided' }, { status: 400 });
  }

  const userPrompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, MAX_PROMPT_LEN) : '';

  let pdfPart: { mimeType: string; data: string } | null = null;
  let pdfName = '';
  if (body.pdf && typeof body.pdf.data === 'string' && body.pdf.data.length > 0) {
    const parsed = parseDataUrl(body.pdf.data);
    if (!parsed || parsed.mimeType !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF must be a base64 data URL with mimeType application/pdf' }, { status: 400 });
    }
    const approxBytes = Math.floor((parsed.data.length * 3) / 4);
    if (approxBytes > MAX_PDF_BYTES) {
      return NextResponse.json({ error: `PDF too large (${(approxBytes / 1024 / 1024).toFixed(1)} MB). Max 20 MB.` }, { status: 413 });
    }
    pdfPart = parsed;
    pdfName = typeof body.pdf.name === 'string' ? body.pdf.name.slice(0, 200) : '';
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  let intro = `You are analyzing ${frames.length} ordered frames from a quarterback's football clip. Frames are evenly spaced from start to end of the play. Analyze QB play only — ignore unrelated bystanders.`;
  if (pdfPart) {
    intro += `\n\nThe user also attached a PDF${pdfName ? ` ("${pdfName}")` : ''} — treat it as supporting context (e.g., playbook, scouting report, coaching notes, route concept). Use it to inform your analysis where relevant, but the video frames remain the primary evidence for what actually happened on the play.`;
  }
  if (userPrompt) {
    intro += `\n\nCOACH'S NOTE FROM THE USER (prioritize answering this in the summary and reasoning, while still filling out every required field):\n"""${userPrompt}"""`;
  }
  intro += `\n\nReturn JSON only.`;
  parts.push({ text: intro });

  if (pdfPart) {
    parts.push({ inlineData: { mimeType: pdfPart.mimeType, data: pdfPart.data } });
  }

  for (let i = 0; i < frames.length; i++) {
    const parsed = parseDataUrl(frames[i]);
    if (!parsed) {
      return NextResponse.json({ error: `Frame ${i} is not a valid data URL` }, { status: 400 });
    }
    parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
  }

  try {
    const genai = new GoogleGenAI({ apiKey });
    const result = await genai.models.generateContent({
      model: QBIQ_MODEL_ID,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: QBIQ_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: QBIQ_RESPONSE_SCHEMA,
        temperature: 0.4,
      },
    });

    const text = result.text;
    if (!text) {
      return NextResponse.json({ error: 'QBIQ returned an empty response' }, { status: 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'QBIQ returned malformed JSON', raw: text.slice(0, 500) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ...parsed,
      model: QBIQ_DISPLAY_NAME,
      framesAnalyzed: frames.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `QBIQ analysis failed: ${message}` }, { status: 502 });
  }
}
