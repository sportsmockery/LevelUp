import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { analysisId, frameIndex, coachId, coachName, annotations } = body;

    if (!analysisId || frameIndex === undefined || !coachId || !annotations || !Array.isArray(annotations)) {
      return NextResponse.json(
        { error: 'analysisId, frameIndex, coachId, and annotations array are required' },
        { status: 400 },
      );
    }

    // Validate each annotation
    const validTypes = ['drawing', 'text', 'voice'];
    for (const annotation of annotations) {
      if (!validTypes.includes(annotation.annotationType)) {
        return NextResponse.json(
          { error: `Invalid annotation type: ${annotation.annotationType}` },
          { status: 400 },
        );
      }
    }

    // Insert all annotations
    const records = annotations.map((annotation: any) => ({
      analysis_id: analysisId,
      frame_index: frameIndex,
      coach_id: coachId,
      coach_name: coachName || 'Coach',
      annotation_type: annotation.annotationType,
      drawing_data: annotation.drawingData || null,
      text_content: annotation.textContent || null,
      voice_url: annotation.voiceUrl || null,
      voice_duration_seconds: annotation.voiceDurationSeconds || null,
      position: annotation.position || null,
      timestamp: annotation.timestamp || null,
    }));

    const { data, error } = await supabase
      .from('frame_annotations')
      .insert(records)
      .select('id');

    if (error) {
      console.error('[LevelUp] Annotation save error:', error);
      return NextResponse.json({ error: 'Failed to save annotations' }, { status: 500 });
    }

    // Update annotation count on the analysis
    const { data: countResult } = await supabase
      .from('frame_annotations')
      .select('id', { count: 'exact' })
      .eq('analysis_id', analysisId);

    if (countResult) {
      await supabase
        .from('match_analyses')
        .update({ annotation_count: countResult.length })
        .eq('id', analysisId);
    }

    console.log(`[LevelUp] Saved ${records.length} annotations for analysis ${analysisId} frame ${frameIndex}`);

    return NextResponse.json({
      success: true,
      ids: data?.map((d: any) => d.id) || [],
      count: records.length,
    });

  } catch (err: any) {
    console.error('[LevelUp] Annotation save error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
