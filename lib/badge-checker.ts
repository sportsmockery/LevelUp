// Badge definitions and auto-award logic for LevelUp.

import { Pass2Response } from './analysis-schema';

export type BadgeDef = {
  key: string;
  label: string;
  icon: string;
  check: (analysis: Pass2Response, analysisCount: number) => boolean;
};

export const BADGE_DEFINITIONS: BadgeDef[] = [
  // Score-based badges
  { key: 'elite_score', label: 'Elite Performer', icon: 'trophy', check: (a) => a.overall_score >= 90 },
  { key: 'advanced_score', label: 'Advanced Wrestler', icon: 'star', check: (a) => a.overall_score >= 80 },
  { key: 'solid_score', label: 'Solid Fundamentals', icon: 'shield', check: (a) => a.overall_score >= 70 },

  // Position excellence
  { key: 'standing_master', label: 'Standing Master', icon: 'zap', check: (a) => a.position_scores.standing >= 85 },
  { key: 'top_dominator', label: 'Top Dominator', icon: 'crown', check: (a) => a.position_scores.top >= 85 },
  { key: 'escape_artist', label: 'Escape Artist', icon: 'wind', check: (a) => a.position_scores.bottom >= 85 },

  // Stat badges
  { key: 'takedown_machine', label: 'Takedown Machine', icon: 'target', check: (a) => (a.match_stats?.takedowns_scored ?? 0) >= 3 },
  { key: 'pin_artist', label: 'Pin Artist', icon: 'lock', check: (a) => (a.match_stats?.pins_scored ?? 0) >= 1 },
  { key: 'near_fall_threat', label: 'Near Fall Threat', icon: 'flame', check: (a) => (a.match_stats?.near_falls_scored ?? 0) >= 2 },

  // Milestone badges
  { key: 'first_analysis', label: 'First Upload', icon: 'upload', check: (_, count) => count >= 1 },
  { key: 'five_analyses', label: '5 Videos Analyzed', icon: 'film', check: (_, count) => count >= 5 },
  { key: 'ten_analyses', label: '10 Videos Analyzed', icon: 'award', check: (_, count) => count >= 10 },
  { key: 'twenty_analyses', label: 'Dedicated Wrestler', icon: 'medal', check: (_, count) => count >= 20 },

  // Conditioning
  { key: 'iron_lungs', label: 'Iron Lungs', icon: 'heart', check: (a) => !a.fatigue_analysis.conditioning_flag && a.fatigue_analysis.score_delta >= -3 },
  { key: 'high_confidence', label: 'Crystal Clear', icon: 'eye', check: (a) => a.confidence >= 0.85 },
];

export function checkBadges(analysis: Pass2Response, analysisCount: number): BadgeDef[] {
  return BADGE_DEFINITIONS.filter((b) => b.check(analysis, analysisCount));
}
