import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ frameId: string }> },
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { frameId } = await params;

    // frameId format: "analysisId:frameIndex"
    const [analysisId, frameIndexStr] = frameId.split(':');
    const frameIndex = parseInt(frameIndexStr, 10);

    if (!analysisId || isNaN(frameIndex)) {
      return NextResponse.json(
        { error: 'frameId must be in format "analysisId:frameIndex"' },
        { status: 400 },
      );
    }

    const { data: annotations, error } = await supabase
      .from('frame_annotations')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('frame_index', frameIndex)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[LevelUp] Annotation load error:', error);
      return NextResponse.json({ error: 'Failed to load annotations' }, { status: 500 });
    }

    // Group by coach
    const groupedByCoach: Record<string, {
      coachId: string;
      coachName: string;
      annotations: any[];
    }> = {};

    for (const ann of (annotations || [])) {
      const coachId = ann.coach_id || 'unknown';
      if (!groupedByCoach[coachId]) {
        groupedByCoach[coachId] = {
          coachId,
          coachName: ann.coach_name || 'Coach',
          annotations: [],
        };
      }
      groupedByCoach[coachId].annotations.push({
        id: ann.id,
        annotationType: ann.annotation_type,
        drawingData: ann.drawing_data,
        textContent: ann.text_content,
        voiceUrl: ann.voice_url,
        voiceDurationSeconds: ann.voice_duration_seconds,
        position: ann.position,
        timestamp: ann.timestamp,
        createdAt: ann.created_at,
        updatedAt: ann.updated_at,
      });
    }

    return NextResponse.json({
      analysisId,
      frameIndex,
      totalAnnotations: annotations?.length || 0,
      groups: Object.values(groupedByCoach),
    });

  } catch (err: any) {
    console.error('[LevelUp] Annotation load error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
