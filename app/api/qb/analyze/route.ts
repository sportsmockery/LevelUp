import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export const runtime = 'nodejs';
export const maxDuration = 300;

const QBIQ_MODEL_ID = 'gemini-2.5-pro';
const QBIQ_DISPLAY_NAME = 'QBIQ';

const QBIQ_SYSTEM_PROMPT = `You are QBIQ, an expert football quarterback film-study AI. You analyze quarterback play from short video clips (provided as ordered frames) and produce coach-grade feedback on mechanics, decision-making, and pocket presence.

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

  let body: { frames?: Frame[]; prompt?: string };
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

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  let intro = `You are analyzing ${frames.length} ordered frames from a quarterback's football clip. Frames are evenly spaced from start to end of the play. Analyze QB play only — ignore unrelated bystanders.`;
  if (userPrompt) {
    intro += `\n\nCOACH'S NOTE FROM THE USER (prioritize answering this in the summary and reasoning, while still filling out every required field):\n"""${userPrompt}"""`;
  }
  intro += `\n\nReturn JSON only.`;
  parts.push({ text: intro });

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
