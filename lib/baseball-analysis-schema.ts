// OpenAI Structured Output schema for the baseball /api/scout/analyze Pass-2 response.
// 20-80 scouting scale (60 is solid-average, 70+ is plus, 50 is below-average).

export const BASEBALL_PASS2_SCHEMA = {
  name: 'baseball_swing_or_pitch_analysis',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      kind: { type: 'string' as const, description: 'swing or pitching — must match what was requested' },
      s1: { type: 'number' as const, description: 'Stance & setup (20-80)' },
      s2: { type: 'number' as const, description: 'Load OR Balance/leg lift (20-80)' },
      s3: { type: 'number' as const, description: 'Stride / Foot down OR Stride length & direction (20-80)' },
      s4: { type: 'number' as const, description: 'Hip-shoulder separation (20-80)' },
      s5: { type: 'number' as const, description: 'Contact point OR Arm slot (20-80)' },
      s6: { type: 'number' as const, description: 'Bat path / Plane OR Release point (20-80)' },
      s7: { type: 'number' as const, description: 'Finish & balance OR Follow-through (20-80)' },
      s8: { type: 'number' as const, description: 'Bat speed OR Command — eye test (20-80)' },
      composite: { type: 'number' as const, description: 'Average of s1-s8 rounded to nearest int' },
      confidence: { type: 'number' as const, description: '0.0-1.0 based on video quality, athlete visibility, frame coverage' },
      strengths: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '2-4 specific mechanical strengths observed (e.g., "Strong hip-shoulder separation at foot-plant")',
      },
      weaknesses: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '2-4 specific weaknesses, phrased as actionable focus areas',
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
            addresses: { type: 'string' as const, description: 'Which weakness this drill addresses (reference an s-slot if possible)' },
          },
          required: ['name', 'description', 'reps', 'priority', 'addresses'] as const,
          additionalProperties: false,
        },
        description: '3-5 drill recommendations tailored to the weaknesses',
      },
      highRoiFix: {
        type: 'string' as const,
        description: 'ONE sentence — the single highest-ROI mechanical fix the athlete should focus on for the next 6 weeks. Concrete, specific, coachable.',
      },
      frame_evidence: {
        type: 'array' as const,
        description: 'One entry per frame analyzed. Include EVERY frame index from 0 to frameCount-1.',
        items: {
          type: 'object' as const,
          properties: {
            frame_index: { type: 'number' as const },
            phase: { type: 'string' as const, description: 'stance / load / stride / separation / contact / extension / follow_through / not_visible' },
            observation: { type: 'string' as const, description: '<=25 word description of what is happening mechanically' },
            athlete_visible: { type: 'boolean' as const },
            rubric_impact: { type: 'string' as const, description: 'Which s-slot this frame informs (e.g., "+ s4 hip-shoulder separation clearly visible")' },
          },
          required: ['frame_index', 'phase', 'observation', 'athlete_visible', 'rubric_impact'] as const,
          additionalProperties: false,
        },
      },
      summary: {
        type: 'string' as const,
        description: '2-3 sentence overall assessment. Refer to the athlete by name if provided, otherwise "the hitter" or "the pitcher".',
      },
    },
    required: [
      'kind',
      's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8',
      'composite', 'confidence',
      'strengths', 'weaknesses', 'drills',
      'highRoiFix', 'frame_evidence', 'summary',
    ] as const,
    additionalProperties: false,
  },
} as const;

export type BaseballPass2Response = {
  kind: 'swing' | 'pitching';
  s1: number; s2: number; s3: number; s4: number;
  s5: number; s6: number; s7: number; s8: number;
  composite: number;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  drills: Array<{ name: string; description: string; reps: string; priority: string; addresses: string }>;
  highRoiFix: string;
  frame_evidence: Array<{
    frame_index: number;
    phase: string;
    observation: string;
    athlete_visible: boolean;
    rubric_impact: string;
  }>;
  summary: string;
};
