// College Scout API — mounted at /api/scout/*
// In-memory storage seeded with Carter Burhans + 29 plays + baseline projection.
// Mutations persist for the life of a warm function instance only.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
type Athlete = {
  id: number; name: string; classYear: number; gradeLevel: string;
  primarySport: string; primaryPosition: string; secondarySports: string | null;
  city: string | null; state: string | null; highSchool: string | null; travelOrg: string | null;
  heightIn: number | null; weightLb: number | null;
  battingHand: string | null; throwingHand: string | null;
  fortyYd: number | null; sixtyYd: number | null;
  exitVeloMph: number | null; fbVeloMph: number | null;
  popTime: number | null; inf60: number | null; gpa: number | null;
  contactEmail: string | null; contactPhone: string | null;
  bio: string | null; avatarUrl: string | null;
  createdAt: number;
};
type Play = {
  id: number; athleteId: number; playNumber: number; sport: string;
  timestamp: string; durationSec: number | null; archetype: string | null;
  result: string | null; notes: string | null; videoUrl: string | null; thumbUrl: string | null;
  createdAt: number;
};
type ScoutingReport = {
  id: number; athleteId: number; playId: number | null; source: string; reportDate: number;
  footwork: number | null; hipRotation: number | null; releaseQ: number | null;
  eyesProgression: number | null; decisionMaking: number | null; accuracy: number | null;
  armStrength: number | null; pocketMobility: number | null;
  ceilingTier: string | null; archetype: string | null; rawText: string | null;
  highRoiFix: string | null; createdAt: number;
};
type Projection = {
  id: number; athleteId: number; runDate: number; inputs: string;
  pgGrade: number; composite: number;
  oddsD1P4: number | null; oddsD1MM: number | null; oddsD2: number | null;
  oddsD3: number | null; oddsNAIA: number | null; oddsJUCO: number | null;
  notes: string | null;
};
type DevItem = {
  id: number; athleteId: number; category: string; drill: string;
  frequency: string; measure: string; status: string; createdAt: number;
};
type SeasonStats = {
  id: number; athleteId: number; season: string; level: string | null;
  games: number | null; ab: number | null; hits: number | null;
  doubles: number | null; triples: number | null; hr: number | null;
  rbi: number | null; runs: number | null; bb: number | null; so: number | null; sb: number | null;
  avg: number | null; obp: number | null; slg: number | null; ops: number | null;
  ip: number | null; er: number | null; pitchingK: number | null; pitchingBB: number | null;
  era: number | null; whip: number | null;
  fldPct: number | null; errors: number | null;
  notes: string | null; createdAt: number;
};
type VideoAnalysis = {
  id: number; athleteId: number; kind: string; title: string;
  recordedDate: number | null; videoUrl: string | null;
  s1: number | null; s2: number | null; s3: number | null; s4: number | null;
  s5: number | null; s6: number | null; s7: number | null; s8: number | null;
  composite: number | null; highRoiFix: string | null; notes: string | null;
  createdAt: number;
};

// ─────────────────────────────────────────────────────────────────────
// Validation schemas (zod 4 compatible — uses .optional() / .nullable())
// ─────────────────────────────────────────────────────────────────────
const athletePatch = z.object({
  name: z.string().optional(),
  classYear: z.number().optional(),
  gradeLevel: z.string().optional(),
  primarySport: z.string().optional(),
  primaryPosition: z.string().optional(),
  secondarySports: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  highSchool: z.string().nullable().optional(),
  travelOrg: z.string().nullable().optional(),
  heightIn: z.number().nullable().optional(),
  weightLb: z.number().nullable().optional(),
  battingHand: z.string().nullable().optional(),
  throwingHand: z.string().nullable().optional(),
  fortyYd: z.number().nullable().optional(),
  sixtyYd: z.number().nullable().optional(),
  exitVeloMph: z.number().nullable().optional(),
  fbVeloMph: z.number().nullable().optional(),
  popTime: z.number().nullable().optional(),
  inf60: z.number().nullable().optional(),
  gpa: z.number().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});
const athleteCreate = athletePatch.extend({
  name: z.string(),
  classYear: z.number(),
  gradeLevel: z.string(),
  primarySport: z.string(),
  primaryPosition: z.string(),
});

const playPatch = z.object({
  athleteId: z.number().optional(),
  playNumber: z.number().optional(),
  sport: z.string().optional(),
  timestamp: z.string().optional(),
  durationSec: z.number().nullable().optional(),
  archetype: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  thumbUrl: z.string().nullable().optional(),
});
const playCreate = playPatch.extend({
  athleteId: z.number(),
  playNumber: z.number(),
  sport: z.string(),
  timestamp: z.string(),
});

const reportCreate = z.object({
  athleteId: z.number(),
  playId: z.number().nullable().optional(),
  source: z.string(),
  reportDate: z.number(),
  footwork: z.number().nullable().optional(),
  hipRotation: z.number().nullable().optional(),
  releaseQ: z.number().nullable().optional(),
  eyesProgression: z.number().nullable().optional(),
  decisionMaking: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  armStrength: z.number().nullable().optional(),
  pocketMobility: z.number().nullable().optional(),
  ceilingTier: z.string().nullable().optional(),
  archetype: z.string().nullable().optional(),
  rawText: z.string().nullable().optional(),
  highRoiFix: z.string().nullable().optional(),
});

const projectionCreate = z.object({
  athleteId: z.number(),
  runDate: z.number(),
  inputs: z.string(),
  pgGrade: z.number(),
  composite: z.number(),
  oddsD1P4: z.number().nullable().optional(),
  oddsD1MM: z.number().nullable().optional(),
  oddsD2: z.number().nullable().optional(),
  oddsD3: z.number().nullable().optional(),
  oddsNAIA: z.number().nullable().optional(),
  oddsJUCO: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const devPatch = z.object({
  athleteId: z.number().optional(),
  category: z.string().optional(),
  drill: z.string().optional(),
  frequency: z.string().optional(),
  measure: z.string().optional(),
  status: z.string().optional(),
});
const devCreate = devPatch.extend({
  athleteId: z.number(),
  category: z.string(),
  drill: z.string(),
  frequency: z.string(),
  measure: z.string(),
});

const statsPatch = z.object({
  athleteId: z.number().optional(),
  season: z.string().optional(),
  level: z.string().nullable().optional(),
  games: z.number().nullable().optional(),
  ab: z.number().nullable().optional(),
  hits: z.number().nullable().optional(),
  doubles: z.number().nullable().optional(),
  triples: z.number().nullable().optional(),
  hr: z.number().nullable().optional(),
  rbi: z.number().nullable().optional(),
  runs: z.number().nullable().optional(),
  bb: z.number().nullable().optional(),
  so: z.number().nullable().optional(),
  sb: z.number().nullable().optional(),
  avg: z.number().nullable().optional(),
  obp: z.number().nullable().optional(),
  slg: z.number().nullable().optional(),
  ops: z.number().nullable().optional(),
  ip: z.number().nullable().optional(),
  er: z.number().nullable().optional(),
  pitchingK: z.number().nullable().optional(),
  pitchingBB: z.number().nullable().optional(),
  era: z.number().nullable().optional(),
  whip: z.number().nullable().optional(),
  fldPct: z.number().nullable().optional(),
  errors: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});
const statsCreate = statsPatch.extend({
  athleteId: z.number(),
  season: z.string(),
});

const videoAnalysisPatch = z.object({
  athleteId: z.number().optional(),
  kind: z.string().optional(),
  title: z.string().optional(),
  recordedDate: z.number().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  s1: z.number().nullable().optional(),
  s2: z.number().nullable().optional(),
  s3: z.number().nullable().optional(),
  s4: z.number().nullable().optional(),
  s5: z.number().nullable().optional(),
  s6: z.number().nullable().optional(),
  s7: z.number().nullable().optional(),
  s8: z.number().nullable().optional(),
  composite: z.number().nullable().optional(),
  highRoiFix: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
const videoAnalysisCreate = videoAnalysisPatch.extend({
  athleteId: z.number(),
  kind: z.string(),
  title: z.string(),
});

// ─────────────────────────────────────────────────────────────────────
// In-memory store (per warm instance, persisted on globalThis)
// ─────────────────────────────────────────────────────────────────────
const G = globalThis as any;
if (!G.__cs_scout_store) {
  G.__cs_scout_store = {
    athletes: [] as Athlete[],
    plays: [] as Play[],
    reports: [] as ScoutingReport[],
    projections: [] as Projection[],
    devItems: [] as DevItem[],
    seasonStats: [] as SeasonStats[],
    videoAnalyses: [] as VideoAnalysis[],
    ids: { a: 0, p: 0, r: 0, j: 0, d: 0, s: 0, v: 0 },
    seeded: false,
  };
}
const S = G.__cs_scout_store;
const now = () => Date.now();

function seed() {
  if (S.seeded) return;
  const carter: Athlete = {
    id: ++S.ids.a,
    name: "Carter Burhans",
    classYear: 2030,
    gradeLevel: "8th",
    primarySport: "Baseball",
    primaryPosition: "SS",
    secondarySports: JSON.stringify(["Football QB"]),
    city: "Tinley Park", state: "IL", highSchool: "TBD", travelOrg: "AA/AAA Travel",
    heightIn: 70, weightLb: 145, battingHand: "R", throwingHand: "R",
    fortyYd: null, sixtyYd: 7.4, exitVeloMph: 82, fbVeloMph: null,
    popTime: null, inf60: 75, gpa: 3.9,
    contactEmail: "cbur22@gmail.com", contactPhone: null,
    bio: "Multi-sport athlete (Baseball / Football QB). .500+ batting average across 5 years AA/AAA travel. Team HR leader. Home run vs. top-10 nationally ranked pitcher. Class of 2030.",
    avatarUrl: null,
    createdAt: now(),
  };
  S.athletes.push(carter);

  const TIMESTAMPS = [
    "00:09.47","00:17.80","00:24.87","00:37.53","00:45.27","00:50.97","01:01.20",
    "01:08.43","01:14.57","01:31.53","01:41.90","01:51.17","01:57.00","02:03.80",
    "02:09.37","02:22.70","02:36.47","02:41.77","02:54.03","03:00.27","03:09.57",
    "03:17.33","03:23.50","03:35.33","03:49.90","03:55.80","04:01.53","04:06.80","04:12.90",
  ];
  const ARCHETYPES = [
    "Pre-snap read","RPO read","Quick game","Rollout","Play-action","Deep ball","Designed run",
    "Scramble","Off-platform","Bootleg","Deep ball","Quick game","RPO read","Pocket throw",
    "Scramble","Play-action","Deep ball","Rollout","Quick game","Designed run","RPO read",
    "Pocket throw","Off-platform","Scramble","Deep ball","Bootleg","Pocket throw","RPO read","Play-action",
  ];
  TIMESTAMPS.forEach((ts, i) => {
    S.plays.push({
      id: ++S.ids.p,
      athleteId: carter.id,
      playNumber: i + 1,
      sport: "Football",
      timestamp: ts,
      durationSec: 7,
      archetype: ARCHETYPES[i],
      result: null, notes: null, videoUrl: null, thumbUrl: null,
      createdAt: now(),
    } as Play);
  });

  S.projections.push({
    id: ++S.ids.j,
    athleteId: carter.id,
    runDate: now(),
    inputs: JSON.stringify({
      battingAvg: 0.512, teamHRLeader: true, hrVsTop10Pitcher: true,
      sixtyYd: 7.4, exitVelo: 82, heightIn: 70, weightLb: 145, gpa: 3.9,
      multiSport: true,
    }),
    pgGrade: 7.4,
    composite: 71,
    oddsD1P4: 0.18, oddsD1MM: 0.42, oddsD2: 0.71, oddsD3: 0.94,
    oddsNAIA: 0.97, oddsJUCO: 0.99,
    notes: "Baseline projection seeded from Diamond Projection v1.",
  } as Projection);

  // Seed a baseline 2025 batting line so the Stats page has content out of the box.
  S.seasonStats.push({
    id: ++S.ids.s,
    athleteId: carter.id,
    season: "2025 AAA Travel",
    level: "AAA Travel",
    games: 38, ab: 122, hits: 63, doubles: 14, triples: 2, hr: 6,
    rbi: 48, runs: 41, bb: 22, so: 18, sb: 14,
    avg: 0.516, obp: 0.606, slg: 0.811, ops: 1.417,
    ip: null, er: null, pitchingK: null, pitchingBB: null, era: null, whip: null,
    fldPct: 0.965, errors: 5,
    notes: "Team HR leader. HR vs. top-10 nationally ranked pitcher.",
    createdAt: now(),
  } as SeasonStats);

  S.seeded = true;
}
seed();

// ─────────────────────────────────────────────────────────────────────
// Storage operations
// ─────────────────────────────────────────────────────────────────────
const store = {
  listAthletes: () => [...S.athletes],
  getAthlete: (id: number) => S.athletes.find((a: Athlete) => a.id === id),
  createAthlete: (a: any): Athlete => {
    const row: Athlete = {
      ...a, secondarySports: a.secondarySports ?? "[]",
      id: ++S.ids.a, createdAt: now(),
    };
    S.athletes.push(row);
    return row;
  },
  updateAthlete: (id: number, a: any) => {
    const i = S.athletes.findIndex((x: Athlete) => x.id === id);
    if (i < 0) return undefined;
    S.athletes[i] = { ...S.athletes[i], ...a };
    return S.athletes[i];
  },
  listPlays: (athleteId: number) => S.plays.filter((p: Play) => p.athleteId === athleteId),
  createPlay: (p: any): Play => {
    const row: Play = { ...p, id: ++S.ids.p, createdAt: now() };
    S.plays.push(row); return row;
  },
  updatePlay: (id: number, p: any) => {
    const i = S.plays.findIndex((x: Play) => x.id === id);
    if (i < 0) return undefined;
    S.plays[i] = { ...S.plays[i], ...p }; return S.plays[i];
  },
  deletePlay: (id: number) => { S.plays = S.plays.filter((x: Play) => x.id !== id); },
  listReports: (athleteId: number) =>
    S.reports.filter((r: ScoutingReport) => r.athleteId === athleteId)
      .sort((a: ScoutingReport, b: ScoutingReport) => (b.reportDate || 0) - (a.reportDate || 0)),
  createReport: (r: any): ScoutingReport => {
    const row: ScoutingReport = { ...r, id: ++S.ids.r, createdAt: now() };
    S.reports.push(row); return row;
  },
  listProjections: (athleteId: number) =>
    S.projections.filter((p: Projection) => p.athleteId === athleteId)
      .sort((a: Projection, b: Projection) => (b.runDate || 0) - (a.runDate || 0)),
  createProjection: (p: any): Projection => {
    const row: Projection = { ...p, id: ++S.ids.j };
    S.projections.push(row); return row;
  },
  listDevItems: (athleteId: number) => S.devItems.filter((d: DevItem) => d.athleteId === athleteId),
  createDevItem: (d: any): DevItem => {
    const row: DevItem = { status: "Active", ...d, id: ++S.ids.d, createdAt: now() };
    S.devItems.push(row); return row;
  },
  updateDevItem: (id: number, d: any) => {
    const i = S.devItems.findIndex((x: DevItem) => x.id === id);
    if (i < 0) return undefined;
    S.devItems[i] = { ...S.devItems[i], ...d }; return S.devItems[i];
  },
  deleteDevItem: (id: number) => { S.devItems = S.devItems.filter((x: DevItem) => x.id !== id); },
  listStats: (athleteId: number) =>
    S.seasonStats.filter((s: SeasonStats) => s.athleteId === athleteId)
      .sort((a: SeasonStats, b: SeasonStats) => (b.createdAt || 0) - (a.createdAt || 0)),
  createStats: (s: any): SeasonStats => {
    const row: SeasonStats = { ...s, id: ++S.ids.s, createdAt: now() };
    S.seasonStats.push(row); return row;
  },
  updateStats: (id: number, s: any) => {
    const i = S.seasonStats.findIndex((x: SeasonStats) => x.id === id);
    if (i < 0) return undefined;
    S.seasonStats[i] = { ...S.seasonStats[i], ...s }; return S.seasonStats[i];
  },
  deleteStats: (id: number) => { S.seasonStats = S.seasonStats.filter((x: SeasonStats) => x.id !== id); },
  listVideoAnalyses: (athleteId: number, kind?: string) =>
    S.videoAnalyses.filter((v: VideoAnalysis) =>
      v.athleteId === athleteId && (!kind || v.kind === kind),
    ).sort((a: VideoAnalysis, b: VideoAnalysis) => (b.createdAt || 0) - (a.createdAt || 0)),
  createVideoAnalysis: (v: any): VideoAnalysis => {
    const row: VideoAnalysis = { ...v, id: ++S.ids.v, createdAt: now() };
    S.videoAnalyses.push(row); return row;
  },
  updateVideoAnalysis: (id: number, v: any) => {
    const i = S.videoAnalyses.findIndex((x: VideoAnalysis) => x.id === id);
    if (i < 0) return undefined;
    S.videoAnalyses[i] = { ...S.videoAnalyses[i], ...v }; return S.videoAnalyses[i];
  },
  deleteVideoAnalysis: (id: number) => { S.videoAnalyses = S.videoAnalyses.filter((x: VideoAnalysis) => x.id !== id); },
};

// ─────────────────────────────────────────────────────────────────────
// Routing helpers
// ─────────────────────────────────────────────────────────────────────
function jsonRes(code: number, body: any) {
  return NextResponse.json(body, { status: code });
}

function match(parts: string[], pattern: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  if (p.length !== parts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = parts[i];
    else if (p[i] !== parts[i]) return null;
  }
  return params;
}

async function readBody(req: NextRequest): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

function safe<T>(schema: z.ZodType<T>, body: any): { ok: true; data: T } | { ok: false; res: NextResponse } {
  const r = schema.safeParse(body);
  if (!r.success) return { ok: false, res: jsonRes(400, { error: r.error.flatten() }) };
  return { ok: true, data: r.data as T };
}

// ─────────────────────────────────────────────────────────────────────
// Route resolver
// ─────────────────────────────────────────────────────────────────────
async function route(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path = [] } = await ctx.params;
    const method = req.method.toUpperCase();
    const body = ["POST", "PATCH", "PUT"].includes(method) ? await readBody(req) : {};
    let m: Record<string, string> | null;

    // Athletes
    if (method === "GET" && (m = match(path, "athletes")))
      return jsonRes(200, store.listAthletes());
    if (method === "POST" && (m = match(path, "athletes"))) {
      const r = safe(athleteCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, store.createAthlete(r.data));
    }
    if (method === "GET" && (m = match(path, "athletes/:id"))) {
      const a = store.getAthlete(Number(m.id));
      if (!a) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, a);
    }
    if (method === "PATCH" && (m = match(path, "athletes/:id"))) {
      const r = safe(athletePatch, body); if (!r.ok) return r.res;
      const u = store.updateAthlete(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }

    // Plays
    if (method === "GET" && (m = match(path, "athletes/:id/plays")))
      return jsonRes(200, store.listPlays(Number(m.id)));
    if (method === "POST" && (m = match(path, "plays"))) {
      const r = safe(playCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, store.createPlay(r.data));
    }
    if (method === "PATCH" && (m = match(path, "plays/:id"))) {
      const r = safe(playPatch, body); if (!r.ok) return r.res;
      const u = store.updatePlay(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }
    if (method === "DELETE" && (m = match(path, "plays/:id"))) {
      store.deletePlay(Number(m.id));
      return jsonRes(200, { ok: true });
    }

    // Reports
    if (method === "GET" && (m = match(path, "athletes/:id/reports")))
      return jsonRes(200, store.listReports(Number(m.id)));
    if (method === "POST" && (m = match(path, "reports"))) {
      const r = safe(reportCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, store.createReport(r.data));
    }

    // Projections
    if (method === "GET" && (m = match(path, "athletes/:id/projections")))
      return jsonRes(200, store.listProjections(Number(m.id)));
    if (method === "POST" && (m = match(path, "projections"))) {
      const r = safe(projectionCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, store.createProjection(r.data));
    }

    // Dev items
    if (method === "GET" && (m = match(path, "athletes/:id/dev-items")))
      return jsonRes(200, store.listDevItems(Number(m.id)));
    if (method === "POST" && (m = match(path, "dev-items"))) {
      const r = safe(devCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, store.createDevItem(r.data));
    }
    if (method === "PATCH" && (m = match(path, "dev-items/:id"))) {
      const r = safe(devPatch, body); if (!r.ok) return r.res;
      const u = store.updateDevItem(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }
    if (method === "DELETE" && (m = match(path, "dev-items/:id"))) {
      store.deleteDevItem(Number(m.id));
      return jsonRes(200, { ok: true });
    }

    // Season stats
    if (method === "GET" && (m = match(path, "athletes/:id/stats")))
      return jsonRes(200, store.listStats(Number(m.id)));
    if (method === "POST" && (m = match(path, "stats"))) {
      const r = safe(statsCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, store.createStats(r.data));
    }
    if (method === "PATCH" && (m = match(path, "stats/:id"))) {
      const r = safe(statsPatch, body); if (!r.ok) return r.res;
      const u = store.updateStats(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }
    if (method === "DELETE" && (m = match(path, "stats/:id"))) {
      store.deleteStats(Number(m.id));
      return jsonRes(200, { ok: true });
    }

    // Video analyses (swing / pitching). Filter by ?kind=swing|pitching.
    if (method === "GET" && (m = match(path, "athletes/:id/analyses"))) {
      const kind = req.nextUrl.searchParams.get("kind") || undefined;
      return jsonRes(200, store.listVideoAnalyses(Number(m.id), kind));
    }
    if (method === "POST" && (m = match(path, "analyses"))) {
      const r = safe(videoAnalysisCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, store.createVideoAnalysis(r.data));
    }
    if (method === "PATCH" && (m = match(path, "analyses/:id"))) {
      const r = safe(videoAnalysisPatch, body); if (!r.ok) return r.res;
      const u = store.updateVideoAnalysis(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }
    if (method === "DELETE" && (m = match(path, "analyses/:id"))) {
      store.deleteVideoAnalysis(Number(m.id));
      return jsonRes(200, { ok: true });
    }

    return jsonRes(404, { error: "Not found", path: path.join("/"), method });
  } catch (err: any) {
    console.error("Scout API error:", err?.stack || err);
    return jsonRes(500, { error: "Internal Server Error", message: err?.message });
  }
}

export const GET = route;
export const POST = route;
export const PATCH = route;
export const DELETE = route;
export const PUT = route;
