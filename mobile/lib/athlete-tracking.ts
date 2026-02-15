import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisResult, EnrichedSubScores, FatigueAnalysis } from './types';

const TRACKING_KEY = '@levelup/athlete_tracking';

export type TrackedAnalysis = {
  id: string;
  matchDate: string;
  opponentName?: string;
  competitionName?: string;
  weightClass?: string;
  matchStyle: string;
  overallScore: number;
  standingScore: number;
  topScore: number;
  bottomScore: number;
  subScores?: EnrichedSubScores;
  strengths: string[];
  weaknesses: string[];
  confidence?: number;
  fatigueFlag?: boolean;
  fatigueDelta?: number;
};

export type AthleteProfile = {
  analyses: TrackedAnalysis[];
};

// Get the full athlete profile
export async function getAthleteProfile(): Promise<AthleteProfile> {
  const raw = await AsyncStorage.getItem(TRACKING_KEY);
  if (!raw) return { analyses: [] };
  try {
    return JSON.parse(raw) as AthleteProfile;
  } catch {
    return { analyses: [] };
  }
}

// Track a new analysis result
export async function trackAnalysis(
  result: AnalysisResult,
  metadata?: {
    opponentName?: string;
    competitionName?: string;
    weightClass?: string;
    matchStyle?: string;
  },
): Promise<void> {
  const profile = await getAthleteProfile();

  const tracked: TrackedAnalysis = {
    id: `track_${Date.now()}`,
    matchDate: new Date().toISOString(),
    opponentName: metadata?.opponentName,
    competitionName: metadata?.competitionName,
    weightClass: metadata?.weightClass,
    matchStyle: metadata?.matchStyle || 'folkstyle',
    overallScore: result.overall_score,
    standingScore: result.position_scores.standing,
    topScore: result.position_scores.top,
    bottomScore: result.position_scores.bottom,
    subScores: result.enriched?.sub_scores,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    confidence: result.enriched?.confidence,
    fatigueFlag: result.enriched?.fatigue_analysis?.conditioning_flag,
    fatigueDelta: result.enriched?.fatigue_analysis?.score_delta,
  };

  profile.analyses.unshift(tracked);

  // Keep last 100 analyses
  if (profile.analyses.length > 100) {
    profile.analyses = profile.analyses.slice(0, 100);
  }

  await AsyncStorage.setItem(TRACKING_KEY, JSON.stringify(profile));
}

// Get score trends (last N analyses)
export function getScoreTrends(profile: AthleteProfile, limit = 20): {
  dates: string[];
  overall: number[];
  standing: number[];
  top: number[];
  bottom: number[];
} {
  const recent = profile.analyses.slice(0, limit).reverse();
  return {
    dates: recent.map((a) => a.matchDate),
    overall: recent.map((a) => a.overallScore),
    standing: recent.map((a) => a.standingScore),
    top: recent.map((a) => a.topScore),
    bottom: recent.map((a) => a.bottomScore),
  };
}

// Get recurring weaknesses (appear in 3+ analyses)
export function getRecurringWeaknesses(profile: AthleteProfile): { weakness: string; count: number }[] {
  const weaknessCount = new Map<string, number>();

  for (const analysis of profile.analyses) {
    for (const weakness of analysis.weaknesses) {
      const normalized = weakness.toLowerCase().trim();
      weaknessCount.set(normalized, (weaknessCount.get(normalized) || 0) + 1);
    }
  }

  return Array.from(weaknessCount.entries())
    .filter(([_, count]) => count >= 3)
    .map(([weakness, count]) => ({ weakness, count }))
    .sort((a, b) => b.count - a.count);
}

// Get position improvement over time
export function getPositionImprovement(profile: AthleteProfile): {
  standing: { first: number; latest: number; delta: number };
  top: { first: number; latest: number; delta: number };
  bottom: { first: number; latest: number; delta: number };
  overall: { first: number; latest: number; delta: number };
} | null {
  if (profile.analyses.length < 2) return null;

  const oldest = profile.analyses[profile.analyses.length - 1];
  const newest = profile.analyses[0];

  return {
    standing: { first: oldest.standingScore, latest: newest.standingScore, delta: newest.standingScore - oldest.standingScore },
    top: { first: oldest.topScore, latest: newest.topScore, delta: newest.topScore - oldest.topScore },
    bottom: { first: oldest.bottomScore, latest: newest.bottomScore, delta: newest.bottomScore - oldest.bottomScore },
    overall: { first: oldest.overallScore, latest: newest.overallScore, delta: newest.overallScore - oldest.overallScore },
  };
}

// Get fatigue frequency
export function getFatigueStats(profile: AthleteProfile): {
  totalAnalyses: number;
  fatigueCount: number;
  averageDelta: number;
} {
  const withFatigue = profile.analyses.filter((a) => a.fatigueFlag === true);
  const deltas = profile.analyses.filter((a) => a.fatigueDelta !== undefined).map((a) => a.fatigueDelta!);
  return {
    totalAnalyses: profile.analyses.length,
    fatigueCount: withFatigue.length,
    averageDelta: deltas.length > 0 ? Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length) : 0,
  };
}
