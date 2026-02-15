import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { annotationId, coachId, sharedWithUserIds } = body;

    if (!annotationId || !coachId) {
      return NextResponse.json(
        { error: 'annotationId and coachId are required' },
        { status: 400 },
      );
    }

    // Verify the annotation exists and belongs to this coach
    const { data: annotation, error: fetchError } = await supabase
      .from('frame_annotations')
      .select('id, coach_id')
      .eq('id', annotationId)
      .single();

    if (fetchError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    if (annotation.coach_id !== coachId) {
      return NextResponse.json({ error: 'Only the annotation author can share it' }, { status: 403 });
    }

    // Generate share token
    const shareToken = crypto.randomUUID();

    const { data: share, error: insertError } = await supabase
      .from('shared_annotations')
      .insert({
        annotation_id: annotationId,
        shared_with_user_ids: sharedWithUserIds || [],
        share_token: shareToken,
      })
      .select('id, share_token, created_at')
      .single();

    if (insertError) {
      console.error('[LevelUp] Share annotation error:', insertError);
      return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
    }

    console.log(`[LevelUp] Annotation ${annotationId} shared with token ${shareToken}`);

    return NextResponse.json({
      success: true,
      shareId: share?.id,
      shareToken: share?.share_token,
      shareUrl: `/shared/${share?.share_token}`,
      createdAt: share?.created_at,
    });

  } catch (err: any) {
    console.error('[LevelUp] Share annotation error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

// GET endpoint to view a shared annotation by token
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
    }

    const { data: share, error: shareError } = await supabase
      .from('shared_annotations')
      .select('*, frame_annotations(*)')
      .eq('share_token', token)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Shared annotation not found' }, { status: 404 });
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    const annotation = share.frame_annotations;
    return NextResponse.json({
      annotation: {
        id: annotation.id,
        analysisId: annotation.analysis_id,
        frameIndex: annotation.frame_index,
        coachName: annotation.coach_name,
        annotationType: annotation.annotation_type,
        drawingData: annotation.drawing_data,
        textContent: annotation.text_content,
        voiceUrl: annotation.voice_url,
        voiceDurationSeconds: annotation.voice_duration_seconds,
        position: annotation.position,
        timestamp: annotation.timestamp,
        createdAt: annotation.created_at,
      },
      readOnly: true,
    });

  } catch (err: any) {
    console.error('[LevelUp] Get shared annotation error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
