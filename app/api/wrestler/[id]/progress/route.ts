import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: wrestlerProfileId } = await params;

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Fetch wrestler profile
    const { data: profile, error: profileError } = await supabase
      .from('wrestler_profiles')
      .select('*')
      .eq('id', wrestlerProfileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Wrestler profile not found' }, { status: 404 });
    }

    // Fetch all analyses for this wrestler, ordered by match date
    const { data: analyses, error: analysesError } = await supabase
      .from('match_analyses')
      .select('id, overall_score, standing, top, bottom, sub_scores, strengths, weaknesses, match_date, opponent_name, competition_name, confidence, created_at')
      .eq('wrestler_profile_id', wrestlerProfileId)
      .order('match_date', { ascending: true, nullsFirst: false });

    if (analysesError) {
      console.error('[LevelUp] Error fetching analyses:', analysesError);
      return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
    }

    if (!analyses || analyses.length === 0) {
      return NextResponse.json({
        profile,
        totalMatches: 0,
        overallTrend: null,
        categoryTrends: null,
        recurringWeaknesses: [],
        matchSummaries: [],
      });
    }

    // Compute trends
    const matchSummaries = analyses.map((a: any, idx: number) => ({
      analysisId: a.id,
      matchSequence: idx + 1,
      matchDate: a.match_date || a.created_at,
      overallScore: a.overall_score,
      standing: a.standing,
      top: a.top,
      bottom: a.bottom,
      opponentName: a.opponent_name,
      competitionName: a.competition_name,
    }));

    // Overall trend
    const firstMatch = analyses[0] as any;
    const latestMatch = analyses[analyses.length - 1] as any;
    const overallDelta = latestMatch.overall_score - firstMatch.overall_score;
    const overallRate = analyses.length > 1
      ? overallDelta / (analyses.length - 1)
      : 0;

    // Category trends
    const computeCategoryTrend = (scores: number[]) => {
      if (scores.length < 2) return { delta: 0, rate: 0, trend: 'stable' as const };
      const delta = scores[scores.length - 1] - scores[0];
      const rate = delta / (scores.length - 1);
      const trend = delta > 5 ? 'improving' as const : delta < -5 ? 'declining' as const : 'stable' as const;
      return { delta, rate, trend };
    };

    const standingTrend = computeCategoryTrend(analyses.map((a: any) => a.standing));
    const topTrend = computeCategoryTrend(analyses.map((a: any) => a.top));
    const bottomTrend = computeCategoryTrend(analyses.map((a: any) => a.bottom));

    // Recurring weaknesses — find weaknesses that appear in 3+ matches
    const allWeaknesses = analyses.map((a: any) => (a.weaknesses || []) as string[]);
    const weaknessCount: Record<string, { count: number; indices: number[] }> = {};
    allWeaknesses.forEach((matchWeaknesses: string[], idx: number) => {
      const seen = new Set<string>();
      for (const w of matchWeaknesses) {
        const key = w.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        if (!weaknessCount[key]) weaknessCount[key] = { count: 0, indices: [] };
        weaknessCount[key].count++;
        weaknessCount[key].indices.push(idx + 1);
      }
    });

    const recurringWeaknesses = Object.entries(weaknessCount)
      .filter(([, v]) => v.count >= Math.min(3, Math.ceil(analyses.length * 0.5)))
      .map(([weakness, v]) => ({
        weakness,
        occurrences: v.count,
        totalMatches: analyses.length,
        matchIndices: v.indices,
      }))
      .sort((a, b) => b.occurrences - a.occurrences);

    // Best position
    const avgStanding = analyses.reduce((s: number, a: any) => s + a.standing, 0) / analyses.length;
    const avgTop = analyses.reduce((s: number, a: any) => s + a.top, 0) / analyses.length;
    const avgBottom = analyses.reduce((s: number, a: any) => s + a.bottom, 0) / analyses.length;
    const bestPosition = avgStanding >= avgTop && avgStanding >= avgBottom ? 'standing'
      : avgTop >= avgBottom ? 'top' : 'bottom';

    // Biggest improvement
    const improvements = [
      { category: 'standing', delta: standingTrend.delta },
      { category: 'top', delta: topTrend.delta },
      { category: 'bottom', delta: bottomTrend.delta },
    ];
    const biggestImprovement = improvements.reduce((best, curr) =>
      curr.delta > best.delta ? curr : best
    );

    // Fetch longitudinal trends if they exist
    const { data: trends } = await supabase
      .from('longitudinal_trends')
      .select('*')
      .eq('wrestler_profile_id', wrestlerProfileId)
      .order('match_sequence', { ascending: true });

    return NextResponse.json({
      profile,
      totalMatches: analyses.length,
      overallTrend: {
        firstMatch: firstMatch.overall_score,
        latestMatch: latestMatch.overall_score,
        delta: overallDelta,
        improvementRate: Math.round(overallRate * 10) / 10,
      },
      categoryTrends: {
        standing: { ...standingTrend, first: firstMatch.standing, latest: latestMatch.standing },
        top: { ...topTrend, first: firstMatch.top, latest: latestMatch.top },
        bottom: { ...bottomTrend, first: firstMatch.bottom, latest: latestMatch.bottom },
      },
      recurringWeaknesses,
      bestPosition,
      biggestImprovement,
      matchSummaries,
      longitudinalTrends: trends || [],
    });

  } catch (err: any) {
    console.error('[LevelUp] Wrestler progress error:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
