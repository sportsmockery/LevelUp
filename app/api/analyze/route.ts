import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
}

const SYSTEM_PROMPT = `You are an expert youth wrestling coach and video analyst. You analyze wrestling match footage frame by frame.

Given images from a wrestling match, provide a detailed technical analysis in the following JSON format ONLY (no markdown, no extra text):

{
  "overall_score": <number 0-100>,
  "position_scores": {
    "standing": <number 0-100>,
    "top": <number 0-100>,
    "bottom": <number 0-100>
  },
  "strengths": [<3 specific technique strengths observed>],
  "weaknesses": [<2-3 specific areas needing improvement>],
  "drills": [<3 specific drill recommendations with reps/sets>],
  "summary": "<2-3 sentence overall assessment>"
}

Scoring guide:
- 90-100: Elite technique, state/national level
- 80-89: Advanced, very clean execution
- 70-79: Solid fundamentals, some areas to polish
- 60-69: Developing, clear weaknesses to address
- Below 60: Beginner, focus on fundamentals

Be specific about wrestling techniques (e.g., "high crotch finish", "tight waist ride", "stand-up from bottom"). Reference actual positions and transitions you observe. Drills should directly address the weaknesses found.`;

export async function POST(request: NextRequest) {
  try {
    const { frames } = await request.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: 'No frames provided. Send base64 image frames.' },
        { status: 400 }
      );
    }

    const openai = getOpenAI();

    // Build the message with image frames
    const imageMessages: OpenAI.Chat.Completions.ChatCompletionContentPart[] = frames.map(
      (frame: string) => ({
        type: 'image_url' as const,
        image_url: {
          url: frame.startsWith('data:') ? frame : `data:image/jpeg;base64,${frame}`,
          detail: 'low' as const, // Keep costs down, sufficient for wrestling analysis
        },
      })
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze these ${frames.length} frames from a youth wrestling match. Provide technique scores, strengths, weaknesses, and drill recommendations.`,
            },
            ...imageMessages,
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response (strip any markdown fences if present)
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleaned);

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
    return NextResponse.json({
      overall_score: Math.floor(68 + Math.random() * 28),
      position_scores: {
        standing: Math.floor(70 + Math.random() * 25),
        top: Math.floor(60 + Math.random() * 30),
        bottom: Math.floor(75 + Math.random() * 20),
      },
      strengths: ['Explosive level change', 'Tight waist rides', 'High-crotch finish'],
      weaknesses: ['Late sprawl reaction', 'Weak scramble defense'],
      drills: [
        '10x Chain wrestling shots (focus on re-attacks)',
        '5x30s Sprawl + shot reaction drill',
        '3x8 Tight-waist tilts from top',
      ],
      summary: 'Analysis ran in fallback mode. Upload video frames for real AI feedback.',
      xp: 150,
      model: 'fallback',
      framesAnalyzed: 0,
    });
  }
}
