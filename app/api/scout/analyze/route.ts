// /api/scout/analyze — Baseball swing & pitching video analysis.
// Ported from the wrestling /api/analyze two-pass GPT-4o pipeline.
//
// Input  (POST JSON):
//   {
//     athleteId?: number,
//     kind: "swing" | "pitching",
//     frames: string[]                  // base64 data URLs ("data:image/jpeg;base64,…"), 4-12 frames
//     title?: string,
//     notes?: string,
//     athleteName?: string,
//   }
//
// Output (200 JSON):
//   BaseballPass2Response — full structured response (see baseball-analysis-schema.ts)

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildKnowledgeBasePrompt } from '../../../../lib/baseball-knowledge';
import { BASEBALL_PASS2_SCHEMA, BaseballPass2Response } from '../../../../lib/baseball-analysis-schema';

export const runtime = 'nodejs';
export const maxDuration = 120; // seconds

const ANALYSIS_TIMEOUT_MS = 110_000;
const MAX_FRAMES = 12;
const MIN_FRAMES = 1;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
}

function clampScore(n: unknown, fallback = 50): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.max(20, Math.min(80, x));
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// ── Pass 1: perception ────────────────────────────────────────────────────
function buildPass1Prompt(kind: 'swing' | 'pitching'): string {
  const role = kind === 'swing'
    ? 'a baseball hitting perception system. Describe what you see in each frame of a swing: stance, load, stride, hand position, hip/shoulder rotation, bat angle, contact, finish. Do NOT score or judge — just observe.'
    : 'a baseball pitching perception system. Describe what you see in each frame of a pitching delivery: setup, leg lift, balance point, stride, hip/shoulder rotation, arm slot, release, follow-through. Do NOT score or judge — just observe.';

  return `You are ${role}

For each frame, output a JSON object inside an "observations" array with one entry per frame:
{
  "observations": [
    {
      "frame_index": <0-based index into the input frame list>,
      "phase": "<stance|load|stride|separation|contact|release|extension|follow_through|not_visible>",
      "body": "<short description of stance width, knee flex, hip level, hand position, head position>",
      "rotation": "<closed | starting to open | hips open / shoulders closed | fully rotated | unclear>",
      "${kind === 'swing' ? 'bat_path' : 'arm_slot'}": "<one short phrase>",
      "${kind === 'swing' ? 'contact_visible' : 'release_visible'}": <true|false>,
      "athlete_visible": <true|false>,
      "notable": "<one short phrase if there's something significant, else empty>"
    }
  ]
}

IMPORTANT: Output EXACTLY one observation per frame provided, in order, frame_index 0..n-1. Do not skip frames. Be literal and precise — describe what you see, no judgment.`;
}

async function runPass1(
  openai: OpenAI,
  frames: string[],
  kind: 'swing' | 'pitching',
): Promise<any[]> {
  const systemPrompt = buildPass1Prompt(kind);

  const userContent: any[] = [
    {
      type: 'text',
      text: `Analyze these ${frames.length} frames from a ${kind === 'swing' ? 'baseball swing' : 'baseball pitching delivery'}, sampled in chronological order. Frame indexes are 0..${frames.length - 1}.`,
    },
    ...frames.map((dataUrl) => ({
      type: 'image_url',
      image_url: { url: dataUrl, detail: 'low' as const },
    })),
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    seed: 42,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Pass 1 returned malformed JSON');
  }
  const obs = Array.isArray(parsed?.observations) ? parsed.observations : [];
  return obs;
}

// ── Pass 2: reasoning + structured rubric output ─────────────────────────
function buildPass2Prompt(
  kind: 'swing' | 'pitching',
  frameCount: number,
  athleteName?: string,
  title?: string,
  notes?: string,
): string {
  const knowledge = buildKnowledgeBasePrompt(kind);
  const subject = kind === 'swing' ? 'a baseball swing' : 'a pitching delivery';
  const phaseList = kind === 'swing'
    ? '(s1 stance, s2 load, s3 stride/foot-down, s4 hip-shoulder separation, s5 contact point, s6 bat path, s7 finish/balance, s8 bat speed)'
    : '(s1 stance, s2 balance/leg-lift, s3 stride length & direction, s4 hip-shoulder separation, s5 arm slot, s6 release point, s7 follow-through, s8 command)';

  const contextLines: string[] = [];
  if (athleteName) contextLines.push(`ATHLETE: ${athleteName}`);
  if (title) contextLines.push(`SESSION: ${title}`);
  if (notes) contextLines.push(`COACH NOTES: ${notes}`);
  const contextText = contextLines.length ? contextLines.join('\n') + '\n\n' : '';

  return `You are QBIQ, an expert baseball mechanics coach and video analyst. You are given raw frame-by-frame observations of ${subject}, and you must produce a rubric-based technical analysis on the 20-80 scouting scale.

${contextText}${knowledge}

INSTRUCTIONS:
1. Read every frame observation carefully. Map each to the rubric slots ${phaseList}.
2. Score every rubric slot s1-s8 on the 20-80 scale based ONLY on evidence in the observations. Differentiate scores — do NOT give the same value to every slot.
3. Composite = round(average of s1..s8). The 20-80 scouting scale: 50 is below-average, 60 is solid-average, 70 is plus, 80 is elite for that age. For youth/HS amateur video, most slots will be 40-65; 70+ only when truly exceptional evidence exists.
4. In frame_evidence, include ONE entry for EVERY frame (frame_index 0..${frameCount - 1}). Reference which s-slot the frame informs.
5. Identify 2-4 specific mechanical STRENGTHS and 2-4 specific WEAKNESSES — actionable focus areas, not generic praise.
6. Recommend 3-5 DRILLS tailored to the weaknesses (use drill names from the knowledge base when applicable, but it's fine to invent specific ones too). Each drill has priority: critical / high / medium / maintenance.
7. highRoiFix: ONE sentence — the single highest-ROI mechanical fix to work on for the next 6 weeks. Concrete and coachable, not vague.
8. Set confidence (0.0-1.0) based on athlete visibility and frame coverage.

ANTI-HALLUCINATION RULES:
- Do NOT invent mechanics you didn't see in the observations.
- Do NOT give round numbers (50, 60, 70) for all slots — differentiate based on evidence.
- If the athlete wasn't visible in a phase, score that slot conservatively (45-55) and reference the limitation in your reasoning.
- summary should be 2-3 sentences, professional, scouting-report tone.`;
}

async function runPass2(
  openai: OpenAI,
  observations: any[],
  kind: 'swing' | 'pitching',
  frameCount: number,
  athleteName?: string,
  title?: string,
  notes?: string,
): Promise<BaseballPass2Response> {
  const systemPrompt = buildPass2Prompt(kind, frameCount, athleteName, title, notes);
  const obsBlock = JSON.stringify(observations, null, 2);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    seed: 42,
    max_tokens: 2500,
    response_format: {
      type: 'json_schema',
      json_schema: BASEBALL_PASS2_SCHEMA as any,
    },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `FRAME OBSERVATIONS (${frameCount} frames, kind=${kind}):\n${obsBlock}\n\nProduce the rubric analysis now.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Pass 2 returned malformed JSON');
  }

  // Defensive clamps in case the model drifts outside 20-80.
  const result: BaseballPass2Response = {
    kind: (parsed.kind === 'swing' || parsed.kind === 'pitching') ? parsed.kind : kind,
    s1: clampScore(parsed.s1),
    s2: clampScore(parsed.s2),
    s3: clampScore(parsed.s3),
    s4: clampScore(parsed.s4),
    s5: clampScore(parsed.s5),
    s6: clampScore(parsed.s6),
    s7: clampScore(parsed.s7),
    s8: clampScore(parsed.s8),
    composite: 0,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 6) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 6) : [],
    drills: Array.isArray(parsed.drills) ? parsed.drills.slice(0, 6) : [],
    highRoiFix: typeof parsed.highRoiFix === 'string' ? parsed.highRoiFix : '',
    frame_evidence: Array.isArray(parsed.frame_evidence) ? parsed.frame_evidence : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  };
  result.composite = Math.round(
    (result.s1 + result.s2 + result.s3 + result.s4 + result.s5 + result.s6 + result.s7 + result.s8) / 8,
  );
  return result;
}

// ── Route ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const kind: 'swing' | 'pitching' = body.kind === 'pitching' ? 'pitching' : 'swing';
    const frames: string[] = Array.isArray(body.frames)
      ? body.frames.filter((f: any) => typeof f === 'string' && f.startsWith('data:image/'))
      : [];

    if (frames.length < MIN_FRAMES) {
      return NextResponse.json(
        { error: `Need at least ${MIN_FRAMES} frame, got ${frames.length}` },
        { status: 400 },
      );
    }
    if (frames.length > MAX_FRAMES) {
      // Subsample evenly to MAX_FRAMES
      const step = frames.length / MAX_FRAMES;
      const picked: string[] = [];
      for (let i = 0; i < MAX_FRAMES; i++) picked.push(frames[Math.floor(i * step)]);
      frames.length = 0;
      frames.push(...picked);
    }

    const athleteName: string | undefined = typeof body.athleteName === 'string' ? body.athleteName : undefined;
    const title: string | undefined = typeof body.title === 'string' ? body.title : undefined;
    const notes: string | undefined = typeof body.notes === 'string' ? body.notes : undefined;

    const openai = getOpenAI();

    const result = await withTimeout(
      (async () => {
        const observations = await runPass1(openai, frames, kind);
        const pass2 = await runPass2(openai, observations, kind, frames.length, athleteName, title, notes);
        return pass2;
      })(),
      ANALYSIS_TIMEOUT_MS,
      'AI analysis',
    );

    const elapsedMs = Date.now() - t0;
    return NextResponse.json({ ...result, _meta: { elapsedMs, frameCount: frames.length, kind } });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    const status = msg.includes('timed out') ? 504 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/scout/analyze',
    method: 'POST',
    body: { kind: 'swing | pitching', frames: 'data-url[]', athleteName: '?', title: '?', notes: '?' },
  });
}
