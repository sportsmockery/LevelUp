import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { supabaseServer } from '../../../../lib/supabase-server';
import { requireAuth } from '../../../../lib/auth-check';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    const {
      matchDate,
      opponentName,
      opponentSchool,
      weightClass,
      matchResult,
      winLossType,
      matchScoreDetail,
      competitionName,
      roundNumber,
      matchNotes,
      matchStyle,
    } = body;

    if (!opponentName?.trim()) {
      return NextResponse.json(
        { error: 'Opponent name is required' },
        { status: 400 },
      );
    }
    if (!matchResult || !['win', 'loss'].includes(matchResult)) {
      return NextResponse.json(
        { error: 'Match result must be "win" or "loss"' },
        { status: 400 },
      );
    }
    if (!winLossType) {
      return NextResponse.json(
        { error: 'Win/loss type is required' },
        { status: 400 },
      );
    }

    // Map winLossType to result_type format used by the rest of the system
    const resultTypeMap: Record<string, string> = {
      Fall: 'pin',
      TF: 'tech_fall',
      MD: 'major_decision',
      Dec: 'decision',
      Forfeit: 'forfeit',
    };

    const { data, error } = await db
      .from('match_analyses')
      .insert({
        athlete_id: auth.user.id,
        match_date: matchDate || new Date().toISOString().split('T')[0],
        opponent_name: opponentName.trim(),
        opponent_school: opponentSchool?.trim() || null,
        weight_class: weightClass?.trim() || null,
        match_result: matchResult,
        result_type: resultTypeMap[winLossType] || winLossType.toLowerCase(),
        win_loss_type: winLossType,
        match_score_detail: matchScoreDetail?.trim() || null,
        competition_name: competitionName?.trim() || null,
        match_style: matchStyle || null,
        overall_score: 0,
        standing: 0,
        top: 0,
        bottom: 0,
        is_manual_entry: true,
        job_status: 'complete',
        analysis_json: null,
        strengths: matchNotes ? [matchNotes] : [],
        weaknesses: [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('[LevelUp] Manual entry insert error:', error.message);
      return NextResponse.json(
        { error: 'Failed to save match' },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (err: any) {
    console.error('[LevelUp] Manual entry error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
