export type PositionReasoning = {
  standing: string;
  top: string;
  bottom: string;
};

export type WrestlingPosition = 'standing' | 'top' | 'bottom' | 'transition' | 'other';

export type FrameAnnotation = {
  frame_number: number;
  position: WrestlingPosition;
  action: string;
  is_key_moment: boolean;
  key_moment_type?: string;
  detail: string;
  wrestler_visible?: boolean;
  rubric_impact?: string;
  confidence?: number; // 0.0-1.0 frame-level confidence
};

export const SINGLET_COLORS = [
  { label: 'Red', value: 'red', hex: '#EF4444' },
  { label: 'Blue', value: 'blue', hex: '#2563EB' },
  { label: 'Green', value: 'green', hex: '#22C55E' },
  { label: 'Yellow', value: 'yellow', hex: '#EAB308' },
  { label: 'Black', value: 'black', hex: '#3F3F46' },
  { label: 'White', value: 'white', hex: '#E4E4E7' },
  { label: 'Gray', value: 'gray', hex: '#71717A' },
] as const;

export type MatchStyle = 'youth_folkstyle' | 'folkstyle' | 'hs_folkstyle' | 'college_folkstyle' | 'freestyle' | 'grecoRoman';

export type BoundingBoxPct = { x: number; y: number; w: number; h: number };

export type WrestlerDetection = {
  position: 'left' | 'right';
  uniform_description: string;
  distinguishing_features: string;
  bounding_box_pct: BoundingBoxPct;
};

export type WrestlerIdentificationResult = {
  wrestler_a: WrestlerDetection;
  wrestler_b: WrestlerDetection;
  confidence?: number;
};

export type AthleteIdentification = {
  position_in_id_frame: 'left' | 'right';
  uniform_description: string;
  distinguishing_features: string;
  bounding_box_pct: BoundingBoxPct;
};
export type AnalysisMode = 'athlete' | 'opponent';

export type EnrichedSubScores = {
  standing: { stance_motion: number; shot_selection: number; shot_finishing: number; sprawl_defense: number; reattacks_chains: number };
  top: { ride_tightness: number; breakdowns: number; turns_nearfalls: number; mat_returns: number };
  bottom: { base_posture: number; standups: number; sitouts_switches: number; reversals: number };
};

export type FrameEvidence = {
  frame_index: number;
  position: string;
  action: string;
  is_key_moment: boolean;
  key_moment_type: string;
  detail: string;
  wrestler_visible: boolean;
  rubric_impact: string;
};

export type EnrichedDrill = {
  name: string;
  description: string;
  reps: string;
  priority: string;
  addresses: string;
};

export type FatigueAnalysis = {
  first_half_score: number;
  second_half_score: number;
  score_delta: number;
  stance_height_change: string;
  reaction_time_change: string;
  shot_quality_change: string;
  scoring_rate_change: string;
  conditioning_flag: boolean;
  conditioning_notes: string;
};

export type MatchContext = {
  weightClass?: string;
  competitionName?: string;
  roundNumber?: number;
  daysFromWeighIn?: number;
};

export type EnrichedAnalysis = {
  confidence: number;
  sub_scores: EnrichedSubScores;
  frame_evidence: FrameEvidence[];
  drills: EnrichedDrill[];
  fatigue_analysis?: FatigueAnalysis;
};

export type OpponentScoutingResult = {
  opponent_profile: { estimated_skill_level: string; primary_style: string; stance: string };
  attack_patterns: Array<{ technique: string; frequency: string; setup: string; effectiveness: string; counter_recommendation: string }>;
  defense_patterns: Array<{ situation: string; typical_response: string; vulnerability: string }>;
  position_tendencies: { standing: string; top: string; bottom: string };
  conditioning_indicators: string;
  gameplan: { period1: string; period2: string; if_ahead: string; if_behind: string; key_techniques: string[] };
  summary: string;
};

export type MatchStats = {
  takedowns_scored: number;
  takedowns_allowed: number;
  reversals_scored: number;
  escapes_scored: number;
  near_falls_scored: number;
  pins_scored: number;
};

export type MatchResult = {
  result: string;
  result_type: string;
  match_duration_seconds: number;
};

export type AnalysisResult = {
  overall_score: number;
  position_scores: { standing: number; top: number; bottom: number };
  position_reasoning?: PositionReasoning;
  frame_annotations?: FrameAnnotation[];
  strengths: string[];
  weaknesses: string[];
  drills: string[];
  summary: string;
  xp: number;
  model: string;
  framesAnalyzed: number;
  match_result?: MatchResult;
  match_stats?: MatchStats;
  enriched?: EnrichedAnalysis;
  scouting?: OpponentScoutingResult;
};

export type AnalysisHistoryEntry = {
  id: string;
  createdAt: string;
  thumbnailUri: string;
  frameUris?: string[];
  frameTimestamps?: number[];
  videoUri?: string;
  videoFileName: string;
  videoDurationSeconds: number;
  singletColors: string[];
  result: AnalysisResult;
};
