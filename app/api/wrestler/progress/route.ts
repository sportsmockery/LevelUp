import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { supabaseServer } from '../../../../lib/supabase-server';
import { requireAuth } from '../../../../lib/auth-check';

// Keywords for classifying strengths/weaknesses by position
const STANDING_KEYWORDS = ['takedown', 'shot', 'stance', 'motion', 'penetration', 'level change', 'sprawl', 'hand fight', 'setup', 'fake', 'head position', 'reattack', 'chain', 'snap', 'underhook', 'collar tie', 'single leg', 'double leg', 'high crotch', 'ankle pick', 'duck under', 'circle', 'neutral'];
const TOP_KEYWORDS = ['ride', 'riding', 'breakdown', 'tilt', 'turn', 'half nelson', 'cradle', 'arm bar', 'near fall', 'back exposure', 'leg ride', 'waist', 'chest', 'spiral', 'mat return', 'chop', 'tight waist', 'top position', 'pin'];
const BOTTOM_KEYWORDS = ['escape', 'stand up', 'standup', 'sit out', 'sitout', 'switch', 'reversal', 'base', 'posture', 'tripod', 'granby', 'hip heist', 'wrist control', 'bottom position', 'hand control'];

function classifyPosition(text: string): 'standing' | 'top' | 'bottom' | null {
  const lower = text.toLowerCase();
  let standingScore = 0;
  let topScore = 0;
  let bottomScore = 0;

  for (const kw of STANDING_KEYWORDS) {
    if (lower.includes(kw)) standingScore++;
  }
  for (const kw of TOP_KEYWORDS) {
    if (lower.includes(kw)) topScore++;
  }
  for (const kw of BOTTOM_KEYWORDS) {
    if (lower.includes(kw)) bottomScore++;
  }

  const max = Math.max(standingScore, topScore, bottomScore);
  if (max === 0) return null;
  if (standingScore === max) return 'standing';
  if (topScore === max) return 'top';
  return 'bottom';
}

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
  const requestedUserId = searchParams.get('userId');

  // Determine which athlete's data to fetch
  let athleteId = auth.user.id;

  // If userId is provided, verify parent has approved connection
  if (requestedUserId && requestedUserId !== auth.user.id) {
    const { data: connection } = await db
      .from('family_connections')
      .select('id')
      .eq('parent_user_id', auth.user.id)
      .eq('athlete_user_id', requestedUserId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (!connection) {
      return NextResponse.json(
        { error: 'Not authorized to view this athlete\'s data' },
        { status: 403 },
      );
    }
    athleteId = requestedUserId;
  }

  try {
    // Fetch all completed analyses for this athlete
    const { data: rows, error } = await db
      .from('match_analyses')
      .select(
        'id, created_at, opponent_name, match_result, overall_score, standing, top, bottom, strengths, weaknesses, analysis_json, is_manual_entry',
      )
      .eq('athlete_id', athleteId)
      .not('job_status', 'in', '("processing","failed")')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[LevelUp] wrestler/progress query error:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch progress data' },
        { status: 500 },
      );
    }

    const analyses = rows || [];

    // Basic stats
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalScore = 0;

    for (const row of analyses) {
      const result = (row as any).match_result;
      if (result === 'win' || result === 'W') wins++;
      else if (result === 'loss' || result === 'L') losses++;
      else if (result === 'draw' || result === 'D') draws++;
      totalScore += (row as any).overall_score || 0;
    }

    const totalMatches = analyses.length;
    const avgScore = totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0;

    // Score arrays — video analyses only (have analysis_json)
    const videoAnalyses = analyses.filter((r: any) => !!r.analysis_json);
    let seq = 0;
    const overallScores = videoAnalyses.map((r: any) => {
      seq++;
      return {
        date: r.created_at,
        score: r.overall_score || 0,
        matchSequence: seq,
      };
    });

    const positionScores = {
      standing: videoAnalyses.map((r: any, i: number) => ({
        date: r.created_at,
        score: r.standing || 0,
        matchSequence: i + 1,
      })),
      top: videoAnalyses.map((r: any, i: number) => ({
        date: r.created_at,
        score: r.top || 0,
        matchSequence: i + 1,
      })),
      bottom: videoAnalyses.map((r: any, i: number) => ({
        date: r.created_at,
        score: r.bottom || 0,
        matchSequence: i + 1,
      })),
    };

    // Position averages
    const vLen = videoAnalyses.length || 1;
    const positionAverages = {
      standing: Math.round(videoAnalyses.reduce((s: number, r: any) => s + (r.standing || 0), 0) / vLen),
      top: Math.round(videoAnalyses.reduce((s: number, r: any) => s + (r.top || 0), 0) / vLen),
      bottom: Math.round(videoAnalyses.reduce((s: number, r: any) => s + (r.bottom || 0), 0) / vLen),
    };

    // Position trends (same logic as wrestler/[id]/progress)
    const computeTrend = (scores: number[]) => {
      if (scores.length < 2) return { delta: 0, trend: 'stable' as const };
      const delta = scores[scores.length - 1] - scores[0];
      const trend = delta > 5 ? 'improving' as const : delta < -5 ? 'declining' as const : 'stable' as const;
      return { delta, trend };
    };

    const positionTrends = {
      standing: computeTrend(videoAnalyses.map((r: any) => r.standing || 0)),
      top: computeTrend(videoAnalyses.map((r: any) => r.top || 0)),
      bottom: computeTrend(videoAnalyses.map((r: any) => r.bottom || 0)),
    };

    // Per-position strengths and weaknesses (top 2 each)
    const posStrengths: Record<string, Map<string, number>> = {
      standing: new Map(), top: new Map(), bottom: new Map(),
    };
    const posWeaknesses: Record<string, Map<string, number>> = {
      standing: new Map(), top: new Map(), bottom: new Map(),
    };

    for (const row of analyses) {
      const strengths = ((row as any).strengths || []) as string[];
      const weaknesses = ((row as any).weaknesses || []) as string[];

      for (const s of strengths) {
        const pos = classifyPosition(s);
        if (pos) {
          const key = s.toLowerCase().trim();
          posStrengths[pos].set(key, (posStrengths[pos].get(key) || 0) + 1);
        }
      }
      for (const w of weaknesses) {
        const pos = classifyPosition(w);
        if (pos) {
          const key = w.toLowerCase().trim();
          posWeaknesses[pos].set(key, (posWeaknesses[pos].get(key) || 0) + 1);
        }
      }
    }

    const topN = (map: Map<string, number>, n: number, position: string) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([text]) => ({ text, position }));

    const topStrengths = [
      ...topN(posStrengths.standing, 2, 'standing'),
      ...topN(posStrengths.top, 2, 'top'),
      ...topN(posStrengths.bottom, 2, 'bottom'),
    ];

    const topWeaknesses = [
      ...topN(posWeaknesses.standing, 2, 'standing'),
      ...topN(posWeaknesses.top, 2, 'top'),
      ...topN(posWeaknesses.bottom, 2, 'bottom'),
    ];

    // Recurring issues — weaknesses appearing in 50%+ of matches (up to 3)
    const weaknessCount = new Map<string, number>();
    for (const row of analyses) {
      const weaknesses = ((row as any).weaknesses || []) as string[];
      const seen = new Set<string>();
      for (const w of weaknesses) {
        const key = w.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        weaknessCount.set(key, (weaknessCount.get(key) || 0) + 1);
      }
    }

    const threshold = Math.max(1, Math.ceil(totalMatches * 0.5));
    const recurringIssues = Array.from(weaknessCount.entries())
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([weakness, occurrences]) => ({
        weakness,
        occurrences,
        totalMatches,
      }));

    // Recent matches — last 5 with score delta from previous
    const recentRows = [...analyses].reverse().slice(0, 5);
    const recentMatches = recentRows.map((r: any, i: number) => {
      // Find previous match to compute delta
      const allReversed = [...analyses].reverse();
      const nextOlder = allReversed[i + 1];
      const scoreDelta = nextOlder
        ? (r.overall_score || 0) - ((nextOlder as any).overall_score || 0)
        : null;

      return {
        id: r.id,
        date: r.created_at,
        opponentName: r.opponent_name || null,
        matchResult: r.match_result || null,
        overallScore: r.overall_score || 0,
        scoreDelta,
      };
    });

    return NextResponse.json({
      stats: { totalMatches, avgScore, wins, losses, draws },
      overallScores,
      positionScores,
      positionAverages,
      positionTrends,
      topStrengths,
      topWeaknesses,
      recurringIssues,
      recentMatches,
    });
  } catch (err: any) {
    console.error('[LevelUp] wrestler/progress error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
