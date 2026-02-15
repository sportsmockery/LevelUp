// OpenAI Structured Outputs schema for Pass 2 reasoning response.
// Uses strict: true to guarantee the response matches this exact format.

export const PASS2_RESPONSE_SCHEMA = {
  name: 'wrestling_analysis',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      overall_score: { type: 'number' as const, description: 'Overall score 0-100, calculated as standing*0.4 + top*0.3 + bottom*0.3' },
      confidence: { type: 'number' as const, description: 'Confidence in this analysis 0.0-1.0 based on video quality, wrestler visibility, and frame coverage' },
      position_scores: {
        type: 'object' as const,
        properties: {
          standing: { type: 'number' as const },
          top: { type: 'number' as const },
          bottom: { type: 'number' as const },
        },
        required: ['standing', 'top', 'bottom'] as const,
        additionalProperties: false,
      },
      sub_scores: {
        type: 'object' as const,
        properties: {
          standing: {
            type: 'object' as const,
            properties: {
              stance_motion: { type: 'number' as const },
              shot_selection: { type: 'number' as const },
              shot_finishing: { type: 'number' as const },
              sprawl_defense: { type: 'number' as const },
              reattacks_chains: { type: 'number' as const },
            },
            required: ['stance_motion', 'shot_selection', 'shot_finishing', 'sprawl_defense', 'reattacks_chains'] as const,
            additionalProperties: false,
          },
          top: {
            type: 'object' as const,
            properties: {
              ride_tightness: { type: 'number' as const },
              breakdowns: { type: 'number' as const },
              turns_nearfalls: { type: 'number' as const },
              mat_returns: { type: 'number' as const },
            },
            required: ['ride_tightness', 'breakdowns', 'turns_nearfalls', 'mat_returns'] as const,
            additionalProperties: false,
          },
          bottom: {
            type: 'object' as const,
            properties: {
              base_posture: { type: 'number' as const },
              standups: { type: 'number' as const },
              sitouts_switches: { type: 'number' as const },
              reversals: { type: 'number' as const },
            },
            required: ['base_posture', 'standups', 'sitouts_switches', 'reversals'] as const,
            additionalProperties: false,
          },
        },
        required: ['standing', 'top', 'bottom'] as const,
        additionalProperties: false,
      },
      position_reasoning: {
        type: 'object' as const,
        properties: {
          standing: { type: 'string' as const, description: '2-3 sentences: techniques observed, what earned points, what lost points' },
          top: { type: 'string' as const, description: '2-3 sentences: techniques observed, what earned points, what lost points' },
          bottom: { type: 'string' as const, description: '2-3 sentences: techniques observed, what earned points, what lost points' },
        },
        required: ['standing', 'top', 'bottom'] as const,
        additionalProperties: false,
      },
      frame_evidence: {
        type: 'array' as const,
        description: 'Key frames that informed scoring decisions',
        items: {
          type: 'object' as const,
          properties: {
            frame_index: { type: 'number' as const, description: '0-based index into the frame array' },
            position: { type: 'string' as const, description: 'standing, top, bottom, transition, or other' },
            action: { type: 'string' as const, description: '3-6 word technique description' },
            is_key_moment: { type: 'boolean' as const },
            key_moment_type: { type: 'string' as const, description: 'takedown, escape, near_fall, reversal, pin_attempt, or empty string if not key moment' },
            detail: { type: 'string' as const, description: 'One sentence, max 30 words' },
            wrestler_visible: { type: 'boolean' as const },
            rubric_impact: { type: 'string' as const, description: 'Which sub-criteria this frame evidence impacts and how (e.g., "+3 Shot Finishing for clean high crotch drive-through")' },
          },
          required: ['frame_index', 'position', 'action', 'is_key_moment', 'key_moment_type', 'detail', 'wrestler_visible', 'rubric_impact'] as const,
          additionalProperties: false,
        },
      },
      strengths: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '3-5 specific technique strengths observed',
      },
      weaknesses: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '2-3 specific areas needing improvement, phrased as actionable focus areas',
      },
      drills: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            description: { type: 'string' as const },
            reps: { type: 'string' as const },
            priority: { type: 'string' as const, description: 'critical, high, medium, or maintenance' },
            addresses: { type: 'string' as const, description: 'Which weakness this drill addresses' },
          },
          required: ['name', 'description', 'reps', 'priority', 'addresses'] as const,
          additionalProperties: false,
        },
        description: '3-5 specific drill recommendations',
      },
      summary: { type: 'string' as const, description: '2-3 sentence overall assessment referencing the athlete by LevelUp name' },
      match_result: {
        type: 'object' as const,
        description: 'Match outcome if determinable from the video evidence',
        properties: {
          result: { type: 'string' as const, description: 'win, loss, draw, or unknown' },
          result_type: { type: 'string' as const, description: 'pin, tech_fall, major_decision, decision, or unknown' },
          match_duration_seconds: { type: 'number' as const, description: 'Estimated match duration in seconds based on frame timestamps, or 0 if unknown' },
        },
        required: ['result', 'result_type', 'match_duration_seconds'] as const,
        additionalProperties: false,
      },
      match_stats: {
        type: 'object' as const,
        description: 'Count of scoring actions observed in the video',
        properties: {
          takedowns_scored: { type: 'number' as const },
          takedowns_allowed: { type: 'number' as const },
          reversals_scored: { type: 'number' as const },
          escapes_scored: { type: 'number' as const },
          near_falls_scored: { type: 'number' as const },
          pins_scored: { type: 'number' as const },
        },
        required: ['takedowns_scored', 'takedowns_allowed', 'reversals_scored', 'escapes_scored', 'near_falls_scored', 'pins_scored'] as const,
        additionalProperties: false,
      },
      fatigue_analysis: {
        type: 'object' as const,
        description: 'Compare technique quality between first half and second half of frames to detect fatigue',
        properties: {
          first_half_score: { type: 'number' as const, description: 'Estimated overall technique score for first half of frames (0-100)' },
          second_half_score: { type: 'number' as const, description: 'Estimated overall technique score for second half of frames (0-100)' },
          score_delta: { type: 'number' as const, description: 'second_half - first_half (negative means deterioration)' },
          stance_height_change: { type: 'string' as const, description: 'Did stance get higher/more upright in second half? Describe change.' },
          reaction_time_change: { type: 'string' as const, description: 'Did defensive reactions slow down? Describe evidence.' },
          shot_quality_change: { type: 'string' as const, description: 'Did shot attempts become less explosive or less committed?' },
          scoring_rate_change: { type: 'string' as const, description: 'Did scoring attempts or successful scores decrease in second half?' },
          conditioning_flag: { type: 'boolean' as const, description: 'True if score drops >10 points first half to second half — flag conditioning as priority' },
          conditioning_notes: { type: 'string' as const, description: 'Summary of fatigue indicators and conditioning recommendation' },
        },
        required: ['first_half_score', 'second_half_score', 'score_delta', 'stance_height_change', 'reaction_time_change', 'shot_quality_change', 'scoring_rate_change', 'conditioning_flag', 'conditioning_notes'] as const,
        additionalProperties: false,
      },
    },
    required: [
      'overall_score', 'confidence', 'position_scores', 'sub_scores',
      'position_reasoning', 'frame_evidence', 'strengths', 'weaknesses',
      'drills', 'summary', 'match_result', 'match_stats', 'fatigue_analysis',
    ] as const,
    additionalProperties: false,
  },
} as const;

// Scouting-specific schema for opponent analysis mode
export const OPPONENT_SCOUTING_SCHEMA = {
  name: 'opponent_scouting',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      opponent_profile: {
        type: 'object' as const,
        properties: {
          estimated_skill_level: { type: 'string' as const, description: 'Elite, Advanced, Solid, Developing, or Beginner' },
          primary_style: { type: 'string' as const, description: 'e.g., Aggressive shooter, Counter wrestler, Scrambler, etc.' },
          stance: { type: 'string' as const, description: 'Orthodox, Southpaw, or Switches' },
        },
        required: ['estimated_skill_level', 'primary_style', 'stance'] as const,
        additionalProperties: false,
      },
      attack_patterns: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            technique: { type: 'string' as const },
            frequency: { type: 'string' as const, description: 'primary, secondary, or occasional' },
            setup: { type: 'string' as const, description: 'How they set up this attack' },
            effectiveness: { type: 'string' as const, description: 'high, medium, or low' },
            counter_recommendation: { type: 'string' as const },
          },
          required: ['technique', 'frequency', 'setup', 'effectiveness', 'counter_recommendation'] as const,
          additionalProperties: false,
        },
      },
      defense_patterns: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            situation: { type: 'string' as const },
            typical_response: { type: 'string' as const },
            vulnerability: { type: 'string' as const },
          },
          required: ['situation', 'typical_response', 'vulnerability'] as const,
          additionalProperties: false,
        },
      },
      position_tendencies: {
        type: 'object' as const,
        properties: {
          standing: { type: 'string' as const, description: 'What they prefer and how to exploit it' },
          top: { type: 'string' as const, description: 'Their riding style and weaknesses' },
          bottom: { type: 'string' as const, description: 'Their escape tendencies and how to shut them down' },
        },
        required: ['standing', 'top', 'bottom'] as const,
        additionalProperties: false,
      },
      conditioning_indicators: { type: 'string' as const, description: 'Signs of fatigue, pace changes, or endurance issues observed' },
      gameplan: {
        type: 'object' as const,
        properties: {
          period1: { type: 'string' as const, description: 'Strategy for period 1' },
          period2: { type: 'string' as const, description: 'Strategy for period 2' },
          if_ahead: { type: 'string' as const, description: 'Strategy when leading on points' },
          if_behind: { type: 'string' as const, description: 'Strategy when trailing' },
          key_techniques: {
            type: 'array' as const,
            items: { type: 'string' as const },
            description: 'Top 3-5 techniques to use against this opponent',
          },
        },
        required: ['period1', 'period2', 'if_ahead', 'if_behind', 'key_techniques'] as const,
        additionalProperties: false,
      },
      summary: { type: 'string' as const, description: '2-3 sentence scouting summary' },
    },
    required: ['opponent_profile', 'attack_patterns', 'defense_patterns', 'position_tendencies', 'conditioning_indicators', 'gameplan', 'summary'] as const,
    additionalProperties: false,
  },
} as const;

// TypeScript types derived from the schemas
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

export type Pass2Response = {
  overall_score: number;
  confidence: number;
  position_scores: { standing: number; top: number; bottom: number };
  sub_scores: {
    standing: { stance_motion: number; shot_selection: number; shot_finishing: number; sprawl_defense: number; reattacks_chains: number };
    top: { ride_tightness: number; breakdowns: number; turns_nearfalls: number; mat_returns: number };
    bottom: { base_posture: number; standups: number; sitouts_switches: number; reversals: number };
  };
  position_reasoning: { standing: string; top: string; bottom: string };
  frame_evidence: Array<{
    frame_index: number;
    position: string;
    action: string;
    is_key_moment: boolean;
    key_moment_type: string;
    detail: string;
    wrestler_visible: boolean;
    rubric_impact: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  drills: Array<{ name: string; description: string; reps: string; priority: string; addresses: string }>;
  summary: string;
  match_result: { result: string; result_type: string; match_duration_seconds: number };
  match_stats: { takedowns_scored: number; takedowns_allowed: number; reversals_scored: number; escapes_scored: number; near_falls_scored: number; pins_scored: number };
  fatigue_analysis: FatigueAnalysis;
};

export type OpponentScoutingResponse = {
  opponent_profile: { estimated_skill_level: string; primary_style: string; stance: string };
  attack_patterns: Array<{ technique: string; frequency: string; setup: string; effectiveness: string; counter_recommendation: string }>;
  defense_patterns: Array<{ situation: string; typical_response: string; vulnerability: string }>;
  position_tendencies: { standing: string; top: string; bottom: string };
  conditioning_indicators: string;
  gameplan: { period1: string; period2: string; if_ahead: string; if_behind: string; key_techniques: string[] };
  summary: string;
};
