import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json();

  // Coach validation flow (from /coach/validate)
  if (body.coach_name && body.scores) {
    const { coach_name, coach_certification, scores, notes, time_spent_minutes } = body;

    // Insert into expert_validations table
    const { data, error: insertError } = await supabase
      .from('expert_validations')
      .insert({
        analysis_id: id,
        coach_id: crypto.randomUUID(), // Generate ID for anonymous coaches
        coach_name,
        coach_certification: coach_certification || null,
        scores,
        notes: notes || null,
        time_spent_minutes: time_spent_minutes || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[LevelUp] Coach validation insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Check for disagreements (>10 point delta on any category)
    const { data: analysis } = await supabase
      .from('match_analyses')
      .select('overall_score, standing, top, bottom')
      .eq('id', id)
      .single();

    if (analysis && data) {
      const disagreements: Array<Record<string, unknown>> = [];
      const categories = [
        { cat: 'overall', ai: analysis.overall_score, coach: scores.overall },
        { cat: 'standing', ai: analysis.standing, coach: scores.standing },
        { cat: 'top', ai: analysis.top, coach: scores.top },
        { cat: 'bottom', ai: analysis.bottom, coach: scores.bottom },
      ];

      for (const { cat, ai, coach } of categories) {
        const delta = Math.abs(ai - coach);
        if (delta > 10) {
          disagreements.push({
            analysis_id: id,
            validation_id: data.id,
            category: cat,
            ai_score: ai,
            coach_score: coach,
            delta,
            coach_reasoning: notes || null,
          });
        }
      }

      if (disagreements.length > 0) {
        await supabase.from('validation_disagreements').insert(disagreements);
      }

      // Update analysis with validation count
      const { count } = await supabase
        .from('expert_validations')
        .select('id', { count: 'exact', head: true })
        .eq('analysis_id', id);

      await supabase
        .from('match_analyses')
        .update({ expert_validation_count: count || 1 })
        .eq('id', id);
    }

    console.log(`[LevelUp] Coach validation submitted for analysis ${id} by ${coach_name}`);
    return NextResponse.json({ success: true, validationId: data?.id });
  }

  // Admin review flow (original)
  const { reviewed_by, corrected_json } = body;

  if (!reviewed_by) {
    return NextResponse.json({ error: 'reviewed_by or coach_name is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('match_analyses')
    .update({
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      ...(corrected_json ? { corrected_json } : {}),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
