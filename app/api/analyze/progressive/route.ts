import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '../../../../lib/supabase';
import { buildQuickPass1Prompt, buildQuickPass2Prompt, QUICK_PASS2_SCHEMA, QUICK_PASS1_MAX_TOKENS, QUICK_PASS2_MAX_TOKENS } from '../../../../lib/quick-analysis';

export const maxDuration = 60;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
}

/**
 * POST: Submit a chunk of frames for progressive analysis.
 * Creates or continues a progressive session.
 *
 * Request body:
 * - sessionId?: string — Existing session ID to continue, or omit to start new
 * - frames: string[] — Base64 frame images for this chunk
 * - matchStyle?: string — Wrestling style
 * - athletePosition?: 'left' | 'right'
 * - isLastChunk?: boolean — Set true to trigger final analysis
 *
 * Response:
 * - sessionId: string
 * - chunkIndex: number
 * - currentScores: { overall, standing, top, bottom } — Progressive scores so far
 * - status: 'processing' | 'complete'
 * - finalAnalysisId?: string — Set when isLastChunk=true and final analysis is saved
 */
export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { sessionId, frames, matchStyle = 'folkstyle', athletePosition, isLastChunk = false } = body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json({ error: 'frames array is required' }, { status: 400 });
    }

    const openai = getOpenAI();

    // Get or create session
    let session: any;
    if (sessionId) {
      const { data, error } = await supabase
        .from('progressive_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      session = data;
    } else {
      const { data, error } = await supabase
        .from('progressive_sessions')
        .insert({
          athlete_id: '00000000-0000-0000-0000-000000000000',
          match_style: matchStyle,
          status: 'active',
        })
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }
      session = data;
    }

    // Run quick analysis on this chunk
    const chunkIndex = session.chunks_completed || 0;

    // Build frame content for Pass 1
    const frameContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    frames.forEach((frame: string, i: number) => {
      const globalIdx = (session.frames_received || 0) + i;
      frameContent.push({ type: 'text' as const, text: `[Frame ${globalIdx}]` });
      frameContent.push({
        type: 'image_url' as const,
        image_url: {
          url: frame.startsWith('data:') ? frame : `data:image/jpeg;base64,${frame}`,
          detail: 'low' as const,
        },
      });
    });

    // Quick Pass 1
    const pass1Response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildQuickPass1Prompt(undefined, athletePosition) },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Observe these ${frames.length} frames. Describe what you see.` },
            ...frameContent,
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: QUICK_PASS1_MAX_TOKENS,
      temperature: 0,
      seed: 42,
    });

    const pass1Content = pass1Response.choices[0]?.message?.content;
    if (!pass1Content) {
      return NextResponse.json(
        { error: 'Progressive analysis failed: Pass 1 returned empty response' },
        { status: 500 },
      );
    }

    let observations: any[];
    try {
      const parsed = JSON.parse(pass1Content);
      observations = parsed.observations || [];
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `Progressive analysis failed: Pass 1 JSON parse error — ${parseErr?.message || 'invalid JSON'}` },
        { status: 500 },
      );
    }

    if (observations.length === 0) {
      return NextResponse.json(
        { error: `Progressive analysis failed: Pass 1 returned zero observations for ${frames.length} frames` },
        { status: 500 },
      );
    }

    // Quick Pass 2 for progressive score
    const observationsText = observations
      .map((obs: any) => `Frame ${obs.frame_index}: ${obs.athlete_position}, ${obs.action}, visible=${obs.wrestler_visible}`)
      .join('\n');

    const pass2Response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildQuickPass2Prompt(matchStyle, frames.length) },
        { role: 'user', content: `Frame observations:\n\n${observationsText}\n\nScore this wrestler. Be concise.` },
      ],
      response_format: { type: 'json_schema', json_schema: QUICK_PASS2_SCHEMA },
      max_tokens: QUICK_PASS2_MAX_TOKENS,
      temperature: 0,
      seed: 42,
    });

    const pass2Content = pass2Response.choices[0]?.message?.content;
    if (!pass2Content) {
      return NextResponse.json(
        { error: 'Progressive analysis failed: Pass 2 returned empty response' },
        { status: 500 },
      );
    }

    let chunkScores: { overall: number; standing: number; top: number; bottom: number };
    try {
      const parsed = JSON.parse(pass2Content);
      chunkScores = {
        overall: parsed.overall_score || 0,
        standing: parsed.position_scores?.standing || 0,
        top: parsed.position_scores?.top || 0,
        bottom: parsed.position_scores?.bottom || 0,
      };
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `Progressive analysis failed: Pass 2 JSON parse error — ${parseErr?.message || 'invalid JSON'}` },
        { status: 500 },
      );
    }

    // Compute progressive weighted average with previous chunks
    const prevScores = (session.current_scores as any) || { overall: 0, standing: 0, top: 0, bottom: 0 };
    const prevWeight = chunkIndex;
    const totalWeight = prevWeight + 1;

    const progressiveScores = {
      overall: Math.round((prevScores.overall * prevWeight + chunkScores.overall) / totalWeight),
      standing: Math.round((prevScores.standing * prevWeight + chunkScores.standing) / totalWeight),
      top: Math.round((prevScores.top * prevWeight + chunkScores.top) / totalWeight),
      bottom: Math.round((prevScores.bottom * prevWeight + chunkScores.bottom) / totalWeight),
    };

    // Update session
    const newStatus = isLastChunk ? 'complete' : 'active';
    await supabase
      .from('progressive_sessions')
      .update({
        frames_received: (session.frames_received || 0) + frames.length,
        frames_processed: (session.frames_processed || 0) + observations.length,
        chunks_completed: chunkIndex + 1,
        current_scores: progressiveScores,
        status: newStatus,
        last_activity_at: new Date().toISOString(),
        ...(isLastChunk ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', session.id);

    // If last chunk, save final analysis to match_analyses in background
    let finalAnalysisId: string | undefined;
    if (isLastChunk) {
      const { data: finalRecord } = await supabase
        .from('match_analyses')
        .insert({
          athlete_id: session.athlete_id,
          overall_score: progressiveScores.overall,
          standing: progressiveScores.standing,
          top: progressiveScores.top,
          bottom: progressiveScores.bottom,
          match_style: matchStyle,
          pipeline_version: 'progressive',
          job_status: 'complete',
        })
        .select('id')
        .single();

      if (finalRecord) {
        finalAnalysisId = finalRecord.id;
        await supabase
          .from('progressive_sessions')
          .update({ final_analysis_id: finalRecord.id })
          .eq('id', session.id);
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      chunkIndex: chunkIndex + 1,
      framesProcessed: (session.frames_received || 0) + frames.length,
      currentScores: progressiveScores,
      chunkScores,
      status: newStatus,
      ...(finalAnalysisId ? { finalAnalysisId } : {}),
    });

  } catch (err: any) {
    console.error('[LevelUp] Progressive analysis error:', err);
    return NextResponse.json({ error: err?.message || 'Progressive analysis failed' }, { status: 500 });
  }
}

/**
 * GET: Check progressive session status and current scores.
 */
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId query param required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('progressive_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      sessionId: data.id,
      status: data.status,
      framesReceived: data.frames_received,
      framesProcessed: data.frames_processed,
      chunksCompleted: data.chunks_completed,
      currentScores: data.current_scores,
      finalAnalysisId: data.final_analysis_id,
      startedAt: data.started_at,
      lastActivityAt: data.last_activity_at,
      completedAt: data.completed_at,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to check session' }, { status: 500 });
  }
}
