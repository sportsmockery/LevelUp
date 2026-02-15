import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import {
  computeCalibrationMetric,
  computeCalibrationSummary,
  type CoachScore,
  type AIScore,
  type CalibrationMetric,
} from '../../../../lib/confidence-calibration';

// GET /api/admin/calibration — Get calibration summary and individual metrics
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Fetch all coach scores with their corresponding AI analysis scores
  const { data: coachScores, error: csError } = await supabase
    .from('coach_scores')
    .select('*')
    .order('scored_at', { ascending: false });

  if (csError) {
    return NextResponse.json({ error: csError.message }, { status: 500 });
  }

  if (!coachScores || coachScores.length === 0) {
    return NextResponse.json({
      summary: computeCalibrationSummary([]),
      metrics: [],
    });
  }

  // Fetch corresponding AI analyses
  const analysisIds = coachScores.map((cs: any) => cs.analysis_id);
  const { data: analyses, error: aError } = await supabase
    .from('match_analyses')
    .select('id, overall_score, standing, top, bottom, confidence, identity_confidence')
    .in('id', analysisIds);

  if (aError) {
    return NextResponse.json({ error: aError.message }, { status: 500 });
  }

  // Compute metrics for each comparison
  const analysisMap = new Map((analyses || []).map((a: any) => [a.id, a]));
  const metrics: CalibrationMetric[] = [];

  for (const cs of coachScores as any[]) {
    const analysis = analysisMap.get(cs.analysis_id) as any;
    if (!analysis) continue;

    const aiScore: AIScore = {
      analysis_id: analysis.id,
      overall_score: analysis.overall_score,
      position_scores: { standing: analysis.standing, top: analysis.top, bottom: analysis.bottom },
      confidence: analysis.confidence ?? 0.5,
      identity_confidence: analysis.identity_confidence,
    };

    const coachScore: CoachScore = {
      analysis_id: cs.analysis_id,
      coach_id: cs.coach_id,
      overall_score: cs.overall_score,
      position_scores: cs.position_scores || { standing: 0, top: 0, bottom: 0 },
      sub_scores: cs.sub_scores,
      techniques_observed: cs.techniques_observed,
      scoring_events: cs.scoring_events,
      notes: cs.notes,
      scored_at: cs.scored_at,
    };

    metrics.push(computeCalibrationMetric(aiScore, coachScore));
  }

  const summary = computeCalibrationSummary(metrics);

  return NextResponse.json({ summary, metrics, coach_scores: coachScores });
}

// POST /api/admin/calibration — Submit a new coach score for an analysis
export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { analysis_id, coach_id, overall_score, position_scores, sub_scores, techniques_observed, scoring_events, notes } = body;

  if (!analysis_id || !coach_id || overall_score === undefined) {
    return NextResponse.json(
      { error: 'analysis_id, coach_id, and overall_score are required' },
      { status: 400 },
    );
  }

  if (typeof overall_score !== 'number' || overall_score < 0 || overall_score > 100) {
    return NextResponse.json(
      { error: 'overall_score must be a number between 0 and 100' },
      { status: 400 },
    );
  }

  // Verify the analysis exists
  const { data: analysis, error: aError } = await supabase
    .from('match_analyses')
    .select('id')
    .eq('id', analysis_id)
    .single();

  if (aError || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  // Insert coach score
  const { data, error } = await supabase
    .from('coach_scores')
    .insert({
      analysis_id,
      coach_id,
      overall_score,
      position_scores: position_scores || null,
      sub_scores: sub_scores || null,
      techniques_observed: techniques_observed || null,
      scoring_events: scoring_events || null,
      notes: notes || null,
      scored_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data?.id });
}
