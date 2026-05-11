// Baseball Knowledge Base — Swing & pitching technique taxonomy, rubric, and drill database.
// Used by the two-pass /api/scout/analyze pipeline (ported from wrestling-knowledge.ts).

export const SWING_TAXONOMY = {
  stanceSetup: ['neutral stance', 'open stance', 'closed stance', 'wide base', 'narrow base', 'crouched', 'tall'],
  load: ['hand load', 'leg kick', 'toe tap', 'inward turn', 'no stride load', 'late load', 'early load'],
  stride: ['short stride', 'long stride', 'toward pitcher', 'in the bucket (open)', 'stepping out', 'closed off'],
  hipShoulderSep: ['hips first', 'shoulders fly open', 'simultaneous rotation', 'rubber-band separation', 'no separation'],
  contactPoint: ['out front', 'deep contact (late)', 'over plate', 'pulled off', 'extension at contact'],
  batPath: ['short to ball', 'long swing', 'on plane', 'uppercut', 'chop down', 'casts the barrel', 'inside-out'],
  finishBalance: ['high finish', 'one-handed release', 'two-hand finish', 'falls forward', 'spins off', 'stays balanced'],
  batSpeed: ['quick hands', 'whip through zone', 'slow bat', 'dragging the barrel'],
  commonFaults: [
    'casting (loops the barrel)',
    'top-hand roll-over',
    'bailing out / pulling head',
    'collapsing back side',
    'jumping at the ball',
    'hands too early',
    'no hip-shoulder separation',
    'late foot-down (timing)',
    'lunging onto front side',
  ],
} as const;

export const PITCH_TAXONOMY = {
  stanceSetup: ['set position', 'wind-up', 'tall and fall', 'drop and drive', 'rocker step'],
  balanceLegLift: ['controlled leg lift', 'high knee', 'low knee', 'rushed', 'falls off mound', 'stacked balance'],
  stride: ['long stride (>90% height)', 'short stride', 'crossfire', 'opens up early', 'closed-off landing'],
  hipShoulderSep: ['hips lead', 'shoulders fly open', 'twisty separation', 'flat / synchronous rotation'],
  armSlot: ['over-the-top', 'three-quarter', 'sidearm', 'low three-quarter', 'inconsistent slot', 'short arm', 'long arm'],
  releasePoint: ['out front extension', 'release pulled back', 'inconsistent release', 'lands closed'],
  followThrough: ['balanced finish', 'fields position ready', 'recoils up', 'falls toward 1B/3B', 'no recoil'],
  command: ['locates fastball', 'misses high', 'misses arm-side', 'misses glove-side', 'spots off-speed'],
  commonFaults: [
    'arm drag / late arm',
    'opens front shoulder early',
    'flying open',
    'short stride',
    'rushing — front side faster than arm',
    'inverted W',
    'glove-side instability',
    'no hip-shoulder separation',
    'over-rotating after release',
  ],
} as const;

export const SWING_RUBRIC = {
  s1: { name: 'Stance & setup', evaluate: 'Balance, athletic posture, knee flex, hand position, eye level' },
  s2: { name: 'Load', evaluate: 'Hands back / weight gather, timing relative to pitcher, smooth not jerky' },
  s3: { name: 'Stride / Foot down', evaluate: 'Direct toward pitcher, short and controlled, foot down on time (not late)' },
  s4: { name: 'Hip-shoulder separation', evaluate: 'Hips fire before shoulders, torque generation, rubber-band feel' },
  s5: { name: 'Contact point', evaluate: 'Barrel meets ball out front, palm-up/palm-down at contact, extension' },
  s6: { name: 'Bat path / Plane', evaluate: 'Short, direct, on plane with pitch; not loopy or chopped' },
  s7: { name: 'Finish & balance', evaluate: 'Stays in box, no front-side leak, controlled high finish' },
  s8: { name: 'Bat speed (eye test)', evaluate: 'Quickness, whip through zone, exit-velo look' },
} as const;

export const PITCH_RUBRIC = {
  s1: { name: 'Stance & setup', evaluate: 'Balanced rocker, consistent set position, posture' },
  s2: { name: 'Balance point / Leg lift', evaluate: 'Stacked over rubber, controlled lift, no rush' },
  s3: { name: 'Stride length & direction', evaluate: 'Direct toward plate, ~85-100% of height, no crossfire/leak' },
  s4: { name: 'Hip-shoulder separation', evaluate: 'Hips open first, shoulders stay closed late, torque' },
  s5: { name: 'Arm slot consistency', evaluate: 'Repeatable slot pitch-to-pitch, on time with stride foot down' },
  s6: { name: 'Release point', evaluate: 'Out front extension, consistent release height, lands closed' },
  s7: { name: 'Follow-through', evaluate: 'Balanced finish, fielding position, no falling off' },
  s8: { name: 'Command (eye test)', evaluate: 'Locates fastball, repeatable misses, holds slot through stress' },
} as const;

export const SCORE_INTERPRETATION = [
  { range: [75, 80] as const, level: 'Elite', description: 'High-D1 / pro-projectable mechanics for age' },
  { range: [65, 74] as const, level: 'Advanced', description: 'College-projectable mechanics, minor polish needed' },
  { range: [55, 64] as const, level: 'Solid', description: 'Good fundamentals, clear areas to improve' },
  { range: [40, 54] as const, level: 'Developing', description: 'Inconsistent mechanics, clear weaknesses' },
  { range: [20, 39] as const, level: 'Beginner', description: 'Focus on fundamental positions and movements' },
] as const;

export type DrillPriority = 'critical' | 'high' | 'medium' | 'maintenance';

export type BaseballDrill = {
  name: string;
  description: string;
  reps: string;
  targetWeakness: string[]; // matches rubric slot keys (s1-s8) or fault names
  kind: 'swing' | 'pitching' | 'general';
};

export const SWING_DRILLS: BaseballDrill[] = [
  { name: 'Tee work — middle/away', description: 'Hit balls off a tee placed middle and middle-away. Focus on hitting the ball back through the L-screen / cage center.', reps: '3 rounds × 15', targetWeakness: ['s5', 's6', 'contact_point', 'bat_path'], kind: 'swing' },
  { name: 'Wall drill (hands inside ball)', description: 'Stand facing a wall with bat handle held; take swings without the barrel touching the wall. Forces tight inside path.', reps: '3 × 10', targetWeakness: ['s6', 'bat_path', 'casting'], kind: 'swing' },
  { name: 'Front-toss timing drill', description: 'Coach front-tosses with varied tempo. Hitter focuses on foot down before ball release.', reps: '3 × 12', targetWeakness: ['s3', 'stride', 'load_timing'], kind: 'swing' },
  { name: 'Hip-turn coil drill', description: 'Walk-up coils — load hips, hold separation 1 second, then fire. Builds the rubber-band feel.', reps: '3 × 8', targetWeakness: ['s4', 'hip_shoulder_sep'], kind: 'swing' },
  { name: 'High-tee finish drill', description: 'Set tee at top of zone; swing finishing with two hands high. Trains stay-through-the-zone vs roll-over.', reps: '3 × 10', targetWeakness: ['s5', 's7', 'top_hand_roll'], kind: 'swing' },
  { name: 'Opposite-field BP', description: 'BP round where every swing must go to the opposite-field gap. Forces letting ball travel.', reps: '2 rounds × 10', targetWeakness: ['s5', 'pulling_off'], kind: 'swing' },
  { name: 'No-stride swing', description: 'Hit off tee or front toss with feet planted (no stride). Isolates rotation and hand path.', reps: '3 × 10', targetWeakness: ['s4', 's6', 'lunging'], kind: 'swing' },
  { name: 'Pause-and-go BP', description: 'Hitter loads, pauses 1s at separation, then explodes. Trains hip-shoulder timing.', reps: '3 × 8', targetWeakness: ['s4'], kind: 'swing' },
];

export const PITCH_DRILLS: BaseballDrill[] = [
  { name: 'Towel drill', description: 'Throw a towel through the delivery, focus on extension and snapping out front.', reps: '3 × 10', targetWeakness: ['s6', 'release_point', 'extension'], kind: 'pitching' },
  { name: 'Hershiser drill (post-stride hold)', description: 'Stride out, plant front foot, hold the separation position before throwing. Builds hip-shoulder sep.', reps: '3 × 8', targetWeakness: ['s4', 'hip_shoulder_sep'], kind: 'pitching' },
  { name: 'Balance-point hold', description: 'Lift knee, balance on back leg 2-3 seconds, then deliver. Trains stack/control.', reps: '3 × 10', targetWeakness: ['s2', 'balance_point'], kind: 'pitching' },
  { name: 'Long stride drill (line on mound)', description: 'Mark target stride length with chalk; pitcher must land on line each pitch.', reps: '3 × 10', targetWeakness: ['s3', 'short_stride'], kind: 'pitching' },
  { name: 'Glove-side stability drill', description: 'Pitch with focus on pulling glove to chest at release. Stops flying open.', reps: '3 × 10', targetWeakness: ['s5', 'fly_open', 'glove_instability'], kind: 'pitching' },
  { name: 'Flat-ground command grid', description: 'Throw to 5 spots on a strike-zone target (in/out, up/down, mid). Track makes.', reps: '3 sets of 9', targetWeakness: ['s8', 'command'], kind: 'pitching' },
  { name: 'Mirror drill (no ball)', description: 'Full delivery in front of mirror; check arm slot consistency rep over rep.', reps: '3 × 10', targetWeakness: ['s5', 'arm_slot_inconsistency'], kind: 'pitching' },
  { name: 'Wall load + step', description: 'Stand against wall with glove side; load, drive front knee toward plate without crossfire.', reps: '3 × 12', targetWeakness: ['s3', 's4', 'opens_early'], kind: 'pitching' },
];

export function recommendDrills(kind: 'swing' | 'pitching', weaknesses: string[]): BaseballDrill[] {
  const pool = kind === 'swing' ? SWING_DRILLS : PITCH_DRILLS;
  const matched = pool.filter((d) =>
    d.targetWeakness.some((tw) =>
      weaknesses.some((w) => w.toLowerCase().includes(tw.toLowerCase()) || tw.toLowerCase().includes(w.toLowerCase().replace(/\s+/g, '_'))),
    ),
  );
  return matched.length > 0 ? matched : pool.slice(0, 3);
}

// Build the knowledge base string for Pass 2 prompt injection
export function buildKnowledgeBasePrompt(kind: 'swing' | 'pitching'): string {
  const rubric = kind === 'swing' ? SWING_RUBRIC : PITCH_RUBRIC;
  const taxonomy = kind === 'swing' ? SWING_TAXONOMY : PITCH_TAXONOMY;

  const rubricText = Object.entries(rubric)
    .map(([key, r]) => `  - ${key} ${r.name} (20-80): ${r.evaluate}`)
    .join('\n');

  const taxonomyText = Object.entries(taxonomy)
    .filter(([k]) => k !== 'commonFaults')
    .map(([phase, terms]) => `  ${phase}: ${(terms as readonly string[]).join(', ')}`)
    .join('\n');

  const faultsText = (taxonomy.commonFaults as readonly string[]).map((f) => `  - ${f}`).join('\n');

  const interp = SCORE_INTERPRETATION.map((s) => `  - ${s.range[0]}-${s.range[1]}: ${s.level} — ${s.description}`).join('\n');

  return `RUBRIC (each slot scored on the 20-80 scouting scale):
${rubricText}

TECHNIQUE TAXONOMY (use these terms when describing what you see):
${taxonomyText}

COMMON FAULTS to flag if observed:
${faultsText}

SCORE INTERPRETATION (20-80 scale):
${interp}

COMPOSITE = average of s1-s8, rounded to the nearest integer.`;
}
