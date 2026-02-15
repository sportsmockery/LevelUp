import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
}

export const maxDuration = 30;

const IDENTIFY_PROMPT = `You are identifying two wrestlers in a wrestling match frame.

Describe each wrestler with enough detail to distinguish them throughout the match:
1. Singlet/uniform primary color and any secondary colors, patterns, or text
2. Position in this frame (left side or right side)
3. Any other distinguishing features (headgear color, skin tone contrast, hair color/length, relative body size)

Return JSON:
{
  "wrestler_a": {
    "position": "left" or "right",
    "uniform_description": "e.g., Red singlet with white side stripe",
    "distinguishing_features": "e.g., Black headgear, shorter build",
    "bounding_box_pct": { "x": 0.1, "y": 0.2, "w": 0.35, "h": 0.7 }
  },
  "wrestler_b": {
    "position": "left" or "right",
    "uniform_description": "e.g., Blue singlet, solid color",
    "distinguishing_features": "e.g., Red headgear, taller build",
    "bounding_box_pct": { "x": 0.55, "y": 0.15, "w": 0.4, "h": 0.75 }
  },
  "confidence": 0.9
}

bounding_box_pct values are percentages of image dimensions (0-1).
confidence is 0-1 indicating how distinct the two wrestlers are visually.
If wrestlers are heavily overlapping and hard to separate, do your best to identify the most visible distinguishing features of each and note this in distinguishing_features. Set confidence lower in that case.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frame } = body;

    if (!frame || typeof frame !== 'string') {
      return NextResponse.json(
        { error: 'No frame provided. Send a base64 image frame.' },
        { status: 400 }
      );
    }

    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      seed: 42,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IDENTIFY_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${frame}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: 'No response from model' },
        { status: 500 }
      );
    }

    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[identify-wrestler] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Wrestler identification failed' },
      { status: 500 }
    );
  }
}
