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
  number: number;
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
  roster: { name: string; number?: number; pos: Position; grad: number; note: string }[];
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
// Hitters Black 2035 — real roster (names + jersey numbers).
// NOTE: positions and all metrics below are illustrative sample/demo data,
// dialed to age-appropriate ranges for a Class of 2035 (≈10U) team.
export const PLAYERS: Player[] = [
  {
    id: 'p1', name: 'Cade Burhans', number: 21, position: 'SS', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'11\"",
    avg: 0.486, obp: 0.572, ops: 1.318, exitVeloMax: 62, sixtyYard: 8.74,
    tools: { hit: 84, power: 72, speed: 82, arm: 80, field: 86, iq: 88 },
    aiGrade: 93, insight: 'Team leader with elite barrel control for his age — swing path tightening every month.',
    trend: [{ m: 'Jan', ev: 54 }, { m: 'Feb', ev: 56 }, { m: 'Mar', ev: 58 }, { m: 'Apr', ev: 60 }, { m: 'May', ev: 62 }],
  },
  {
    id: 'p2', name: 'Anakin Aguilera', number: 10, position: 'CF', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'9\"",
    avg: 0.441, obp: 0.531, ops: 1.142, exitVeloMax: 55, sixtyYard: 8.52,
    tools: { hit: 80, power: 60, speed: 90, arm: 74, field: 86, iq: 82 },
    aiGrade: 88, insight: 'Sparkplug runner — fastest on the team with plus range in center.',
    trend: [{ m: 'Jan', ev: 48 }, { m: 'Feb', ev: 50 }, { m: 'Mar', ev: 51 }, { m: 'Apr', ev: 53 }, { m: 'May', ev: 55 }],
  },
  {
    id: 'p3', name: 'Brody Roach', number: 13, position: '3B', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'10\"",
    avg: 0.419, obp: 0.498, ops: 1.087, exitVeloMax: 60, sixtyYard: 9.05,
    tools: { hit: 78, power: 76, speed: 64, arm: 84, field: 80, iq: 80 },
    aiGrade: 86, insight: 'Strong hands at the hot corner — drives the ball hard to the pull side.',
    trend: [{ m: 'Jan', ev: 52 }, { m: 'Feb', ev: 54 }, { m: 'Mar', ev: 56 }, { m: 'Apr', ev: 58 }, { m: 'May', ev: 60 }],
  },
  {
    id: 'p4', name: 'Camden Phillips', number: 7, position: 'P', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'10\"",
    avg: 0.372, obp: 0.471, ops: 0.951, exitVeloMax: 56, sixtyYard: 9.12,
    tools: { hit: 70, power: 66, speed: 68, arm: 88, field: 80, iq: 86 },
    aiGrade: 87, insight: 'Strike-thrower with a quick arm — competes in the zone and fields his position well.',
    trend: [{ m: 'Jan', ev: 49 }, { m: 'Feb', ev: 51 }, { m: 'Mar', ev: 52 }, { m: 'Apr', ev: 54 }, { m: 'May', ev: 56 }],
  },
  {
    id: 'p5', name: 'Camden Wittmayer', number: 4, position: '2B', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'L', throws: 'R', height: "4'8\"",
    avg: 0.408, obp: 0.515, ops: 1.064, exitVeloMax: 52, sixtyYard: 8.66,
    tools: { hit: 82, power: 56, speed: 84, arm: 70, field: 84, iq: 86 },
    aiGrade: 85, insight: 'Steady glove up the middle with a patient, contact-first approach.',
    trend: [{ m: 'Jan', ev: 45 }, { m: 'Feb', ev: 47 }, { m: 'Mar', ev: 48 }, { m: 'Apr', ev: 50 }, { m: 'May', ev: 52 }],
  },
  {
    id: 'p6', name: 'Cameron Sevedge', number: 3, position: 'C', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'9\"",
    avg: 0.366, obp: 0.462, ops: 0.944, exitVeloMax: 57, sixtyYard: 9.34,
    tools: { hit: 74, power: 72, speed: 58, arm: 86, field: 84, iq: 88 },
    aiGrade: 86, insight: 'Tough backstop and vocal leader — blocks well and controls the run game.',
    trend: [{ m: 'Jan', ev: 50 }, { m: 'Feb', ev: 52 }, { m: 'Mar', ev: 53 }, { m: 'Apr', ev: 55 }, { m: 'May', ev: 57 }],
  },
  {
    id: 'p7', name: 'Dominik Wilk', number: 23, position: '1B', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'L', throws: 'L', height: "5'0\"",
    avg: 0.398, obp: 0.486, ops: 1.121, exitVeloMax: 64, sixtyYard: 9.48,
    tools: { hit: 76, power: 82, speed: 54, arm: 74, field: 78, iq: 80 },
    aiGrade: 87, insight: 'Biggest raw power on the roster — when he squares it up, it travels.',
    trend: [{ m: 'Jan', ev: 56 }, { m: 'Feb', ev: 58 }, { m: 'Mar', ev: 60 }, { m: 'Apr', ev: 62 }, { m: 'May', ev: 64 }],
  },
  {
    id: 'p8', name: 'Izaac Combs', number: 16, position: 'RF', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'9\"",
    avg: 0.381, obp: 0.479, ops: 1.003, exitVeloMax: 54, sixtyYard: 8.89,
    tools: { hit: 78, power: 64, speed: 80, arm: 82, field: 80, iq: 80 },
    aiGrade: 84, insight: 'Athletic outfielder with a strong, accurate arm from right.',
    trend: [{ m: 'Jan', ev: 47 }, { m: 'Feb', ev: 49 }, { m: 'Mar', ev: 50 }, { m: 'Apr', ev: 52 }, { m: 'May', ev: 54 }],
  },
  {
    id: 'p9', name: 'Jay S.', number: 28, position: 'LF', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'8\"",
    avg: 0.355, obp: 0.458, ops: 0.912, exitVeloMax: 51, sixtyYard: 9.02,
    tools: { hit: 74, power: 58, speed: 78, arm: 72, field: 78, iq: 82 },
    aiGrade: 82, insight: 'Energy guy who runs every ball out and takes great at-bats.',
    trend: [{ m: 'Jan', ev: 44 }, { m: 'Feb', ev: 46 }, { m: 'Mar', ev: 47 }, { m: 'Apr', ev: 49 }, { m: 'May', ev: 51 }],
  },
  {
    id: 'p10', name: 'Logan Lovell', number: 8, position: 'SS', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'10\"",
    avg: 0.403, obp: 0.492, ops: 1.058, exitVeloMax: 56, sixtyYard: 8.71,
    tools: { hit: 80, power: 64, speed: 82, arm: 82, field: 86, iq: 84 },
    aiGrade: 87, insight: 'Smooth infield actions and clean transfers — projectable up-the-middle defender.',
    trend: [{ m: 'Jan', ev: 49 }, { m: 'Feb', ev: 51 }, { m: 'Mar', ev: 52 }, { m: 'Apr', ev: 54 }, { m: 'May', ev: 56 }],
  },
  {
    id: 'p11', name: 'Logan Miller', number: 18, position: 'P', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'11\"",
    avg: 0.347, obp: 0.444, ops: 0.901, exitVeloMax: 55, sixtyYard: 9.21,
    tools: { hit: 70, power: 66, speed: 66, arm: 86, field: 80, iq: 84 },
    aiGrade: 85, insight: 'Competitive on the mound with repeatable mechanics and a developing breaking ball.',
    trend: [{ m: 'Jan', ev: 48 }, { m: 'Feb', ev: 50 }, { m: 'Mar', ev: 51 }, { m: 'Apr', ev: 53 }, { m: 'May', ev: 55 }],
  },
  {
    id: 'p12', name: 'Lucas Strzykalski', number: 14, position: 'CF', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'L', throws: 'R', height: "4'9\"",
    avg: 0.412, obp: 0.508, ops: 1.079, exitVeloMax: 53, sixtyYard: 8.58,
    tools: { hit: 82, power: 58, speed: 88, arm: 74, field: 84, iq: 84 },
    aiGrade: 86, insight: 'Left-handed table-setter — covers ground and gets on base at a high clip.',
    trend: [{ m: 'Jan', ev: 46 }, { m: 'Feb', ev: 48 }, { m: 'Mar', ev: 49 }, { m: 'Apr', ev: 51 }, { m: 'May', ev: 53 }],
  },
  {
    id: 'p13', name: 'Luke Porter', number: 12, position: '3B', age: 10, gradYear: 2035,
    team: 'Hitters Black 2035', bats: 'R', throws: 'R', height: "4'10\"",
    avg: 0.389, obp: 0.481, ops: 1.022, exitVeloMax: 58, sixtyYard: 9.06,
    tools: { hit: 78, power: 74, speed: 66, arm: 84, field: 82, iq: 82 },
    aiGrade: 85, insight: 'Reliable defender with pop in the bat — drives in runs in the middle of the order.',
    trend: [{ m: 'Jan', ev: 51 }, { m: 'Feb', ev: 53 }, { m: 'Mar', ev: 54 }, { m: 'Apr', ev: 56 }, { m: 'May', ev: 58 }],
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
    id: 't4', name: 'Hitters Black 2035', age: '10U', record: '38-6', coach: 'UDC Staff',
    aiGrade: 91, highlight: 'Flagship Class of 2035 travel team',
    spotlight: true,
    roster: [
      { name: 'Cade Burhans', number: 21, pos: 'SS', grad: 2035, note: 'Team leader — 93 AI development grade' },
      { name: 'Anakin Aguilera', number: 10, pos: 'CF', grad: 2035, note: 'Fastest on the team' },
      { name: 'Brody Roach', number: 13, pos: '3B', grad: 2035, note: 'Strong hands at the hot corner' },
      { name: 'Camden Phillips', number: 7, pos: 'P', grad: 2035, note: 'Strike-thrower, quick arm' },
      { name: 'Camden Wittmayer', number: 4, pos: '2B', grad: 2035, note: 'Steady glove up the middle' },
      { name: 'Cameron Sevedge', number: 3, pos: 'C', grad: 2035, note: 'Vocal leader behind the dish' },
      { name: 'Dominik Wilk', number: 23, pos: '1B', grad: 2035, note: 'Biggest raw power on the roster' },
      { name: 'Izaac Combs', number: 16, pos: 'RF', grad: 2035, note: 'Strong, accurate arm' },
      { name: 'Jay S.', number: 28, pos: 'LF', grad: 2035, note: 'Energy guy, great at-bats' },
      { name: 'Logan Lovell', number: 8, pos: 'SS', grad: 2035, note: 'Smooth infield actions' },
      { name: 'Logan Miller', number: 18, pos: 'P', grad: 2035, note: 'Repeatable mechanics' },
      { name: 'Lucas Strzykalski', number: 14, pos: 'CF', grad: 2035, note: 'Left-handed table-setter' },
      { name: 'Luke Porter', number: 12, pos: '3B', grad: 2035, note: 'Pop in the bat, RBI threat' },
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
  { tag: 'Champions', title: 'Hitters Black 2035 Win Summer Kickoff Behind Team-Wide Effort', date: 'Jun 2, 2026', body: 'The Class of 2035 squad strung together quality at-bats top to bottom — with Cade Burhans setting the table — to bring home another hardware weekend.' },
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
