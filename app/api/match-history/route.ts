import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { supabaseServer } from '../../../lib/supabase-server';
import { requireAuth } from '../../../lib/auth-check';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 },
    );
  }

  const { searchParams } = request.nextUrl;
  const athleteId = searchParams.get('athlete_id') || auth.user.id;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

  try {
    const { data: rows, error } = await db
      .from('match_analyses')
      .select(
        'id, created_at, opponent_name, opponent_school, opponent_weight_class, match_result, result_type, match_duration_sec, overall_score, standing, top, bottom, competition_name, weight_class, match_style, analysis_json, job_status, is_manual_entry, match_score_detail, win_loss_type',
      )
      .eq('athlete_id', athleteId)
      .not('job_status', 'in', '("processing","failed")')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[LevelUp] match-history query error:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch match history' },
        { status: 500 },
      );
    }

    const matches = (rows || []).map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      opponentName: row.opponent_name || null,
      opponentSchool: row.opponent_school || null,
      matchResult: row.match_result || null,
      resultType: row.result_type || null,
      matchDurationSec: row.match_duration_sec || null,
      overallScore: row.overall_score || 0,
      standing: row.standing || 0,
      top: row.top || 0,
      bottom: row.bottom || 0,
      competitionName: row.competition_name || null,
      weightClass: row.weight_class || null,
      matchStyle: row.match_style || null,
      hasVideo: !!row.analysis_json,
      isManualEntry: row.is_manual_entry || false,
      matchScoreDetail: row.match_score_detail || null,
      winLossType: row.win_loss_type || null,
    }));

    // Compute opponent summaries by grouping on opponent_name (case-insensitive)
    const opponentMap = new Map<
      string,
      {
        name: string;
        school: string | null;
        weightClass: string | null;
        matchCount: number;
        wins: number;
        losses: number;
        lastFacedDate: string;
        totalScore: number;
      }
    >();

    for (const m of matches) {
      if (!m.opponentName) continue;
      const key = m.opponentName.toLowerCase().trim();
      const existing = opponentMap.get(key);
      const isWin =
        m.matchResult === 'win' || m.matchResult === 'W';
      const isLoss =
        m.matchResult === 'loss' || m.matchResult === 'L';

      if (existing) {
        existing.matchCount++;
        if (isWin) existing.wins++;
        if (isLoss) existing.losses++;
        existing.totalScore += m.overallScore;
        if (m.createdAt > existing.lastFacedDate) {
          existing.lastFacedDate = m.createdAt;
          // Update school/weight if more recent
          if (m.opponentSchool) existing.school = m.opponentSchool;
          if (m.weightClass) existing.weightClass = m.weightClass;
        }
      } else {
        opponentMap.set(key, {
          name: m.opponentName,
          school: m.opponentSchool,
          weightClass: m.weightClass,
          matchCount: 1,
          wins: isWin ? 1 : 0,
          losses: isLoss ? 1 : 0,
          lastFacedDate: m.createdAt,
          totalScore: m.overallScore,
        });
      }
    }

    const opponents = Array.from(opponentMap.values())
      .map((o) => ({
        name: o.name,
        school: o.school,
        weightClass: o.weightClass,
        matchCount: o.matchCount,
        wins: o.wins,
        losses: o.losses,
        lastFacedDate: o.lastFacedDate,
        avgScore: Math.round(o.totalScore / o.matchCount),
      }))
      .sort((a, b) => b.lastFacedDate.localeCompare(a.lastFacedDate));

    return NextResponse.json({
      matches,
      opponents,
      total: matches.length,
    });
  } catch (err: any) {
    console.error('[LevelUp] match-history error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
