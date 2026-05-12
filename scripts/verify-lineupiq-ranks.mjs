#!/usr/bin/env node
/* eslint-disable */
// One-off verification script. Mirrors the LineupIQClient compute pipeline
// against live GameChanger data in Supabase and reports rank distributions
// per player. Run with `node scripts/verify-lineupiq-ranks.mjs`.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Read .env.local manually since dotenv may not auto-load it
const envText = readFileSync(
  new URL('../.env.local', import.meta.url),
  'utf8',
);
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const TRACKED = [
  'v2FmyevcsoGf', // Tinley Park Bulldogs Black 14u
  'BYTZzvAjuefq', // Hitters Black 2035
  '2ZS6zEB9Rm5d', // 9u Bulldogs - Fazekas
  'bXtan7Hljwmh', // Rhino Baseball - Eastman 11U
];

const AGE_BENCHMARKS = {
  '9u': { opsMean: 1.2, opsStd: 0.22, eraMean: 7.25, eraStd: 2.1 },
  '11u': { opsMean: 1.02, opsStd: 0.19, eraMean: 5.8, eraStd: 1.8 },
  '14u': { opsMean: 0.98, opsStd: 0.21, eraMean: 4.7, eraStd: 3.2 },
};

function clamp(n, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, n));
}

function normalizeLevel(raw, name) {
  const haystack = [raw ?? '', name].join(' ');
  const classYear = haystack.match(/\b(20\d{2})\b/);
  if (classYear) return classYear[1];
  const uLevel = haystack.toLowerCase().match(/(\d{1,2})\s*u/);
  if (uLevel) return `${uLevel[1]}u`;
  return 'other';
}

function benchmarksFor(level) {
  if (AGE_BENCHMARKS[level]) return AGE_BENCHMARKS[level];
  const year = parseInt(level, 10);
  if (!Number.isNaN(year)) {
    const today = new Date();
    const gradeYearsOut = year - today.getFullYear();
    const approxAge = Math.max(9, Math.min(14, 18 - gradeYearsOut));
    if (approxAge >= 13) return AGE_BENCHMARKS['14u'];
    if (approxAge >= 10) return AGE_BENCHMARKS['11u'];
    return AGE_BENCHMARKS['9u'];
  }
  return AGE_BENCHMARKS['14u'];
}

function num(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function computeAllStats(player, bench) {
  const ops = parseFloat(player.ops) || 0;
  const era = player.hasPitched ? parseFloat(player.era) || 999 : bench.eraMean;
  const hr = player.hr;
  const rbi = player.rbi;
  const sb = player.sb;
  const avg = parseFloat(player.avg) || 0;
  const s = {};
  s[1] = clamp(((ops - bench.opsMean) / bench.opsStd) * 15 + 55);
  s[5] = Math.round((rbi / (hr + 1)) * 4.5);
  s[7] = 88;
  s[9] = Math.round(((ops - avg) / 0.3) * 75);
  s[12] = Math.round((ops - avg) * 140);
  s[14] = 85;
  s[16] = clamp(((bench.eraMean - era) / bench.eraStd) * 15 + 55);
  s[26] = Math.round((s[1] + s[16]) / 2);
  s[28] = 87;
  s[29] = Math.round((s[1] + s[16] + 82) / 3);
  s[35] = Math.round(0.4 * s[1] + 0.3 * s[16] + 0.2 * 82 + 0.1 * 87);
  s[38] = 91;
  s[41] = 83;
  s[44] = Math.round((bench.eraMean - era) * 25);
  s[50] = Math.round(0.35 * s[1] + 0.3 * s[16] + 0.2 * s[7] + 0.1 * s[28] + 0.05 * s[14]);
  return s;
}

const rawNumFrom = (raw, key) => {
  if (!raw) return null;
  const v = raw[key];
  if (v == null || v === '') return null;
  const s = typeof v === 'string' ? v.trim().replace(/%$/, '') : String(v);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const asPct = (n) => (n == null ? null : n > 0 && n <= 1 ? n * 100 : n);
const pctStr = (n) => `${Math.round(clamp(n))}%`;
const f3 = (n) => n.toFixed(3).replace(/^0/, '');

// Mirrors the modal's computeAdvancedStats(). We only need the (pct, sortKey,
// display) triple per id; coach-insight strings aren't needed for verification.
function computeAdvancedStats(player, bench, core) {
  const ops = parseFloat(player.ops) || 0;
  const avg = parseFloat(player.avg) || 0;
  const hr = player.hr;
  const rbi = player.rbi;
  const sb = player.sb;
  const so = player.so;
  const ip = player.hasPitched ? parseFloat(player.ip) || 0 : 0;
  const era = player.hasPitched ? parseFloat(player.era) || 0 : 0;
  const whip = player.hasPitched ? parseFloat(player.whip) || 0 : 0;
  const isPitcher = player.hasPitched && ip > 0;
  const out = {};
  const dash = { pct: 0, display: '—' };

  // 1. xBA
  const xbaRaw = avg + (ops - bench.opsMean) * 0.08;
  const xba = clamp(xbaRaw, 0.15, 0.55);
  out[1] = { pct: clamp(((xba - 0.2) / 0.25) * 100), display: f3(xba), sortKey: xbaRaw };
  // 2. xSLG
  const xslgRaw = ops - avg + hr * 0.005;
  const xslg = clamp(xslgRaw, 0.2, 0.95);
  out[2] = { pct: clamp(((xslg - 0.25) / 0.5) * 100), display: f3(xslg), sortKey: xslgRaw };
  // 3. xwOBA
  const xwobaRaw = ops * 0.45 + 0.05;
  const xwoba = clamp(xwobaRaw, 0.2, 0.6);
  out[3] = { pct: clamp(((xwoba - 0.25) / 0.3) * 100), display: f3(xwoba), sortKey: xwobaRaw };
  // 4. Barrel
  const battedBalls = Math.max(rbi + sb + 15, 25);
  const barrelRaw = (hr / battedBalls) * 100;
  const barrel = clamp(barrelRaw, 0, 30);
  out[4] = { pct: clamp(barrel * 5), display: pctStr(barrel), sortKey: barrelRaw };
  // 5. Hard-Hit (proxy)
  const hardHitRaw = 28 + (core[12] ?? 50) * 0.35;
  const hardHit = clamp(hardHitRaw, 15, 70);
  out[5] = { pct: clamp((hardHit - 20) * 2.5), display: pctStr(hardHit), sortKey: hardHitRaw };
  // 6. Sweet Spot (proxy)
  const sweetRaw = avg * 100 + (xslg - avg) * 25;
  const sweet = clamp(sweetRaw, 15, 55);
  out[6] = { pct: clamp((sweet - 20) * 3), display: pctStr(sweet), sortKey: sweetRaw };
  // 7. Pull Power
  const pullPower = core[9] ?? 50;
  out[7] = { pct: clamp(pullPower), display: String(Math.round(pullPower)), sortKey: pullPower };
  // 8. Oppo
  const oppoRaw = avg * 200 - hr * 0.8;
  const oppo = clamp(oppoRaw, 0, 100);
  out[8] = { pct: oppo, display: String(Math.round(oppo)), sortKey: oppoRaw };
  // 9. Whiff (proxy)
  const whiffRaw = 28 - (core[7] ?? 88) * 0.15;
  const whiff = clamp(whiffRaw, 12, 38);
  out[9] = { pct: clamp((38 - whiff) * 4), display: pctStr(whiff), sortKey: -whiffRaw };
  // 10. Chase
  const chaseRaw = 32 - (ops - bench.opsMean) * 20;
  const chase = clamp(chaseRaw, 15, 45);
  out[10] = { pct: clamp((45 - chase) * 3.3), display: pctStr(chase), sortKey: -chaseRaw };
  // 11. Walk Rate Above Age (proxy)
  const bbAboveRaw = (ops - avg - 0.15) * 60;
  const bbAbove = clamp(bbAboveRaw, -8, 12);
  out[11] = { pct: clamp((bbAbove + 8) * 5), display: `${bbAbove >= 0 ? '+' : ''}${bbAbove.toFixed(1)}%`, sortKey: bbAboveRaw };
  // 12. K Rate Below Age (proxy)
  const kBelowRaw = (core[7] ?? 88) * 0.12 - 5;
  const kBelow = clamp(kBelowRaw, -8, 12);
  out[12] = { pct: clamp((kBelow + 8) * 5), display: `${kBelow >= 0 ? '+' : ''}${kBelow.toFixed(1)}%`, sortKey: kBelowRaw };
  // 13. Zone Contact (proxy)
  const zoneCtRaw = avg * 180 + 60;
  const zoneCt = clamp(zoneCtRaw, 60, 95);
  out[13] = { pct: clamp((zoneCt - 60) * 2.8), display: pctStr(zoneCt), sortKey: zoneCtRaw };
  // 14. Early-Count Aggression
  const earlyCount = core[5] ?? 50;
  out[14] = { pct: clamp(earlyCount), display: String(Math.round(earlyCount)), sortKey: earlyCount };
  // 15. Two-Strike Survival
  const twoStrikeRaw = avg * 0.8;
  const twoStrike = clamp(twoStrikeRaw, 0.1, 0.4);
  out[15] = { pct: clamp(((twoStrike - 0.15) / 0.2) * 100), display: f3(twoStrike), sortKey: twoStrikeRaw };

  // Pitching (16-25)
  if (isPitcher) {
    const kRate = so / Math.max(ip, 1);
    const xeraRaw = era * 0.6 + (5 - kRate) * 0.7 + whip * 0.4;
    out[16] = { pct: clamp(((bench.eraMean - clamp(xeraRaw, 1, 12)) / bench.eraStd) * 15 + 55), display: '', sortKey: -xeraRaw };
    out[17] = { pct: 50, display: '', sortKey: -(xeraRaw * 0.95 + 0.3) };
    out[18] = { pct: 50, display: '', sortKey: -(xeraRaw * 0.92 + 0.5) };
    out[19] = { pct: 50, display: '', sortKey: kRate * 8 - whip * 4 };
    out[20] = { pct: 50, display: '', sortKey: 22 + kRate * 1.5 - whip * 1.5 };
    out[21] = { pct: 50, display: '', sortKey: 100 + (kRate - 1) * 18 };
    out[22] = { pct: 50, display: '', sortKey: 100 + (1.3 - whip) * 40 };
    out[23] = { pct: 50, display: '', sortKey: 15 + kRate * 3.5 };
    out[24] = { pct: 50, display: '', sortKey: 55 + (1.3 - whip) * 18 };
    out[25] = { pct: 50, display: '', sortKey: 15 + kRate * 4 };
  } else {
    for (let id = 16; id <= 25; id++) out[id] = dash;
  }

  // Raw overrides
  const hhbRaw = asPct(rawNumFrom(player.battingRaw, 'HHB%'));
  if (hhbRaw != null) out[5] = { pct: clamp((hhbRaw - 20) * 2.5), display: pctStr(hhbRaw), sortKey: hhbRaw };
  const ldRaw = asPct(rawNumFrom(player.battingRaw, 'LD%'));
  if (ldRaw != null) out[6] = { pct: clamp((ldRaw - 12) * 5), display: pctStr(ldRaw), sortKey: ldRaw };
  const kPctRaw = asPct(rawNumFrom(player.battingRaw, 'K%'));
  if (kPctRaw != null) {
    out[9] = { pct: clamp((35 - kPctRaw) * 3.3, 0, 100), display: pctStr(kPctRaw), sortKey: -kPctRaw };
    out[12] = { pct: clamp((20 - kPctRaw + 8) * 5), display: `${(20 - kPctRaw) >= 0 ? '+' : ''}${(20 - kPctRaw).toFixed(1)}%`, sortKey: 20 - kPctRaw };
  }
  const bbPctRaw = asPct(rawNumFrom(player.battingRaw, 'BB%'));
  if (bbPctRaw != null) {
    const above = bbPctRaw - 8;
    out[11] = { pct: clamp((above + 8) * 5), display: `${above >= 0 ? '+' : ''}${above.toFixed(1)}%`, sortKey: bbPctRaw };
  }
  const cPctRaw = asPct(rawNumFrom(player.battingRaw, 'C%'));
  if (cPctRaw != null) out[13] = { pct: clamp((cPctRaw - 60) * 2.8), display: pctStr(cPctRaw), sortKey: cPctRaw };
  const qabRaw = asPct(rawNumFrom(player.battingRaw, 'QAB%'));
  if (qabRaw != null) out[14] = { pct: clamp((qabRaw - 30) * 2.5), display: pctStr(qabRaw), sortKey: qabRaw };

  return out;
}

const advancedLib = [
  { id: 1, name: 'xBA' }, { id: 2, name: 'xSLG' }, { id: 3, name: 'xwOBA' },
  { id: 4, name: 'Barrel' }, { id: 5, name: 'Hard-Hit %' }, { id: 6, name: 'Sweet Spot' },
  { id: 7, name: 'Pull Power' }, { id: 8, name: 'Oppo' }, { id: 9, name: 'Whiff' },
  { id: 10, name: 'Chase' }, { id: 11, name: 'Walk Above Age' }, { id: 12, name: 'K Below Age' },
  { id: 13, name: 'Zone Contact' }, { id: 14, name: 'Early-Count' }, { id: 15, name: 'Two-Strike' },
  { id: 16, name: 'xERA', cat: 'pitching' }, { id: 17, name: 'xFIP', cat: 'pitching' },
  { id: 18, name: 'SIERA', cat: 'pitching' }, { id: 19, name: 'K-BB%', cat: 'pitching' },
  { id: 20, name: 'CSW%', cat: 'pitching' }, { id: 21, name: 'Stuff+', cat: 'pitching' },
  { id: 22, name: 'Command+', cat: 'pitching' }, { id: 23, name: 'Whiff%', cat: 'pitching' },
  { id: 24, name: '1st-Strike%', cat: 'pitching' }, { id: 25, name: 'Putaway', cat: 'pitching' },
];

function topAdvancedInsights(adv, n = 8) {
  return [...advancedLib]
    .filter((i) => adv[i.id] && adv[i.id].display !== '—')
    .sort((a, b) => adv[b.id].pct - adv[a.id].pct)
    .slice(0, n);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: teamRows } = await supabase
  .from('gc_teams')
  .select('id, gc_id, name, sport, level')
  .in('gc_id', TRACKED);

const teams = teamRows ?? [];

const teamIds = teams.map((t) => t.id);
const [{ data: playerRows }, { data: battingRows }, { data: pitchingRows }] =
  await Promise.all([
    supabase
      .from('gc_players')
      .select('id, team_id, first_name, last_name, jersey_number')
      .in('team_id', teamIds),
    supabase
      .from('gc_batting_stats')
      .select('player_id, is_season_total, raw')
      .eq('is_season_total', true),
    supabase
      .from('gc_pitching_stats')
      .select('player_id, is_season_total, raw')
      .eq('is_season_total', true),
  ]);

const battingByPlayer = new Map();
for (const r of battingRows ?? []) {
  if (r.is_season_total && r.raw) battingByPlayer.set(r.player_id, r.raw);
}
const pitchingByPlayer = new Map();
for (const r of pitchingRows ?? []) {
  if (r.is_season_total && r.raw) pitchingByPlayer.set(r.player_id, r.raw);
}

const playersByTeam = new Map();
for (const p of playerRows ?? []) {
  const list = playersByTeam.get(p.team_id) ?? [];
  list.push(p);
  playersByTeam.set(p.team_id, list);
}

let overallTiedCount = 0;
let overallPlayerCount = 0;

for (const t of teams) {
  const level = normalizeLevel(t.level, t.name);
  const bench = benchmarksFor(level);
  const players = playersByTeam.get(t.id) ?? [];

  // Build LineupPlayer-like objects.
  const roster = players.map((p) => {
    const bat = battingByPlayer.get(p.id) ?? null;
    const pit = pitchingByPlayer.get(p.id) ?? null;
    const ab = num(bat?.AB) ?? 0;
    const h = num(bat?.H) ?? 0;
    const avg = num(bat?.AVG) ?? (ab > 0 ? h / ab : 0);
    const ops = num(bat?.OPS) ?? 0;
    const era = num(pit?.ERA);
    const ip = num(pit?.IP) ?? 0;
    return {
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' '),
      number: p.jersey_number ?? '',
      avg: avg.toFixed(3),
      ops: ops.toFixed(3),
      hr: Math.round(num(bat?.HR) ?? 0),
      rbi: Math.round(num(bat?.RBI) ?? 0),
      sb: Math.round(num(bat?.SB) ?? 0),
      era: era != null ? era.toFixed(2) : '—',
      ip: ip ? ip.toFixed(1) : '—',
      so: Math.round(num(pit?.SO) ?? 0),
      whip: num(pit?.WHIP) != null ? num(pit?.WHIP).toFixed(2) : '—',
      hasPitched: ip > 0,
      battingRaw: bat,
      pitchingRaw: pit,
    };
  });

  // Precompute everyone's advanced.
  const allAdv = roster.map((p) => ({
    p,
    core: computeAllStats(p, bench),
    adv: computeAdvancedStats(p, bench, computeAllStats(p, bench)),
  }));

  console.log('\n' + '='.repeat(72));
  console.log(`TEAM: ${t.name}  (level: ${level}, players: ${roster.length})`);
  console.log('='.repeat(72));

  for (const { p, adv } of allAdv) {
    const top8 = topAdvancedInsights(adv, 8);
    const ranks = [];
    for (const insight of top8) {
      const everyScored = allAdv
        .map((e) => ({
          id: e.p.id,
          pct: e.adv[insight.id]?.pct ?? 0,
          key: e.adv[insight.id]?.sortKey ?? e.adv[insight.id]?.pct ?? 0,
          display: e.adv[insight.id]?.display ?? '—',
        }))
        .filter((s) => s.display !== '—');
      everyScored.sort((a, b) => b.key - a.key || a.id.localeCompare(b.id));
      const idx = everyScored.findIndex((s) => s.id === p.id);
      if (idx >= 0) ranks.push({ name: insight.name, rank: idx + 1, total: everyScored.length });
    }
    const uniqueRanks = new Set(ranks.map((r) => r.rank));
    const allSame = ranks.length > 1 && uniqueRanks.size === 1;
    const flag = allSame ? '❌ ALL SAME' : `✓ ${uniqueRanks.size} unique ranks across ${ranks.length} cards`;
    overallPlayerCount++;
    if (allSame) overallTiedCount++;
    console.log(`  ${p.name.padEnd(28)} ${flag}`);
    console.log(`    top-8: ${ranks.map((r) => `${r.name}=#${r.rank}/${r.total}`).join(', ')}`);
  }
}

console.log('\n' + '='.repeat(72));
console.log(`SUMMARY: ${overallTiedCount}/${overallPlayerCount} players had identical ranks across all their top-8 cards.`);
console.log('='.repeat(72));
