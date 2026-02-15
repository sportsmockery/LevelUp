-- Side-by-Side & Overlay Comparison: comparisons table and elite technique library
-- Enables visual comparison of wrestler technique against elite examples or self over time

-- Comparisons table
CREATE TABLE IF NOT EXISTS comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wrestler_profile_id UUID REFERENCES wrestler_profiles(id) ON DELETE SET NULL,
  comparison_type TEXT NOT NULL CHECK (comparison_type IN ('self_vs_self', 'self_vs_elite', 'self_vs_opponent')),
  frame_a_id TEXT NOT NULL,                -- Analysis frame reference (analysis_id:frame_index)
  frame_b_id TEXT NOT NULL,                -- Analysis frame or elite technique ID
  sync_point TEXT CHECK (sync_point IN ('setup', 'penetration', 'finish', 'contact')),
  metrics JSONB,                           -- ComparisonMetrics JSON
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparisons_wrestler ON comparisons(wrestler_profile_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_type ON comparisons(comparison_type);

-- Elite technique library — curated clips from Olympic/World Championship matches
CREATE TABLE IF NOT EXISTS elite_technique_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_name TEXT NOT NULL,
  athlete_name TEXT NOT NULL,
  video_url TEXT,                           -- S3/storage URL for the clip
  frame_index INTEGER NOT NULL DEFAULT 0,
  pose_data JSONB,                         -- Keypoints for skeleton overlay
  biomechanical_measurements JSONB NOT NULL,-- Angles from elite execution
  notes TEXT,
  source TEXT NOT NULL,                    -- 'FloWrestling', 'Olympics 2024', etc.
  technique_phase TEXT CHECK (technique_phase IN ('setup', 'penetration', 'drive', 'finish', 'defense', 'control')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elite_technique_name ON elite_technique_library(technique_name);
CREATE INDEX IF NOT EXISTS idx_elite_athlete_name ON elite_technique_library(athlete_name);

-- Seed elite technique library with reference measurements
INSERT INTO elite_technique_library (technique_name, athlete_name, biomechanical_measurements, notes, source, technique_phase) VALUES
  ('double_leg_shot', 'Kyle Snyder', '{"knee_angle": 88, "back_angle": 42, "hip_angle": 95, "head_spine_angle": 165}', 'Perfect knee angle, explosive hip drive, head up', 'Olympics 2024 Finals', 'penetration'),
  ('blast_double', 'Jordan Burroughs', '{"knee_angle": 85, "back_angle": 38, "hip_angle": 90, "head_spine_angle": 170}', 'Lightning-fast level change, drives through opponent center', 'World Championships 2023', 'penetration'),
  ('single_leg_finish', 'Helen Maroulis', '{"knee_angle": 92, "back_angle": 45, "hip_angle": 100, "elbow_angle": 85}', 'Excellent head position, drives corner finish', 'Olympics 2021', 'finish'),
  ('high_crotch', 'David Taylor', '{"knee_angle": 90, "back_angle": 40, "hip_angle": 92, "head_spine_angle": 168}', 'Textbook level change, head inside position', 'World Championships 2022', 'penetration'),
  ('sprawl', 'Kyle Dake', '{"hip_angle": 172, "back_angle": 15, "knee_angle": 165, "head_spine_angle": 160}', 'Full hip extension, heavy chest pressure', 'NCAA Championships', 'defense'),
  ('standup_escape', 'Yianni Diakomihalis', '{"back_angle": 78, "hip_angle": 135, "knee_angle": 120, "elbow_angle": 95}', 'Explosive base, clean hand clearing', 'NCAA Championships 2023', 'defense'),
  ('sit_out', 'Thomas Gilman', '{"hip_angle": 118, "back_angle": 55, "knee_angle": 100}', 'Quick hip heist, strong hand control', 'World Championships 2022', 'defense'),
  ('switch', 'Spencer Lee', '{"hip_angle": 105, "back_angle": 60, "knee_angle": 95}', 'Explosive hip switch, immediate control', 'NCAA Championships 2022', 'defense'),
  ('tilt_series', 'Gable Steveson', '{"hip_angle": 95, "elbow_angle": 75, "back_angle": 50}', 'Heavy pressure, locks tight, walks to back', 'Olympics 2021', 'control'),
  ('half_nelson', 'Bo Nickal', '{"elbow_angle": 70, "back_angle": 35, "hip_angle": 90}', 'Deep half, heavy chest pressure, walks to pin', 'NCAA Championships 2022', 'control'),
  ('cradle', 'Ed Ruth', '{"elbow_angle": 60, "hip_angle": 85, "knee_angle": 80}', 'Locks tight, squeezes, walks opponent to back', 'NCAA Championships', 'control'),
  ('leg_ride', 'Jason Nolf', '{"hip_angle": 100, "knee_angle": 110, "back_angle": 40}', 'Deep hook, controls hips, transitions to turns', 'NCAA Championships 2019', 'control'),
  ('gut_wrench', 'Mijain Lopez', '{"hip_angle": 95, "back_angle": 45, "elbow_angle": 80}', 'Devastating lift, rolls through for exposure', 'Olympics 2024', 'control'),
  ('arm_drag', 'John Smith', '{"elbow_angle": 100, "back_angle": 55, "hip_angle": 120}', 'Quick snap, steps behind, immediate go-behind', 'World Championships', 'setup'),
  ('snap_down', 'Zain Retherford', '{"back_angle": 50, "hip_angle": 110, "elbow_angle": 90}', 'Heavy snap, front headlock opportunity', 'NCAA Championships 2018', 'setup'),
  ('front_headlock', 'Pat Downey', '{"back_angle": 45, "elbow_angle": 75, "hip_angle": 100}', 'Tight lock, drives head down, go-behind', 'US Open', 'control'),
  ('fireman_carry', 'Kayla Miracle', '{"knee_angle": 80, "back_angle": 40, "hip_angle": 85}', 'Deep penetration, loads on shoulders, rolls through', 'Pan Am Championships', 'penetration'),
  ('ankle_pick', 'Kyle Snyder', '{"back_angle": 48, "knee_angle": 95, "hip_angle": 105}', 'Sets up with collar tie, snaps and picks ankle', 'World Championships', 'setup'),
  ('duck_under', 'Gable Steveson', '{"back_angle": 55, "hip_angle": 115, "knee_angle": 100}', 'Quick level change under arm, immediate go-behind', 'US Open 2023', 'setup'),
  ('whizzer_defense', 'J''den Cox', '{"hip_angle": 140, "elbow_angle": 70, "back_angle": 50}', 'Heavy overhook, drives hip in, circles away', 'World Championships 2019', 'defense')
ON CONFLICT DO NOTHING;
