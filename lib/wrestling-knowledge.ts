// Wrestling Knowledge Base — Scoring rules, technique taxonomy, rubric, and drill database.
// Used by the two-pass analysis pipeline (Pass 2: reasoning).

export const SCORING_RULES = {
  folkstyle: {
    takedown: { points: 2, description: 'Control opponent on mat from neutral; pass behind hips, 3 pts of contact' },
    escape: { points: 1, description: 'Return to neutral standing from bottom/par terre' },
    reversal: { points: 2, description: 'Go from bottom/defensive to top/offensive control' },
    nearFall2: { points: 2, description: 'Expose opponent\'s back at <45° for 2-4 seconds' },
    nearFall3: { points: 3, description: 'Expose opponent\'s back at <45° for 5+ seconds' },
    penalty: { points: 1, description: 'Awarded to opponent for stalling, false start, illegal hold' },
    ridingTime: { points: 1, description: '1 point for 1+ minute net riding time advantage' },
    technicalFall: { margin: 15, description: 'Match ends when lead reaches 15 points' },
  },
  freestyle: {
    takedown: { points: 2, description: 'Control opponent on mat from standing; pass behind hips' },
    exposure2: { points: 2, description: 'Expose back at <90° to mat — head/shoulder/elbow contacts mat' },
    exposure4: { points: 4, description: 'Feet-to-danger: standing to immediate back exposure, continuous motion' },
    grandAmplitude4: { points: 4, description: 'Sweeping arc throw from standing, no danger landing' },
    grandAmplitude5: { points: 5, description: 'Sweeping arc throw from standing, landing in danger' },
    pushOut: { points: 1, description: 'Force opponent out of bounds with an attack' },
    passivity: { points: 0, description: 'Warning, then opponent gets choice of par terre position' },
    technicalSuperiority: { margin: 10, description: 'Match ends at 10-point lead' },
  },
  grecoRoman: {
    takedown: { points: 2, description: 'Control opponent on mat; no leg attacks allowed' },
    exposure2: { points: 2, description: 'Back exposure at <90° for brief duration' },
    exposure4: { points: 4, description: 'Grand amplitude or feet-to-danger without landing in danger' },
    grandAmplitude5: { points: 5, description: 'Grand amplitude throw landing directly in danger' },
    pushOut: { points: 1, description: 'Force opponent out of bounds' },
    passivity: { points: 0, description: 'Warning, then par terre advantage for opponent' },
    technicalSuperiority: { margin: 8, description: 'Match ends at 8-point lead' },
  },
} as const;

export const TECHNIQUE_TAXONOMY = {
  standing: {
    offense: {
      singleLeg: ['high crotch finish', 'sweep single', 'low single', 'snatch single', 'head-inside single'],
      doubleLeg: ['blast double', 'inside-step double', 'misdirection double'],
      upperBody: ['duck under', 'arm drag', 'snap down', 'front headlock series', 'Russian tie'],
      throws: ['hip toss', 'head-and-arm throw', 'lateral drop', 'fireman\'s carry', 'body lock throw'],
      grecoSpecific: ['arm spin', 'body lock lift', 'gut wrench from standing', 'suplex'],
    },
    defense: {
      sprawl: ['hip sprawl', 'cross-face sprawl', 'whizzer sprawl'],
      counterAttack: ['front headlock counter', 'go-behind off failed shot', 'knee tap off tie-up'],
      positioning: ['hand fighting', 'collar tie', 'underhook battle', 'two-on-one control'],
    },
  },
  top: {
    breakdowns: ['chop and tight waist', 'ankle breakdown', 'spiral ride', 'tight waist and half nelson', 'cross-body ride'],
    turns: ['half nelson', 'tilt series', 'cradle (near/far/cross-face)', 'arm bar', 'Turk ride', 'bow-and-arrow'],
    rides: ['leg ride', 'cross-body ride', 'tight waist', 'chest-to-back pressure', 'wrist control ride'],
    matReturns: ['mat return off standup', 'lift and return', 'ankle pick return', 'inside trip return'],
  },
  bottom: {
    escapes: ['standup', 'sit-out', 'hip heist', 'granby roll', 'Peterson roll'],
    reversals: ['switch', 'roll-through', 'Petersen reversal', 'hip heist to reversal'],
    defense: ['base building', 'wrist control', 'elbow control', 'head position management'],
  },
} as const;

export const ANALYSIS_RUBRIC = {
  standing: {
    weight: 0.40,
    total: 100,
    subCriteria: [
      { name: 'Stance & Motion', max: 20, evaluate: 'Level, balance, hand fighting, circle movement, head position' },
      { name: 'Shot Selection', max: 20, evaluate: 'Penetration step depth, level change speed, setup quality (fakes, ties)' },
      { name: 'Shot Finishing', max: 20, evaluate: 'Drive through, corner pressure, chain wrestling, trip/sweep combos' },
      { name: 'Sprawl & Defense', max: 20, evaluate: 'Reaction time, hip pressure, whizzer, re-positioning after sprawl' },
      { name: 'Re-attacks & Chains', max: 20, evaluate: 'Second/third effort, scramble offense, scoring off failed first shot' },
    ],
  },
  top: {
    weight: 0.30,
    total: 100,
    subCriteria: [
      { name: 'Ride Tightness', max: 25, evaluate: 'Waist control, chest-to-back pressure, hip-to-hip contact, leg rides' },
      { name: 'Breakdowns', max: 25, evaluate: 'Chop, tight-waist/half, ankle breakdown execution, spiral rides' },
      { name: 'Turns & Near Falls', max: 25, evaluate: 'Tilt series, half nelson, cradle attempts, arm bars, back exposure' },
      { name: 'Mat Returns', max: 25, evaluate: 'Ability to return opponent to mat after stand-up or escape attempts' },
    ],
  },
  bottom: {
    weight: 0.30,
    total: 100,
    subCriteria: [
      { name: 'Base & Posture', max: 25, evaluate: 'Tripod position, head up, elbows tight, wrist control' },
      { name: 'Stand-ups', max: 25, evaluate: 'Timing, hand control clearing, posture during rise, stepping away' },
      { name: 'Sit-outs & Switches', max: 25, evaluate: 'Hip heist speed, switch execution, granby rolls' },
      { name: 'Reversals', max: 25, evaluate: 'Ability to gain control from bottom position, roll-throughs' },
    ],
  },
  scoreInterpretation: [
    { range: [90, 100], level: 'Elite', description: 'State/national caliber technique' },
    { range: [80, 89], level: 'Advanced', description: 'Very clean execution, minor areas to polish' },
    { range: [70, 79], level: 'Solid', description: 'Good fundamentals, some clear areas to improve' },
    { range: [60, 69], level: 'Developing', description: 'Inconsistent technique, clear weaknesses' },
    { range: [0, 59], level: 'Beginner', description: 'Focus on fundamental positions and movements' },
  ],
} as const;

export type DrillPriority = 'critical' | 'high' | 'medium' | 'maintenance';

export type Drill = {
  name: string;
  description: string;
  reps: string;
  targetWeakness: string[];
  position: 'standing' | 'top' | 'bottom' | 'general';
};

export const DRILL_DATABASE: Drill[] = [
  // Standing — Shot offense
  { name: 'Shadow shot penetration steps', description: 'Practice level change and penetration step without partner. Focus on knee touching mat, head up, back straight.', reps: '3x10 each side', targetWeakness: ['shot_selection', 'shot_finishing'], position: 'standing' },
  { name: 'Partner shot-and-finish drill', description: 'Shoot on live partner, finish through to two points. Rotate single/double/high crotch.', reps: '3x8 each side', targetWeakness: ['shot_finishing', 'reattacks'], position: 'standing' },
  { name: 'Chain wrestling series', description: 'Start with a single leg; if defended, switch to double; if stuffed, go to high crotch. Never stop on first attempt.', reps: '5x5 minute rounds', targetWeakness: ['reattacks', 'shot_selection'], position: 'standing' },
  { name: 'Set-up to shot drill', description: 'Fake, snap, arm drag, or collar tie — then immediately shoot. No shots without a setup.', reps: '3x10', targetWeakness: ['shot_selection'], position: 'standing' },

  // Standing — Defense
  { name: 'Sprawl reaction drill', description: 'Partner shoots at random; react with hip sprawl, cross-face, and circle away. Focus on hip speed.', reps: '3x12', targetWeakness: ['sprawl_defense'], position: 'standing' },
  { name: 'Hand fighting circle drill', description: 'Continuous hand fighting with partner. Maintain position, fight for inside ties, work angles.', reps: '3x2 minute rounds', targetWeakness: ['stance_motion', 'sprawl_defense'], position: 'standing' },
  { name: 'Whizzer-to-go-behind', description: 'From whizzer position after sprawl, transition to go-behind and score.', reps: '3x8 each side', targetWeakness: ['sprawl_defense', 'reattacks'], position: 'standing' },

  // Top — Breakdowns & turns
  { name: 'Tight waist + half nelson breakdown drill', description: 'From referee\'s position, chop arm and drive half nelson to flatten opponent.', reps: '3x8', targetWeakness: ['breakdowns', 'ride_tightness'], position: 'top' },
  { name: 'Tilt series from top', description: 'From tight waist ride, execute tilt series: near-side tilt, far-side tilt, bar arm tilt.', reps: '3x6 each direction', targetWeakness: ['turns_nearfalls'], position: 'top' },
  { name: 'Cradle drill (near/far/cross-face)', description: 'Lock up cradle from multiple entries. Squeeze and walk opponent to back.', reps: '3x6 each variation', targetWeakness: ['turns_nearfalls'], position: 'top' },
  { name: 'Mat return drill', description: 'Partner stands up from bottom; lift and return to mat. Emphasize chest pressure and hip control.', reps: '3x8', targetWeakness: ['mat_returns'], position: 'top' },
  { name: 'Leg ride series', description: 'Insert leg ride, transition to cross-body, work for turns while maintaining leg control.', reps: '3x5 minute rounds', targetWeakness: ['ride_tightness', 'turns_nearfalls'], position: 'top' },

  // Bottom — Escapes & reversals
  { name: 'Standup drill with hand clearing', description: 'From referee\'s position, explode to feet, clear wrist control, step away. Partner provides resistance.', reps: '3x10', targetWeakness: ['standups'], position: 'bottom' },
  { name: 'Sit-out turn-in drill', description: 'From bottom, sit out to hip, turn in to face partner. Work both directions.', reps: '3x8 each side', targetWeakness: ['sitouts_switches'], position: 'bottom' },
  { name: 'Switch drill', description: 'From bottom, execute switch: clear near hand, sit and switch hips, secure go-behind.', reps: '3x8 each side', targetWeakness: ['sitouts_switches', 'reversals'], position: 'bottom' },
  { name: 'Granby roll series', description: 'Execute granby roll from bottom when opponent breaks you down. Chain into standup if first attempt fails.', reps: '3x6 each direction', targetWeakness: ['sitouts_switches', 'reversals'], position: 'bottom' },
  { name: 'Base-building drill', description: 'Partner tries to break you down from top; maintain tripod base, keep elbows tight, head up.', reps: '3x30 second rounds', targetWeakness: ['base_posture'], position: 'bottom' },

  // General conditioning
  { name: 'Live wrestling with position starts', description: 'Start from specific positions (neutral, top, bottom) and wrestle live for short bursts. Rotate positions.', reps: '6x1 minute rounds', targetWeakness: ['general_conditioning', 'scramble_offense'], position: 'general' },
  { name: 'Scramble drill', description: 'Start in scramble positions; both wrestlers fight for control. Focus on hip movement and re-attacks.', reps: '4x1 minute rounds', targetWeakness: ['reattacks', 'scramble_offense'], position: 'general' },
];

// Helper to find drills matching detected weaknesses
export function recommendDrills(weaknesses: string[], position?: string): Drill[] {
  const matched = DRILL_DATABASE.filter((drill) => {
    const weaknessMatch = drill.targetWeakness.some((tw) => weaknesses.some((w) => w.toLowerCase().includes(tw.replace(/_/g, ' ')) || tw.includes(w.toLowerCase().replace(/\s+/g, '_'))));
    const positionMatch = !position || drill.position === position || drill.position === 'general';
    return weaknessMatch && positionMatch;
  });
  return matched.length > 0 ? matched : DRILL_DATABASE.filter((d) => d.position === 'general');
}

// Build the knowledge base string for Pass 2 prompt injection
export function buildKnowledgeBasePrompt(matchStyle: 'folkstyle' | 'freestyle' | 'grecoRoman' = 'folkstyle'): string {
  const rules = SCORING_RULES[matchStyle];
  const rulesText = Object.entries(rules)
    .map(([action, r]) => `- ${action.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${'points' in r ? `${r.points} pts` : 'margin' in r ? `${r.margin}-pt lead` : ''} — ${r.description}`)
    .join('\n');

  const rubricText = Object.entries(ANALYSIS_RUBRIC)
    .filter(([key]) => key !== 'scoreInterpretation')
    .map(([pos, data]) => {
      if ('subCriteria' in data) {
        const criteria = data.subCriteria
          .map((c) => `  - ${c.name} (0-${c.max}): ${c.evaluate}`)
          .join('\n');
        return `${pos.toUpperCase()} (weight: ${data.weight * 100}%, total ${data.total} pts):\n${criteria}`;
      }
      return '';
    })
    .join('\n\n');

  return `SCORING RULES (${matchStyle.replace(/([A-Z])/g, ' $1').trim()}):\n${rulesText}\n\nGRADING RUBRIC:\n${rubricText}\n\nOVERALL = Standing (40%) + Top (30%) + Bottom (30%)\n\nScore interpretation:\n${ANALYSIS_RUBRIC.scoreInterpretation.map((s) => `- ${s.range[0]}-${s.range[1]}: ${s.level} — ${s.description}`).join('\n')}`;
}
