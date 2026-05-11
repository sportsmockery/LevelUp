import { supabaseServer } from '@/lib/supabase-server';
import LineupIQClient, {
  type LineupTeam,
  type LineupPlayer,
} from './LineupIQClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type GcTeam = {
  id: string;
  gc_id: string;
  name: string;
  sport: string | null;
  level: string | null;
};

type GcPlayer = {
  id: string;
  team_id: string;
  first_name: string | null;
  last_name: string | null;
  jersey_number: number | null;
};

type GcGameRow = { team_id: string; result: string | null };

type StatRow = {
  player_id: string;
  is_season_total: boolean | null;
  raw: Record<string, unknown> | null;
};

// Tracked GC public_ids per the GameChanger Integration doc.
const TRACKED_TEAM_PUBLIC_IDS = [
  'v2FmyevcsoGf', // Tinley Park Bulldogs Black 14u
  'BYTZzvAjuefq', // Hitters Black 2035 (14u)
  '2ZS6zEB9Rm5d', // 9u Bulldogs - Fazekas
  'bXtan7Hljwmh', // Rhino Baseball - Eastman 11U
];

function normalizeLevel(raw: string | null | undefined, name: string): string {
  const haystack = [raw ?? '', name].join(' ');
  // Class-year teams (e.g., "Hitters Black 2035") win over generic U-level tags.
  const classYear = haystack.match(/\b(20\d{2})\b/);
  if (classYear) return classYear[1];
  const uLevel = haystack.toLowerCase().match(/(\d{1,2})\s*u/);
  if (uLevel) return `${uLevel[1]}u`;
  return 'other';
}

function recordFromResults(results: (string | null | undefined)[]): string {
  let w = 0;
  let l = 0;
  let t = 0;
  for (const r of results) {
    if (!r) continue;
    const first = r.trim()[0]?.toUpperCase();
    if (first === 'W') w++;
    else if (first === 'L') l++;
    else if (first === 'T') t++;
  }
  return `${w}-${l}${t ? `-${t}` : ''}`;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function fmt3(v: number | null): string {
  if (v === null) return '.000';
  const s = v.toFixed(3);
  return s.startsWith('0') ? s.slice(1) : s;
}

function fmtEra(v: number | null): string {
  if (v === null) return '—';
  return v.toFixed(2);
}

async function loadDashboardData(): Promise<{
  teams: LineupTeam[];
  rosterByTeam: Record<string, LineupPlayer[]>;
  teamAggregates: Record<
    string,
    { teamAvg: string; runDiff: string; staffEra: string; ip: string }
  >;
}> {
  if (!supabaseServer) {
    return { teams: [], rosterByTeam: {}, teamAggregates: {} };
  }

  const { data: teamRows } = await supabaseServer
    .from('gc_teams')
    .select('id, gc_id, name, sport, level')
    .in('gc_id', TRACKED_TEAM_PUBLIC_IDS);

  const teams = (teamRows ?? []) as GcTeam[];
  if (!teams.length) {
    return { teams: [], rosterByTeam: {}, teamAggregates: {} };
  }

  const teamIds = teams.map((t) => t.id);

  const [{ data: playerRows }, { data: gameRows }, { data: battingRows }, { data: pitchingRows }] =
    await Promise.all([
      supabaseServer
        .from('gc_players')
        .select('id, team_id, first_name, last_name, jersey_number')
        .in('team_id', teamIds),
      supabaseServer
        .from('gc_games')
        .select('team_id, result')
        .in('team_id', teamIds),
      supabaseServer
        .from('gc_batting_stats')
        .select('player_id, is_season_total, raw')
        .eq('is_season_total', true),
      supabaseServer
        .from('gc_pitching_stats')
        .select('player_id, is_season_total, raw')
        .eq('is_season_total', true),
    ]);

  const players = (playerRows ?? []) as GcPlayer[];
  const games = (gameRows ?? []) as GcGameRow[];
  const batting = (battingRows ?? []) as StatRow[];
  const pitching = (pitchingRows ?? []) as StatRow[];

  const battingByPlayer = new Map<string, Record<string, unknown>>();
  for (const r of batting) {
    if (r.is_season_total && r.raw) battingByPlayer.set(r.player_id, r.raw);
  }
  const pitchingByPlayer = new Map<string, Record<string, unknown>>();
  for (const r of pitching) {
    if (r.is_season_total && r.raw) pitchingByPlayer.set(r.player_id, r.raw);
  }

  const playersByTeam = new Map<string, GcPlayer[]>();
  for (const p of players) {
    const list = playersByTeam.get(p.team_id) ?? [];
    list.push(p);
    playersByTeam.set(p.team_id, list);
  }

  const gamesByTeam = new Map<string, string[]>();
  for (const g of games) {
    const list = gamesByTeam.get(g.team_id) ?? [];
    if (g.result) list.push(g.result);
    gamesByTeam.set(g.team_id, list);
  }

  const teamAggregates: Record<
    string,
    { teamAvg: string; runDiff: string; staffEra: string; ip: string }
  > = {};
  const rosterByTeam: Record<string, LineupPlayer[]> = {};
  const outTeams: LineupTeam[] = [];

  for (const t of teams) {
    const teamPlayers = playersByTeam.get(t.id) ?? [];
    const record = recordFromResults(gamesByTeam.get(t.id) ?? []);
    const level = normalizeLevel(t.level, t.name);

    let teamAbSum = 0;
    let teamHSum = 0;
    let teamIpSum = 0;
    let teamErSum = 0;
    let rs = 0;
    let ra = 0;

    for (const result of gamesByTeam.get(t.id) ?? []) {
      const m = result.match(/^([WLT])\s+(\d+)\s*[-–]\s*(\d+)/i);
      if (!m) continue;
      const a = parseInt(m[2], 10);
      const b = parseInt(m[3], 10);
      if (Number.isNaN(a) || Number.isNaN(b)) continue;
      const isWin = m[1].toUpperCase() === 'W';
      const isLoss = m[1].toUpperCase() === 'L';
      const teamScore = isWin ? Math.max(a, b) : isLoss ? Math.min(a, b) : a;
      const oppScore = isWin ? Math.min(a, b) : isLoss ? Math.max(a, b) : b;
      rs += teamScore;
      ra += oppScore;
    }

    const playersOut: LineupPlayer[] = [];
    for (const p of teamPlayers) {
      const bat = battingByPlayer.get(p.id) ?? null;
      const pit = pitchingByPlayer.get(p.id) ?? null;

      const ab = num(bat?.AB) ?? 0;
      const h = num(bat?.H) ?? 0;
      const avg = num(bat?.AVG) ?? (ab > 0 ? h / ab : 0);
      const ops = num(bat?.OPS) ?? 0;
      const hr = Math.round(num(bat?.HR) ?? 0);
      const rbi = Math.round(num(bat?.RBI) ?? 0);
      const sb = Math.round(num(bat?.SB) ?? 0);

      const era = num(pit?.ERA);
      const ip = num(pit?.IP) ?? 0;
      const so = Math.round(num(pit?.SO) ?? 0);
      const whip = num(pit?.WHIP);

      teamAbSum += ab;
      teamHSum += h;
      if (ip > 0 && era !== null) {
        teamIpSum += ip;
        teamErSum += (era * ip) / 7; // youth ERA uses 7-inning game length per GC
      }

      const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
      playersOut.push({
        id: p.id,
        name: fullName || `Player ${p.jersey_number ?? ''}`.trim(),
        number: p.jersey_number !== null ? `#${p.jersey_number}` : '#--',
        avg: fmt3(avg),
        ops: ops ? ops.toFixed(3) : '.000',
        hr,
        rbi,
        sb,
        era: fmtEra(era),
        ip: ip ? ip.toFixed(1) : '—',
        so,
        whip: whip !== null ? whip.toFixed(2) : '—',
        hasPitched: ip > 0,
      });
    }

    // Sort: hitters by OPS desc, then by RBI
    playersOut.sort((a, b) => {
      const ao = parseFloat(a.ops);
      const bo = parseFloat(b.ops);
      if (bo !== ao) return bo - ao;
      return b.rbi - a.rbi;
    });

    rosterByTeam[t.id] = playersOut;

    const teamAvg = teamAbSum > 0 ? teamHSum / teamAbSum : 0;
    const staffEra = teamIpSum > 0 ? (teamErSum * 7) / teamIpSum : null;

    teamAggregates[t.id] = {
      teamAvg: fmt3(teamAvg),
      runDiff: `${rs - ra >= 0 ? '+' : ''}${rs - ra} (${rs} RS / ${ra} RA)`,
      staffEra: fmtEra(staffEra),
      ip: teamIpSum > 0 ? `${teamIpSum.toFixed(1)} IP` : '—',
    };

    outTeams.push({
      id: t.id,
      gcId: t.gc_id,
      name: t.name,
      record,
      level,
    });
  }

  // Preserve the tracked-id order
  outTeams.sort(
    (a, b) =>
      TRACKED_TEAM_PUBLIC_IDS.indexOf(a.gcId) -
      TRACKED_TEAM_PUBLIC_IDS.indexOf(b.gcId),
  );

  return { teams: outTeams, rosterByTeam, teamAggregates };
}

export default async function LineupIQPage() {
  const { teams, rosterByTeam, teamAggregates } = await loadDashboardData();

  return (
    <LineupIQClient
      teams={teams}
      rosterByTeam={rosterByTeam}
      teamAggregates={teamAggregates}
    />
  );
}
