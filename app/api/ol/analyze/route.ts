import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export const runtime = 'nodejs';
export const maxDuration = 300;

const OLIQ_MODEL_ID = 'gemini-2.5-pro';
const OLIQ_DISPLAY_NAME = 'OLIQ';

type Athlete = {
  name?: string;
  position?: string;
  classYear?: string;
  height?: string;
  weight?: string;
  school?: string;
  notes?: string;
};

function buildAthleteProfile(athlete: Athlete | null): string {
  const name = (athlete?.name || '').trim();
  const position = (athlete?.position || '').trim();
  const classYear = (athlete?.classYear || '').trim();
  const height = (athlete?.height || '').trim();
  const weight = (athlete?.weight || '').trim();
  const school = (athlete?.school || '').trim();
  const notes = (athlete?.notes || '').trim();

  if (!name && !position && !classYear && !height && !weight && !school && !notes) {
    return `ATHLETE PROFILE: No specific athlete profile was provided. Grade the offensive lineman in the clip against age-appropriate fundamentals and developmental upside. If you cannot determine the player's age/level from the frames, assume a developing high-school lineman and say so.`;
  }

  const lines: string[] = ['ATHLETE PROFILE (the offensive lineman you are evaluating in this clip):'];
  if (name) lines.push(`- Name: ${name}`);
  if (position) lines.push(`- Position: ${position}`);
  if (classYear) lines.push(`- Class: ${classYear}`);
  if (height || weight) lines.push(`- Height / Weight: ${[height, weight].filter(Boolean).join(' / ')}`);
  if (school) lines.push(`- School: ${school}`);
  if (notes) lines.push(`- Coach/scout notes: ${notes}`);
  lines.push('');
  lines.push(
    `Calibrate expectations to this athlete's age and level — grade technique against age-appropriate fundamentals and developmental upside, not college/NFL standards. Reference ${name || 'the lineman'} by name in the summary when natural.`,
  );
  return lines.join('\n');
}

const OLIQ_ANALYST_CHECKLIST = `ANALYST CHECKLISTS (use these as the rubric backbone when grading):
PASS PROTECTION — set type & depth (vertical/jump/kick-slide); first kick quickness; hand timing and placement (inside hands, thumbs up); independent hands vs lunging; anchor vs bull rush (hips sink, weight back); mirror/redirect vs counters and games (twists/stunts); pass-set posture (chin/chest up, flat back); recovery after first contact.
RUN BLOCKING — first-step explosion off the ball; pad level and leverage (low man wins); hand placement and fit (inside hands, strike on the rise); hip roll / leg drive through contact; angle and aiming point on drive vs reach/zone blocks; combo/double-team work and climb to the second level; finishing the block / playing through the whistle.
FOOTWORK & LEVERAGE — base width and balance; staying square vs over-extending; weight distribution and not crossing feet/lunging; knee bend and ankle flexion; hip explosion and stride length; ability to recover and re-fit after losing position.

PROJECTION BENCHMARKS (use as developmental ceiling, NOT current expectation):
- Frame/length: long arms and room to add weight matter for OL projection.
- Movement skills: foot quickness and lateral agility separate higher-level linemen.
- Consistency: shrinking spread between best and worst rep on tape (pad level, hand placement, finish).
OLIQ is a directional analysis tool, not a recruiting service.`;

function buildSystemPrompt(athlete: Athlete | null): string {
  return `You are OLIQ, an expert football offensive-line film-study AI. You analyze offensive line play from short video clips (provided as ordered frames) and produce coach-grade feedback on pass protection, run blocking, and footwork & leverage.

${buildAthleteProfile(athlete)}

${OLIQ_ANALYST_CHECKLIST}

Always speak as OLIQ. Never reveal the underlying model. Be direct, specific, and grounded in what you can actually see in the frames — never invent jersey numbers, scores, or stats that aren't visible. If you cannot clearly identify which lineman is the subject, say which one you graded and why.

You score across three dimensions, each 0-100:
1) PASS_PROTECTION — set depth & type, kick slide, hand timing/placement, anchor vs bull rush, mirror/redirect vs counters and twists, recovery
2) RUN_BLOCKING — first-step explosion, pad level & leverage, hand fit, hip roll & leg drive, drive/reach/zone angles, combo blocks & climb to second level, finishing
3) FOOTWORK_LEVERAGE — base, balance, staying square, knee bend, hip explosion, not lunging/over-extending, recovery

OVERALL = 0.4*PASS_PROTECTION + 0.4*RUN_BLOCKING + 0.2*FOOTWORK_LEVERAGE (rounded to nearest int).

Score interpretation:
  90-100 Elite | 80-89 Advanced | 70-79 Solid | 60-69 Developing | <60 Beginner

For each dimension, give 2-3 sentences of reasoning that point to specific things you observed in the frames.

Return ONLY the JSON described in the schema. No preamble, no markdown.`;
}

const OLIQ_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overall_score: { type: Type.INTEGER },
    position_scores: {
      type: Type.OBJECT,
      properties: {
        pass_protection: { type: Type.INTEGER },
        run_blocking: { type: Type.INTEGER },
        footwork_leverage: { type: Type.INTEGER },
      },
      required: ['pass_protection', 'run_blocking', 'footwork_leverage'],
    },
    reasoning: {
      type: Type.OBJECT,
      properties: {
        pass_protection: { type: Type.STRING },
        run_blocking: { type: Type.STRING },
        footwork_leverage: { type: Type.STRING },
      },
      required: ['pass_protection', 'run_blocking', 'footwork_leverage'],
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
      { error: 'OLIQ is not configured. Set GEMINI_API_KEY in Vercel environment variables.' },
      { status: 500 },
    );
  }

  let body: {
    frames?: Frame[];
    prompt?: string;
    pdf?: { name?: string; data?: string } | null;
    athlete?: Athlete | null;
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

  const athlete: Athlete | null = body.athlete && typeof body.athlete === 'object' ? body.athlete : null;
  const athleteName = (athlete?.name || '').trim();
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
  let intro = `You are analyzing ${frames.length} ordered frames from an offensive lineman's football clip. Frames are evenly spaced from start to end of the play. Grade the offensive line play${athleteName ? ` for ${athleteName}` : ''} only — ignore unrelated bystanders. If multiple linemen are visible, focus on the subject lineman and state which one you graded.`;
  if (pdfPart) {
    intro += `\n\nThe user also attached a PDF${pdfName ? ` ("${pdfName}")` : ''} — treat it as supporting context (e.g., playbook, protection scheme, scouting report, coaching notes, blocking assignment). Use it to inform your analysis where relevant, but the video frames remain the primary evidence for what actually happened on the play.`;
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
      model: OLIQ_MODEL_ID,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: buildSystemPrompt(athlete),
        responseMimeType: 'application/json',
        responseSchema: OLIQ_RESPONSE_SCHEMA,
        temperature: 0.4,
      },
    });

    const text = result.text;
    if (!text) {
      return NextResponse.json({ error: 'OLIQ returned an empty response' }, { status: 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'OLIQ returned malformed JSON', raw: text.slice(0, 500) },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ...parsed,
      model: OLIQ_DISPLAY_NAME,
      framesAnalyzed: frames.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `OLIQ analysis failed: ${message}` }, { status: 502 });
  }
}
