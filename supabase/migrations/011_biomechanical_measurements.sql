-- Biomechanical Angle Measurements: standards table and frame-level measurement columns
-- Enables objective angle-based coaching feedback compared to ideal ranges

-- Biomechanical standards table — coaching science ideal ranges per technique
CREATE TABLE IF NOT EXISTS biomechanical_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_name TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  ideal_min REAL NOT NULL,
  ideal_max REAL NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biomechanical_standards_technique ON biomechanical_standards(technique_name);

-- Seed with coaching standards
INSERT INTO biomechanical_standards (technique_name, measurement_type, ideal_min, ideal_max, source) VALUES
  ('single_leg_shot', 'knee_angle', 85, 95, 'USA Wrestling Level 5 coaching manual'),
  ('double_leg_shot', 'knee_angle', 80, 100, 'Biomechanics of Wrestling, Kraemer 2004'),
  ('sprawl', 'hip_angle', 160, 180, 'Defensive wrestling mechanics, USAW'),
  ('stance_neutral', 'back_angle', 60, 80, 'Optimal wrestling posture, NSCA 2015'),
  ('penetration_step', 'back_angle', 30, 50, 'Shot mechanics, Kolat Wrestling'),
  ('underhook', 'elbow_angle', 70, 110, 'Tie-up biomechanics'),
  ('head_up_defense', 'head_spine_angle', 150, 180, 'Sprawl defense coaching points'),
  ('high_crotch', 'knee_angle', 85, 100, 'USA Wrestling advanced coaching'),
  ('ankle_pick', 'back_angle', 40, 60, 'Low-level attacks, USAW'),
  ('fireman_carry', 'knee_angle', 75, 95, 'Throw mechanics coaching manual'),
  ('gut_wrench', 'hip_angle', 90, 120, 'Greco-Roman technique standards'),
  ('standup_escape', 'back_angle', 70, 90, 'Bottom position mechanics'),
  ('sit_out', 'hip_angle', 100, 140, 'Escape technique fundamentals'),
  ('switch', 'hip_angle', 90, 130, 'Bottom reversal mechanics'),
  ('half_nelson', 'elbow_angle', 60, 100, 'Pinning combination biomechanics'),
  ('tilt_series', 'hip_angle', 80, 120, 'Turning technique standards'),
  ('cradle', 'elbow_angle', 50, 90, 'Pinning combination biomechanics')
ON CONFLICT DO NOTHING;

-- Add biomechanical measurement columns to match_analyses
ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS biomechanical_measurements JSONB;
-- Stores per-frame: { knee_angle_left, knee_angle_right, hip_angle, back_angle, ... }

ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS ideal_range_violations JSONB;
-- Stores: [{ measurement, actual, ideal_min, ideal_max, delta, severity }]

ALTER TABLE match_analyses ADD COLUMN IF NOT EXISTS biomechanical_summary JSONB;
-- Stores aggregated: { avg_knee_angle, avg_back_angle, ... }
