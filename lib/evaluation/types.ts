// Gold-standard evaluation types for the LevelUp analysis pipeline.
// Used to compare AI analysis against coach-labeled ground truth.

export type GoldLabel = {
  matchId: string;
  videoUri: string;
  coachName: string;
  labeledAt: string;
  matchStyle: string;
  overall_score: number;
  position_scores: { standing: number; top: number; bottom: number };
  sub_scores: {
    standing: { stance_motion: number; shot_selection: number; shot_finishing: number; sprawl_defense: number; reattacks_chains: number };
    top: { ride_tightness: number; breakdowns: number; turns_nearfalls: number; mat_returns: number };
    bottom: { base_posture: number; standups: number; sitouts_switches: number; reversals: number };
  };
  techniques_observed: string[];
  key_moments: Array<{
    frame_index: number;
    type: 'takedown' | 'escape' | 'reversal' | 'near_fall' | 'pin_attempt' | 'other';
    description: string;
    scorer: 'athlete' | 'opponent';
  }>;
  match_result: { result: 'win' | 'loss' | 'draw'; result_type: string };
  notes: string;
};

export type EvaluationResult = {
  matchId: string;
  overall_mae: number;
  position_mae: { standing: number; top: number; bottom: number };
  technique_recall: number;
  technique_precision: number;
  key_moment_recall: number;
  winner_correct: boolean;
};

export type RegressionThresholds = {
  max_overall_mae: number;
  max_position_mae: number;
  min_technique_recall: number;
  min_key_moment_recall: number;
  min_winner_accuracy: number;
};

export type EvaluationRunSummary = {
  runId: string;
  timestamp: string;
  pipelineVersion: string;
  matchCount: number;
  avg_overall_mae: number;
  avg_position_mae: { standing: number; top: number; bottom: number };
  avg_technique_recall: number;
  avg_key_moment_recall: number;
  winner_accuracy: number;
  passed: boolean;
  failedChecks: string[];
};
