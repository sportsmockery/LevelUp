import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { analysisId, sharedBy, visibility, includeVideoFrames, includeDrills, includeSubScores, expiresInDays } = body;

    if (!analysisId) {
      return NextResponse.json({ error: 'analysisId is required' }, { status: 400 });
    }

    // Verify analysis exists
    const { data: analysis, error: fetchError } = await supabase
      .from('match_analyses')
      .select('id, overall_score')
      .eq('id', analysisId)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Generate share token
    const token = generateShareToken();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('shared_analyses')
      .insert({
        analysis_id: analysisId,
        share_token: token,
        shared_by: sharedBy || 'anonymous',
        visibility: visibility || 'public',
        include_video_frames: includeVideoFrames ?? false,
        include_drills: includeDrills ?? true,
        include_sub_scores: includeSubScores ?? true,
        expires_at: expiresAt,
      })
      .select('id, share_token')
      .single();

    if (error) {
      console.error('[LevelUp] Share creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const shareUrl = `${request.nextUrl.origin}/shared/${token}`;

    return NextResponse.json({
      success: true,
      shareToken: token,
      shareUrl,
      shareId: data?.id,
      expiresAt,
    });

  } catch (err: any) {
    console.error('[LevelUp] Share error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create share link' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token query param required' }, { status: 400 });
  }

  try {
    // Fetch share record
    const { data: share, error: shareError } = await supabase
      .from('shared_analyses')
      .select('*')
      .eq('share_token', token)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Fetch analysis
    const { data: analysis, error: anaError } = await supabase
      .from('match_analyses')
      .select('id, overall_score, standing, top, bottom, sub_scores, strengths, weaknesses, match_style, competition_name, match_result, result_type, analysis_json, created_at')
      .eq('id', share.analysis_id)
      .single();

    if (anaError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Increment view count
    await supabase
      .from('shared_analyses')
      .update({ view_count: (share.view_count || 0) + 1 })
      .eq('id', share.id);

    // Build response based on share settings
    const response: Record<string, unknown> = {
      overallScore: analysis.overall_score,
      positionScores: {
        standing: analysis.standing,
        top: analysis.top,
        bottom: analysis.bottom,
      },
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      matchStyle: analysis.match_style,
      competitionName: analysis.competition_name,
      matchResult: analysis.match_result,
      resultType: analysis.result_type,
      createdAt: analysis.created_at,
      sharedBy: share.shared_by,
    };

    if (share.include_sub_scores && analysis.sub_scores) {
      response.subScores = analysis.sub_scores;
    }

    if (share.include_drills && analysis.analysis_json) {
      response.drills = (analysis.analysis_json as any)?.drills;
    }

    if (share.include_video_frames && analysis.analysis_json) {
      response.frameAnnotations = (analysis.analysis_json as any)?.frame_annotations;
    }

    return NextResponse.json(response);

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to load shared analysis' }, { status: 500 });
  }
}

function generateShareToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
