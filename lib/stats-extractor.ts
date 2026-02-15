// Extract match stats from a Pass2Response for Supabase persistence.

import { Pass2Response } from './analysis-schema';

export type ExtractedStats = {
  takedowns_scored: number;
  takedowns_allowed: number;
  reversals_scored: number;
  escapes_scored: number;
  near_falls_scored: number;
  pins_scored: number;
};

export function extractMatchStats(result: Pass2Response): ExtractedStats {
  const stats: ExtractedStats = {
    takedowns_scored: 0,
    takedowns_allowed: 0,
    reversals_scored: 0,
    escapes_scored: 0,
    near_falls_scored: 0,
    pins_scored: 0,
  };

  // If the model returned match_stats directly, use them
  if (result.match_stats) {
    return { ...result.match_stats };
  }

  // Fallback: parse from frame_evidence actions prefixed with ATHLETE/OPPONENT
  for (const fe of result.frame_evidence) {
    const action = fe.action.toLowerCase();
    const isAthlete = action.startsWith('athlete:');
    const isOpponent = action.startsWith('opponent:');

    if (isAthlete) {
      if (action.includes('takedown')) stats.takedowns_scored++;
      if (action.includes('reversal')) stats.reversals_scored++;
      if (action.includes('escape')) stats.escapes_scored++;
      if (action.includes('near fall') || action.includes('near_fall')) stats.near_falls_scored++;
      if (action.includes('pin')) stats.pins_scored++;
    } else if (isOpponent) {
      if (action.includes('takedown')) stats.takedowns_allowed++;
    }
  }

  return stats;
}
