// Profile stats: fetches from Supabase API or falls back to local AsyncStorage data.

import { getAnalysisSummaries, AnalysisSummary } from './storage';
import { getAthleteProfile, getScoreTrends, getRecurringWeaknesses, getPositionImprovement } from './athlete-tracking';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://levelup-chris-burhans-projects.vercel.app';

export type ProfileStats = {
  record: { wins: number; losses: number; draws: number };
  avgScore: number;
  videoCount: number;
  winRate: number;
  pinRate: number;
  avgDuration: number;
  perMatchStats: { takedowns: number; nearFalls: number; escapes: number };
  badges: Array<{ badge_key: string; badge_label: string; badge_icon: string; awarded_at: string }>;
  levelHistory: Array<{ event_type: string; title: string; subtitle: string; created_at: string }>;
  scoreTrend: Array<{ date: string; score: number }>;
  positionTrend: {
    standing: Array<{ date: string; score: number }>;
    top: Array<{ date: string; score: number }>;
    bottom: Array<{ date: string; score: number }>;
  };
  recurringWeaknesses: Array<{ weakness: string; count: number }>;
  positionImprovement: {
    standing: { first: number; latest: number; delta: number };
    top: { first: number; latest: number; delta: number };
    bottom: { first: number; latest: number; delta: number };
    overall: { first: number; latest: number; delta: number };
  } | null;
};

export async function getProfileStats(athleteId?: string): Promise<ProfileStats> {
  // Try API first
  try {
    const url = `${API_BASE}/api/profile-stats${athleteId ? `?athlete_id=${athleteId}` : ''}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data.videoCount > 0) {
        // Supplement with local recurring weakness analysis
        const profile = await getAthleteProfile();
        return {
          ...data,
          recurringWeaknesses: getRecurringWeaknesses(profile),
          positionImprovement: getPositionImprovement(profile),
        };
      }
    }
  } catch {
    // API unavailable, fall back to local
  }

  return computeLocalStats();
}

async function computeLocalStats(): Promise<ProfileStats> {
  const summaries = await getAnalysisSummaries();
  const profile = await getAthleteProfile();

  const videoCount = summaries.length;
  const avgScore = videoCount > 0
    ? Math.round(summaries.reduce((s, a) => s + a.overallScore, 0) / videoCount)
    : 0;

  const wins = summaries.filter((a) => a.matchResult === 'win').length;
  const losses = summaries.filter((a) => a.matchResult === 'loss').length;
  const draws = summaries.filter((a) => a.matchResult === 'draw').length;
  const determined = wins + losses + draws;

  const pins = summaries.filter((a) => a.resultType === 'pin' && a.matchResult === 'win').length;

  // Score trend from athlete tracking (richer data)
  const trends = getScoreTrends(profile, 20);
  const scoreTrend = trends.dates.map((date, i) => ({ date, score: trends.overall[i] }));
  const positionTrend = {
    standing: trends.dates.map((date, i) => ({ date, score: trends.standing[i] })),
    top: trends.dates.map((date, i) => ({ date, score: trends.top[i] })),
    bottom: trends.dates.map((date, i) => ({ date, score: trends.bottom[i] })),
  };

  // Milestone badges from local count
  const badges: ProfileStats['badges'] = [];
  if (videoCount >= 1) badges.push({ badge_key: 'first_analysis', badge_label: 'First Upload', badge_icon: 'upload', awarded_at: summaries[videoCount - 1]?.createdAt || '' });
  if (videoCount >= 5) badges.push({ badge_key: 'five_analyses', badge_label: '5 Videos Analyzed', badge_icon: 'film', awarded_at: summaries[4]?.createdAt || '' });
  if (videoCount >= 10) badges.push({ badge_key: 'ten_analyses', badge_label: '10 Videos Analyzed', badge_icon: 'award', awarded_at: summaries[9]?.createdAt || '' });
  // Score-based badges from latest
  if (summaries.length > 0 && summaries[0].overallScore >= 90) badges.push({ badge_key: 'elite_score', badge_label: 'Elite Performer', badge_icon: 'trophy', awarded_at: summaries[0].createdAt });
  if (summaries.length > 0 && summaries[0].overallScore >= 80) badges.push({ badge_key: 'advanced_score', badge_label: 'Advanced Wrestler', badge_icon: 'star', awarded_at: summaries[0].createdAt });

  // Level history from local timestamps
  const levelHistory = summaries.slice(0, 20).map((s) => ({
    event_type: 'analysis',
    title: `Scored ${s.overallScore}`,
    subtitle: `${s.videoFileName}`,
    created_at: s.createdAt,
  }));

  return {
    record: { wins, losses, draws },
    avgScore,
    videoCount,
    winRate: determined > 0 ? Math.round((wins / determined) * 100) : 0,
    pinRate: wins > 0 ? Math.round((pins / wins) * 100) : 0,
    avgDuration: 0, // Not available locally
    perMatchStats: { takedowns: 0, nearFalls: 0, escapes: 0 }, // Not available locally
    badges,
    levelHistory,
    scoreTrend,
    positionTrend,
    recurringWeaknesses: getRecurringWeaknesses(profile),
    positionImprovement: getPositionImprovement(profile),
  };
}
