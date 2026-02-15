import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { computeLeaderboard, LeaderboardType } from '../../../../lib/leaderboard';

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const clubId = request.nextUrl.searchParams.get('clubId');
  const type = (request.nextUrl.searchParams.get('type') || 'overall') as LeaderboardType;
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

  if (!clubId) {
    return NextResponse.json({ error: 'clubId query param required' }, { status: 400 });
  }

  try {
    // Check for cached snapshot first (less than 24h old)
    const today = new Date().toISOString().split('T')[0];
    const { data: cached } = await supabase
      .from('club_leaderboard_snapshots')
      .select('rankings')
      .eq('club_id', clubId)
      .eq('leaderboard_type', type)
      .eq('snapshot_date', today)
      .single();

    if (cached?.rankings) {
      const rankings = cached.rankings as any[];
      return NextResponse.json({
        type,
        clubId,
        rankings: rankings.slice(0, limit),
        cached: true,
        cacheDate: today,
      });
    }

    // Compute fresh leaderboard
    // Fetch analyses for club members
    const { data: clubMembers } = await supabase
      .from('wrestler_profiles')
      .select('id, user_id, display_name')
      .eq('club_id', clubId);

    if (!clubMembers || clubMembers.length === 0) {
      return NextResponse.json({
        type,
        clubId,
        rankings: [],
        message: 'No club members found.',
      });
    }

    const memberIds = clubMembers.map((m: any) => m.user_id || m.id);
    const nameMap = new Map(clubMembers.map((m: any) => [m.user_id || m.id, m.display_name || 'Anonymous']));

    const { data: analyses, error: anaError } = await supabase
      .from('match_analyses')
      .select('athlete_id, overall_score, standing, top, bottom, created_at')
      .in('athlete_id', memberIds)
      .order('created_at', { ascending: true });

    if (anaError) {
      return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
    }

    // Add names to analyses
    const enrichedAnalyses = (analyses || []).map((a: any) => ({
      ...a,
      athlete_name: nameMap.get(a.athlete_id) || a.athlete_id.substring(0, 8),
    }));

    const rankings = computeLeaderboard(enrichedAnalyses, type).slice(0, limit);

    // Cache the snapshot
    await supabase
      .from('club_leaderboard_snapshots')
      .upsert({
        club_id: clubId,
        snapshot_date: today,
        leaderboard_type: type,
        rankings,
      }, { onConflict: 'club_id,snapshot_date,leaderboard_type' });

    return NextResponse.json({
      type,
      clubId,
      rankings,
      cached: false,
      memberCount: clubMembers.length,
    });

  } catch (err: any) {
    console.error('[LevelUp] Leaderboard error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to compute leaderboard' }, { status: 500 });
  }
}
