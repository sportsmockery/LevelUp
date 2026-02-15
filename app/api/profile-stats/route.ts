import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

type AnalysisRow = {
  overall_score: number;
  standing: number;
  top: number;
  bottom: number;
  confidence: number | null;
  match_result: string | null;
  result_type: string | null;
  match_duration_sec: number | null;
  takedowns_scored: number | null;
  takedowns_allowed: number | null;
  reversals_scored: number | null;
  escapes_scored: number | null;
  near_falls_scored: number | null;
  pins_scored: number | null;
  created_at: string;
  competition_name: string | null;
  weight_class: string | null;
  fatigue_flag: boolean | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const athleteId = request.nextUrl.searchParams.get('athlete_id') || '00000000-0000-0000-0000-000000000000';

  try {
    const { data, error: analysesError } = await supabase
      .from('match_analyses')
      .select('overall_score, standing, top, bottom, confidence, match_result, result_type, match_duration_sec, takedowns_scored, takedowns_allowed, reversals_scored, escapes_scored, near_falls_scored, pins_scored, created_at, competition_name, weight_class, fatigue_flag, strengths, weaknesses')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (analysesError) throw analysesError;
    const analyses = (data || []) as AnalysisRow[];

    if (analyses.length === 0) {
      return NextResponse.json({
        record: { wins: 0, losses: 0, draws: 0 },
        avgScore: 0,
        videoCount: 0,
        winRate: 0,
        pinRate: 0,
        avgDuration: 0,
        perMatchStats: { takedowns: 0, nearFalls: 0, escapes: 0 },
        badges: [],
        levelHistory: [],
        scoreTrend: [],
        positionTrend: { standing: [], top: [], bottom: [] },
      });
    }

    const wins = analyses.filter((a: AnalysisRow) => a.match_result === 'win').length;
    const losses = analyses.filter((a: AnalysisRow) => a.match_result === 'loss').length;
    const draws = analyses.filter((a: AnalysisRow) => a.match_result === 'draw').length;
    const determined = wins + losses + draws;

    const avgScore = Math.round(analyses.reduce((s: number, a: AnalysisRow) => s + a.overall_score, 0) / analyses.length);
    const totalDuration = analyses.reduce((s: number, a: AnalysisRow) => s + (a.match_duration_sec || 0), 0);
    const avgDuration = Math.round(totalDuration / analyses.length);

    const totalTakedowns = analyses.reduce((s: number, a: AnalysisRow) => s + (a.takedowns_scored || 0), 0);
    const totalNearFalls = analyses.reduce((s: number, a: AnalysisRow) => s + (a.near_falls_scored || 0), 0);
    const totalEscapes = analyses.reduce((s: number, a: AnalysisRow) => s + (a.escapes_scored || 0), 0);
    const pins = analyses.filter((a: AnalysisRow) => a.result_type === 'pin' && a.match_result === 'win').length;

    const scoreTrend = analyses.slice(0, 20).reverse().map((a: AnalysisRow) => ({
      date: a.created_at,
      score: a.overall_score,
    }));

    const positionTrend = {
      standing: analyses.slice(0, 20).reverse().map((a: AnalysisRow) => ({ date: a.created_at, score: a.standing })),
      top: analyses.slice(0, 20).reverse().map((a: AnalysisRow) => ({ date: a.created_at, score: a.top })),
      bottom: analyses.slice(0, 20).reverse().map((a: AnalysisRow) => ({ date: a.created_at, score: a.bottom })),
    };

    const { data: badges } = await supabase
      .from('badges')
      .select('badge_key, badge_label, badge_icon, awarded_at')
      .eq('athlete_id', athleteId)
      .order('awarded_at', { ascending: false });

    const { data: levelHistory } = await supabase
      .from('level_history')
      .select('event_type, title, subtitle, created_at')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      record: { wins, losses, draws },
      avgScore,
      videoCount: analyses.length,
      winRate: determined > 0 ? Math.round((wins / determined) * 100) : 0,
      pinRate: wins > 0 ? Math.round((pins / wins) * 100) : 0,
      avgDuration,
      perMatchStats: {
        takedowns: +(totalTakedowns / analyses.length).toFixed(1),
        nearFalls: +(totalNearFalls / analyses.length).toFixed(1),
        escapes: +(totalEscapes / analyses.length).toFixed(1),
      },
      badges: badges || [],
      levelHistory: levelHistory || [],
      scoreTrend,
      positionTrend,
    });
  } catch (err: any) {
    console.error('[LevelUp] Profile stats error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch profile stats' }, { status: 500 });
  }
}
