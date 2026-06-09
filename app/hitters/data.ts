// ============================================================================
// Upper Deck Cougars | Hitters UDC Baseball Club — Mock Data + AI Demo Logic
// All "AI" runs client-side with deterministic, realistic mock logic.
// ============================================================================

// Hitters / UDC brand: premium monochrome — matte black, brushed silver, white
export const BRAND = {
  black: '#0A0A0A',
  charcoal: '#141416',
  silver: '#C9CDD2',
  silverBright: '#E6E8EB',
  light: '#F8FAFC',
  steel: '#9AA0A8',
} as const;

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'P' | 'UTIL';

export type ToolGrades = {
  hit: number;      // contact / hit tool
  power: number;    // raw + game power
  speed: number;    // run / range
  arm: number;      // arm strength
  field: number;    // defense / glove
  iq: number;       // baseball IQ / instincts
};

export type Player = {
  id: string;
  name: string;
  position: Position;
  age: number;
  gradYear: number;
  team: string;
  bats: 'R' | 'L' | 'S';
  throws: 'R' | 'L';
  height: string;
  avg: number;
  obp: number;
  ops: number;
  exitVeloMax: number;     // mph
  sixtyYard: number;       // seconds
  tools: ToolGrades;
  aiGrade: number;         // 0-100
  insight: string;
  trend: { m: string; ev: number }[]; // exit velo trend
};

export type Team = {
  id: string;
  name: string;
  age: string;
  record: string;
  coach: string;
  aiGrade: number;
  highlight: string;
  roster: { name: string; pos: Position; grad: number; note: string }[];
  spotlight?: boolean;
};

export type Game = {
  id: string;
  date: string;       // 2026 dates
  status: 'final' | 'upcoming';
  ageGroup: string;
  opponent: string;
  tournament: string;
  location: string;
  result?: { us: number; them: number; win: boolean };
};

// ----------------------------------------------------------------------------
// Players
// ----------------------------------------------------------------------------
export const PLAYERS: Player[] = [
  {
    id: 'p1', name: 'Marcus Delgado', position: 'SS', age: 14, gradYear: 2029,
    team: '14U Upper Deck Cougars', bats: 'R', throws: 'R', height: "5'9\"",
    avg: 0.412, obp: 0.489, ops: 1.121, exitVeloMax: 88, sixtyYard: 7.21,
    tools: { hit: 78, power: 70, speed: 82, arm: 80, field: 84, iq: 86 },
    aiGrade: 91, insight: 'Elite barrel control trending up — swing efficiency +18% since March.',
    trend: [{ m: 'Jan', ev: 79 }, { m: 'Feb', ev: 81 }, { m: 'Mar', ev: 83 }, { m: 'Apr', ev: 86 }, { m: 'May', ev: 88 }],
  },
  {
    id: 'p2', name: 'Tyler Brennan', position: '1B', age: 15, gradYear: 2028,
    team: '16U Hitters Black', bats: 'L', throws: 'L', height: "6'1\"",
    avg: 0.367, obp: 0.451, ops: 1.205, exitVeloMax: 96, sixtyYard: 7.68,
    tools: { hit: 74, power: 90, speed: 60, arm: 72, field: 76, iq: 80 },
    aiGrade: 89, insight: 'Top-end raw power — 96 mph max EV ranks in 95th percentile for age.',
    trend: [{ m: 'Jan', ev: 89 }, { m: 'Feb', ev: 90 }, { m: 'Mar', ev: 92 }, { m: 'Apr', ev: 94 }, { m: 'May', ev: 96 }],
  },
  {
    id: 'p3', name: 'Jaylen Carter', position: 'CF', age: 14, gradYear: 2029,
    team: '14U Upper Deck Cougars', bats: 'S', throws: 'R', height: "5'8\"",
    avg: 0.388, obp: 0.470, ops: 1.044, exitVeloMax: 84, sixtyYard: 6.91,
    tools: { hit: 80, power: 64, speed: 92, arm: 76, field: 88, iq: 82 },
    aiGrade: 88, insight: '6.91 sixty is plus-plus speed — elite range and first-step quickness.',
    trend: [{ m: 'Jan', ev: 78 }, { m: 'Feb', ev: 80 }, { m: 'Mar', ev: 81 }, { m: 'Apr', ev: 83 }, { m: 'May', ev: 84 }],
  },
  {
    id: 'p4', name: 'Owen Petrakis', position: 'P', age: 16, gradYear: 2027,
    team: '17U Hitters Black', bats: 'R', throws: 'R', height: "6'3\"",
    avg: 0.301, obp: 0.388, ops: 0.842, exitVeloMax: 91, sixtyYard: 7.45,
    tools: { hit: 66, power: 78, speed: 66, arm: 94, field: 78, iq: 85 },
    aiGrade: 90, insight: 'Projectable RHP — fastball touched 87, plus spin profile on the slider.',
    trend: [{ m: 'Jan', ev: 85 }, { m: 'Feb', ev: 87 }, { m: 'Mar', ev: 88 }, { m: 'Apr', ev: 90 }, { m: 'May', ev: 91 }],
  },
  {
    id: 'p5', name: 'Diego Ramirez', position: 'C', age: 15, gradYear: 2028,
    team: '16U Hitters Black', bats: 'R', throws: 'R', height: "5'11\"",
    avg: 0.344, obp: 0.428, ops: 0.961, exitVeloMax: 90, sixtyYard: 7.55,
    tools: { hit: 76, power: 80, speed: 62, arm: 88, field: 86, iq: 90 },
    aiGrade: 90, insight: 'Premium game-caller — 1.92 pop time and elite framing metrics behind the dish.',
    trend: [{ m: 'Jan', ev: 84 }, { m: 'Feb', ev: 86 }, { m: 'Mar', ev: 87 }, { m: 'Apr', ev: 89 }, { m: 'May', ev: 90 }],
  },
  {
    id: 'p6', name: 'Cole Whitaker', position: '3B', age: 14, gradYear: 2029,
    team: '14U Upper Deck Cougars', bats: 'R', throws: 'R', height: "5'10\"",
    avg: 0.356, obp: 0.441, ops: 1.012, exitVeloMax: 87, sixtyYard: 7.38,
    tools: { hit: 78, power: 76, speed: 70, arm: 84, field: 80, iq: 84 },
    aiGrade: 86, insight: 'Advanced approach — chase rate down 22%, hard-hit rate climbing fast.',
    trend: [{ m: 'Jan', ev: 81 }, { m: 'Feb', ev: 82 }, { m: 'Mar', ev: 84 }, { m: 'Apr', ev: 85 }, { m: 'May', ev: 87 }],
  },
  {
    id: 'p7', name: 'Sam Okafor', position: '2B', age: 13, gradYear: 2030,
    team: '12U Cougars', bats: 'R', throws: 'R', height: "5'6\"",
    avg: 0.398, obp: 0.479, ops: 1.066, exitVeloMax: 78, sixtyYard: 7.62,
    tools: { hit: 82, power: 58, speed: 78, arm: 70, field: 84, iq: 88 },
    aiGrade: 84, insight: 'High-feel infielder — elite hand-eye and one of the best pure hitters in 12U.',
    trend: [{ m: 'Jan', ev: 72 }, { m: 'Feb', ev: 74 }, { m: 'Mar', ev: 75 }, { m: 'Apr', ev: 77 }, { m: 'May', ev: 78 }],
  },
  {
    id: 'p8', name: 'Nico Vance', position: 'RF', age: 16, gradYear: 2027,
    team: '17U Hitters Black', bats: 'L', throws: 'L', height: "6'0\"",
    avg: 0.329, obp: 0.412, ops: 0.998, exitVeloMax: 93, sixtyYard: 7.02,
    tools: { hit: 76, power: 84, speed: 84, arm: 86, field: 82, iq: 80 },
    aiGrade: 88, insight: 'Loud five-tool profile — rare power/speed blend with a plus throwing arm.',
    trend: [{ m: 'Jan', ev: 87 }, { m: 'Feb', ev: 88 }, { m: 'Mar', ev: 90 }, { m: 'Apr', ev: 92 }, { m: 'May', ev: 93 }],
  },
];

// ----------------------------------------------------------------------------
// Teams
// ----------------------------------------------------------------------------
export const TEAMS: Team[] = [
  {
    id: 't1', name: '8U Cougars', age: '8U', record: '24-9', coach: 'Coach Rivera',
    aiGrade: 79, highlight: 'Rock Spring Classic — Pool Champions',
    roster: [
      { name: 'Liam Foster', pos: 'SS', grad: 2034, note: 'Top contact bat' },
      { name: 'Aiden Cruz', pos: 'P', grad: 2034, note: 'Strike-thrower' },
      { name: 'Mason Lee', pos: 'CF', grad: 2034, note: 'Plus runner' },
    ],
  },
  {
    id: 't2', name: '10U Cougars', age: '10U', record: '31-7', coach: 'Coach Donnelly',
    aiGrade: 82, highlight: 'Perfect Game 10U Super25 — Semifinalists',
    roster: [
      { name: 'Eli Marsh', pos: '2B', grad: 2032, note: 'Elite glove' },
      { name: 'Beckett Ryan', pos: 'C', grad: 2032, note: 'Strong arm' },
      { name: 'Hudson Pratt', pos: '1B', grad: 2032, note: 'Emerging power' },
    ],
  },
  {
    id: 't3', name: '12U Cougars', age: '12U', record: '36-6', coach: 'Coach Okafor',
    aiGrade: 85, highlight: 'PBR Future Games Qualifier',
    roster: [
      { name: 'Sam Okafor', pos: '2B', grad: 2030, note: 'Top hitter in age group' },
      { name: 'Theo Banks', pos: 'SS', grad: 2030, note: 'Smooth actions' },
      { name: 'Caleb Stone', pos: 'P', grad: 2030, note: 'Advanced feel to pitch' },
    ],
  },
  {
    id: 't4', name: '14U Upper Deck Cougars', age: '14U', record: '41-5', coach: 'Coach Delgado',
    aiGrade: 92, highlight: 'PG WWBA Midwest — Champions',
    spotlight: true,
    roster: [
      { name: 'Marcus Delgado', pos: 'SS', grad: 2029, note: 'Flagship prospect — 91 AI grade' },
      { name: 'Jaylen Carter', pos: 'CF', grad: 2029, note: 'Plus-plus speed' },
      { name: 'Cole Whitaker', pos: '3B', grad: 2029, note: 'Advanced approach' },
      { name: 'Ryan Halverson', pos: 'P', grad: 2029, note: 'Projectable arm' },
      { name: 'Drew Castellano', pos: 'C', grad: 2029, note: 'Elite blocker' },
    ],
  },
  {
    id: 't5', name: '16U Hitters Black', age: '16U', record: '29-11', coach: 'Coach Brennan',
    aiGrade: 88, highlight: '6 college commitments this cycle',
    roster: [
      { name: 'Tyler Brennan', pos: '1B', grad: 2028, note: '96 mph max EV' },
      { name: 'Diego Ramirez', pos: 'C', grad: 2028, note: '1.92 pop time' },
      { name: 'Xavier Pope', pos: 'SS', grad: 2028, note: 'D1 interest' },
    ],
  },
  {
    id: 't6', name: '17U Hitters Black', age: '17U', record: '33-8', coach: 'Coach Vance',
    aiGrade: 90, highlight: 'PG National Showcase invitees',
    roster: [
      { name: 'Owen Petrakis', pos: 'P', grad: 2027, note: 'Touched 87, plus slider' },
      { name: 'Nico Vance', pos: 'RF', grad: 2027, note: 'Five-tool profile' },
      { name: 'Grant Mueller', pos: '3B', grad: 2027, note: 'Committed D1' },
    ],
  },
];

// ----------------------------------------------------------------------------
// Schedule
// ----------------------------------------------------------------------------
export const GAMES: Game[] = [
  { id: 'g1', date: 'May 31, 2026', status: 'final', ageGroup: '14U', opponent: 'Indiana Bulls', tournament: 'PG WWBA Midwest', location: 'Westfield, IN', result: { us: 7, them: 3, win: true } },
  { id: 'g2', date: 'Jun 1, 2026', status: 'final', ageGroup: '16U', opponent: 'Canes Great Lakes', tournament: 'PBR Super 60', location: 'Crestwood, IL', result: { us: 5, them: 6, win: false } },
  { id: 'g3', date: 'Jun 2, 2026', status: 'final', ageGroup: '17U', opponent: 'Top Tier Roos', tournament: 'Rock Summer Kickoff', location: 'Joliet, IL', result: { us: 9, them: 2, win: true } },
  { id: 'g4', date: 'Jun 7, 2026', status: 'final', ageGroup: '12U', opponent: 'Midwest Nationals', tournament: 'USSSA Prairie State', location: 'Tinley Park, IL', result: { us: 11, them: 4, win: true } },
  { id: 'g5', date: 'Jun 14, 2026', status: 'upcoming', ageGroup: '14U', opponent: 'Chicago Scots', tournament: 'PG 14U BCS Finals', location: 'Frankfort, IL' },
  { id: 'g6', date: 'Jun 20, 2026', status: 'upcoming', ageGroup: '16U', opponent: 'Hitters Wisconsin', tournament: 'PBR Future Games', location: 'Cedar Rapids, IA' },
  { id: 'g7', date: 'Jun 27, 2026', status: 'upcoming', ageGroup: '17U', opponent: 'Five Star National', tournament: 'PG WWBA National', location: 'Marietta, GA' },
  { id: 'g8', date: 'Jul 5, 2026', status: 'upcoming', ageGroup: '12U', opponent: 'Cangelosi Sparks', tournament: 'Rock Independence Classic', location: 'Joliet, IL' },
];

// ----------------------------------------------------------------------------
// Tryouts
// ----------------------------------------------------------------------------
export const TRYOUTS = [
  { age: '8U – 10U', date: 'August 8, 2026', time: '9:00 AM', location: 'Frankfort Square Park, IL' },
  { age: '11U – 12U', date: 'August 8, 2026', time: '11:30 AM', location: 'Frankfort Square Park, IL' },
  { age: '13U – 14U', date: 'August 9, 2026', time: '9:00 AM', location: 'Tinley Park Sportsplex, IL' },
  { age: '15U – 17U', date: 'August 9, 2026', time: '12:00 PM', location: 'Tinley Park Sportsplex, IL' },
];

// ----------------------------------------------------------------------------
// News
// ----------------------------------------------------------------------------
export const NEWS = [
  { tag: 'Championship', title: '14U Upper Deck Cougars Capture PG WWBA Midwest Crown', date: 'Jun 2, 2026', body: 'A complete-team effort powered the 14U Cougars to a 7-3 title-game win over the Indiana Bulls behind Marcus Delgado\'s 3-hit night.' },
  { tag: 'Recruiting', title: '6 Hitters Black Players Earn College Commitments', date: 'May 24, 2026', body: 'The 2027 and 2028 classes continue to deliver, with six athletes announcing their commitments this spring across D1 and D2 programs.' },
  { tag: 'Technology', title: 'Scout AI Player Reports Now Live for All Families', date: 'May 18, 2026', body: 'Every UDC athlete now receives an AI-generated development report each month — tracking exit velocity, swing efficiency, and a personalized growth plan.' },
  { tag: 'Community', title: 'Annual Cougars Grind Clinic Raises $12K for Youth Baseball', date: 'May 10, 2026', body: 'Coaches and alumni hosted 200+ local kids for a free skills day, keeping the blue-collar give-back tradition alive since 1992.' },
];

export const TESTIMONIALS = [
  { quote: 'UDC develops players the right way — relentless work ethic plus data that actually helps my son improve. Best decision we made.', name: 'Parent of 14U athlete' },
  { quote: 'The Scout AI report showed me exactly what to work on. My exit velo jumped 7 mph in one season.', name: '2028 OF commit' },
  { quote: 'Old-school grind, new-school tools. These coaches care about the player AND the person.', name: 'Parent of 16U athlete' },
];

// ----------------------------------------------------------------------------
// SCOUT AI — deterministic mock scouting engine
// ----------------------------------------------------------------------------
export type ScoutInput = {
  ageGroup: string;
  position: Position;
  tools: ToolGrades;
};

export type ScoutReport = {
  overall: number;
  recruitingGrade: string;
  ceiling: string;
  ceilingPct: number;
  strengths: string[];
  priorities: string[];
  comps: string[];
  radar: { tool: string; value: number; league: number }[];
  summary: string;
};

export const SCOUT_PRESETS: { label: string; input: ScoutInput }[] = [
  { label: '14U Shortstop Prospect', input: { ageGroup: '14U', position: 'SS', tools: { hit: 78, power: 70, speed: 82, arm: 80, field: 84, iq: 86 } } },
  { label: 'Power-Hitting 1B', input: { ageGroup: '16U', position: '1B', tools: { hit: 74, power: 90, speed: 58, arm: 70, field: 74, iq: 80 } } },
  { label: 'Elite Arm RHP (2027)', input: { ageGroup: '17U', position: 'P', tools: { hit: 60, power: 76, speed: 64, arm: 94, field: 78, iq: 86 } } },
];

const TOOL_LABELS: Record<keyof ToolGrades, string> = {
  hit: 'Hit', power: 'Power', speed: 'Speed', arm: 'Arm', field: 'Field', iq: 'Baseball IQ',
};

const COMP_POOL: Record<string, string[]> = {
  SS: ['Bobby Witt Jr. archetype', 'Trea Turner profile', 'Corey Seager build'],
  '1B': ['Pete Alonso archetype', 'Freddie Freeman profile', 'Matt Olson build'],
  P: ['Spencer Strider archetype', 'Logan Gilbert profile', 'projectable mid-rotation arm'],
  CF: ['Julio Rodríguez archetype', 'Byron Buxton profile', 'plus-plus runner build'],
  C: ['Adley Rutschman archetype', 'Will Smith profile', 'defensive-first backstop'],
  default: ['high-floor everyday profile', 'versatile utility upside', 'projectable two-way build'],
};

export function runScoutAI(input: ScoutInput): ScoutReport {
  const t = input.tools;
  // Weighted overall: hit & iq matter most for hitters; arm dominates for P
  const isP = input.position === 'P';
  const overall = Math.round(
    isP
      ? t.arm * 0.4 + t.iq * 0.2 + t.power * 0.2 + t.field * 0.1 + t.hit * 0.05 + t.speed * 0.05
      : t.hit * 0.28 + t.iq * 0.18 + t.power * 0.18 + t.field * 0.16 + t.speed * 0.12 + t.arm * 0.08
  );

  const sorted = (Object.keys(t) as (keyof ToolGrades)[]).sort((a, b) => t[b] - t[a]);
  const strengthsKeys = sorted.slice(0, 2);
  const priorityKeys = sorted.slice(-2).reverse();

  const strengthCopy: Record<keyof ToolGrades, string> = {
    hit: 'Advanced barrel control and contact ability — projects to hit for average.',
    power: 'Plus raw power with the bat speed to drive the ball gap-to-gap.',
    speed: 'Plus run tool that impacts the game on the bases and in the field.',
    arm: 'Plus arm strength that profiles on the left side / on the mound.',
    field: 'Reliable, instinctual defender with clean actions and range.',
    iq: 'High baseball IQ — elite instincts, situational awareness, and approach.',
  };
  const priorityCopy: Record<keyof ToolGrades, string> = {
    hit: 'Refine swing decisions and two-strike approach to lift contact quality.',
    power: 'Add strength and improve launch conditions to unlock more game power.',
    speed: 'Improve first-step explosiveness and baserunning reads.',
    arm: 'Build arm strength through a structured throwing & recovery program.',
    field: 'Sharpen footwork, glove transfers, and pre-pitch positioning.',
    iq: 'Deepen game preparation, pitch recognition, and situational reps.',
  };

  const grade =
    overall >= 90 ? 'Elite (D1 High-Major projection)'
    : overall >= 84 ? 'Advanced (D1 projection)'
    : overall >= 76 ? 'Solid (D1/D2 follow)'
    : overall >= 68 ? 'Developing (emerging follow)'
    : 'Foundational (project)';

  const ceiling =
    overall >= 90 ? 'Premium high-major contributor / pro follow'
    : overall >= 84 ? 'High-major recruit'
    : overall >= 76 ? 'Mid-major / strong D2 contributor'
    : 'Multi-year developmental upside';

  const comps = (COMP_POOL[input.position] ?? COMP_POOL.default).slice(0, 2);

  const radar = (Object.keys(t) as (keyof ToolGrades)[]).map((k) => ({
    tool: TOOL_LABELS[k],
    value: t[k],
    league: 65, // age-group average baseline
  }));

  const summary = `LevelUp-grade evaluation: a ${input.ageGroup} ${input.position} with a ${overall} overall projection. ` +
    `${strengthCopy[strengthsKeys[0]]} The athlete's calling card is the ${TOOL_LABELS[strengthsKeys[0]].toLowerCase()} tool, ` +
    `with clear runway to grow the ${TOOL_LABELS[priorityKeys[0]].toLowerCase()} tool through a targeted development plan.`;

  return {
    overall,
    recruitingGrade: grade,
    ceiling,
    ceilingPct: Math.min(99, overall + 6),
    strengths: strengthsKeys.map((k) => strengthCopy[k]),
    priorities: priorityKeys.map((k) => priorityCopy[k]),
    comps,
    radar,
    summary,
  };
}

// ----------------------------------------------------------------------------
// TRAIN AI — personalized development plan generator
// ----------------------------------------------------------------------------
export type TrainInput = { position: Position; focus: 'Power' | 'Hitting' | 'Speed' | 'Defense' | 'Pitching'; weeks: number };
export type TrainWeek = { week: number; theme: string; blocks: string[] };

const FOCUS_LIBRARY: Record<TrainInput['focus'], { theme: string; blocks: string[] }[]> = {
  Power: [
    { theme: 'Foundation & Force', blocks: ['Trap-bar deadlift 3x5', 'Med-ball rotational throws 4x6', 'Tee work: drive-the-line 60 swings', 'Mobility: T-spine + hips'] },
    { theme: 'Bat Speed Development', blocks: ['Overload/underload bat protocol', 'Box jumps 4x4', 'Front-toss launch-angle work', 'Recovery + sleep tracking'] },
    { theme: 'Sequencing & Transfer', blocks: ['Olympic lift variations', 'Constraint hitting (heavy ball)', 'Live BP — pull-side intent', 'Video review of hip-shoulder separation'] },
    { theme: 'Game Power Application', blocks: ['In-game swing decisions', 'Situational power BP', 'Strength maintenance 2x', 'EV testing + retest'] },
    { theme: 'Peak & Express', blocks: ['Plyometrics + sprint work', 'High-intent live ABs', 'Mobility maintenance', 'Mental cue refinement'] },
    { theme: 'Compete & Measure', blocks: ['Scrimmage reps', 'Full EV / bat-speed retest', 'Deload + recovery', 'Set next-block goals'] },
  ],
  Hitting: [
    { theme: 'Approach & Vision', blocks: ['Pitch-recognition drills', 'Tee: barrel accuracy 80 swings', 'Two-strike approach work', 'Strike-zone discipline charting'] },
    { theme: 'Swing Mechanics', blocks: ['Video swing audit', 'Front-toss to all fields', 'Hand-path constraint drills', 'Core stability circuit'] },
    { theme: 'Timing & Rhythm', blocks: ['Variable-speed front toss', 'Load/stride timing reps', 'Live BP vs offspeed', 'Mental rep visualization'] },
    { theme: 'Situational Hitting', blocks: ['Hit-and-run / move-the-runner', 'Opposite-field intent BP', 'Bunt game refinement', 'In-game approach plan'] },
    { theme: 'Competitive At-Bats', blocks: ['Live ABs vs velocity', 'Chase-rate charting', 'Recovery + mobility', 'Approach self-scouting'] },
    { theme: 'Measure & Refine', blocks: ['Scrimmage at-bats', 'Contact-quality retest', 'Deload week', 'Next-block targets'] },
  ],
  Speed: [
    { theme: 'Mechanics & Posture', blocks: ['Sprint form drills (wall, A-skip)', 'Acceleration 10-20yd x6', 'Baserunning leads & reads', 'Ankle/hip mobility'] },
    { theme: 'Force & Power', blocks: ['Squat 3x5', 'Bounding + broad jumps', 'Resisted sprints', 'First-step reaction drills'] },
    { theme: 'Top-End Speed', blocks: ['Flying 30s x5', 'Stolen-base technique', 'Plyometric circuit', 'Recovery protocol'] },
    { theme: 'Reactive Speed', blocks: ['Lateral agility ladder', 'Read-and-react baserunning', 'Outfield routes / range', '60-yd time trial'] },
    { theme: 'Game Application', blocks: ['Live baserunning decisions', 'Steal-jump timing', 'Maintenance lifting', 'Speed retest'] },
    { theme: 'Compete & Measure', blocks: ['Scrimmage baserunning', 'Full 60-yd retest', 'Deload', 'Next-block plan'] },
  ],
  Defense: [
    { theme: 'Footwork Foundation', blocks: ['Pre-pitch tempo drills', 'Glove transfers 100 reps', 'Short-hop progression', 'Mobility circuit'] },
    { theme: 'Range & Actions', blocks: ['Lateral range drills', 'Backhand/forehand reps', 'Double-play footwork', 'Reaction-ball work'] },
    { theme: 'Arm & Accuracy', blocks: ['Long-toss progression', 'Throwing-on-the-run reps', 'Footwork-to-throw timing', 'Arm care band routine'] },
    { theme: 'Game Situations', blocks: ['Cutoffs & relays', 'Bunt-defense reps', 'Communication drills', 'Pop-time / range retest'] },
    { theme: 'Live Reps', blocks: ['Fungo at game speed', 'Scrimmage defense', 'Recovery + mobility', 'Self-scout video'] },
    { theme: 'Measure & Refine', blocks: ['Scrimmage reps', 'Defensive metrics retest', 'Deload', 'Next-block targets'] },
  ],
  Pitching: [
    { theme: 'Arm Health & Base', blocks: ['Throwing program (build phase)', 'Arm-care band routine', 'Lower-half strength 3x', 'Mobility: hips + shoulders'] },
    { theme: 'Mechanics & Sequencing', blocks: ['Video delivery audit', 'Drive-leg / hip drills', 'Flat-ground command work', 'Med-ball sequencing'] },
    { theme: 'Velocity Development', blocks: ['Weighted-ball protocol', 'Plyo + sprint work', 'Mound velo pens', 'Recovery tracking'] },
    { theme: 'Command & Mix', blocks: ['Bullpen: zone command', 'Secondary-pitch shaping', 'Pitch-design (spin) review', 'Mental game routine'] },
    { theme: 'Compete', blocks: ['Live ABs / sim innings', 'Pitch-mix usage plan', 'Maintenance lifting', 'Velo + command retest'] },
    { theme: 'Measure & Refine', blocks: ['Game-speed sim outing', 'Full velo / spin retest', 'Deload', 'Next-block plan'] },
  ],
};

export function runTrainAI(input: TrainInput): TrainWeek[] {
  const lib = FOCUS_LIBRARY[input.focus];
  const n = Math.max(4, Math.min(6, input.weeks));
  return Array.from({ length: n }, (_, i) => ({
    week: i + 1,
    theme: lib[i % lib.length].theme,
    blocks: lib[i % lib.length].blocks,
  }));
}

// ----------------------------------------------------------------------------
// PREDICT AI — matchup forecaster
// ----------------------------------------------------------------------------
export type PredictResult = {
  winPct: number;
  projScore: { us: number; them: number };
  keyFactors: string[];
  xFactor: string;
  confidence: 'High' | 'Medium' | 'Low';
};

const OPPONENTS = ['Indiana Bulls', 'Canes Great Lakes', 'Top Tier Roos', 'Chicago Scots', 'Five Star National', 'Cangelosi Sparks'];
export const PREDICT_OPPONENTS = OPPONENTS;

export function runPredictAI(teamId: string, opponent: string): PredictResult {
  const team = TEAMS.find((t) => t.id === teamId) ?? TEAMS[3];
  // deterministic pseudo-rating from opponent string
  const oppRating = 60 + (Array.from(opponent).reduce((a, c) => a + c.charCodeAt(0), 0) % 28);
  const diff = team.aiGrade - oppRating;
  const winPct = Math.max(8, Math.min(92, Math.round(50 + diff * 1.6)));
  const us = Math.max(2, Math.round(5 + diff / 8));
  const them = Math.max(1, Math.round(5 - diff / 9));
  return {
    winPct,
    projScore: { us, them },
    keyFactors: [
      `${team.name} grades out at ${team.aiGrade} AI team rating vs an estimated ${oppRating} for ${opponent}.`,
      diff >= 0 ? 'Edge in barrel rate and quality at-bats in the middle of the order.' : 'Will need to win the margins — baserunning and two-out RBIs.',
      'Bullpen depth and defensive efficiency project as the swing factor late.',
    ],
    xFactor: diff >= 5 ? 'Top-of-order table-setters getting on base at a high clip.' : 'Limiting free bases — walks and errors decide tight games.',
    confidence: Math.abs(diff) > 8 ? 'High' : Math.abs(diff) > 3 ? 'Medium' : 'Low',
  };
}
