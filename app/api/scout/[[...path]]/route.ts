// College Scout API — mounted at /api/scout/*
// Persistence: Supabase scout_* tables (LevelUp Wrestling project).
// All rows are camelCase in the API contract and snake_case in the database;
// the conversion happens in lib/scout-db.ts.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, isConfigured } from "@/lib/scout-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────
// Validation schemas (zod 4 — uses .nullable().optional() in that order)
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
    if (!isConfigured()) {
      return jsonRes(503, { error: "Database not configured" });
    }
    const { path = [] } = await ctx.params;
    const method = req.method.toUpperCase();
    const body = ["POST", "PATCH", "PUT"].includes(method) ? await readBody(req) : {};
    let m: Record<string, string> | null;

    // Athletes
    if (method === "GET" && (m = match(path, "athletes")))
      return jsonRes(200, await db.listAthletes());
    if (method === "POST" && (m = match(path, "athletes"))) {
      const r = safe(athleteCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, await db.createAthlete(r.data));
    }
    if (method === "GET" && (m = match(path, "athletes/:id"))) {
      const a = await db.getAthlete(Number(m.id));
      if (!a) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, a);
    }
    if (method === "PATCH" && (m = match(path, "athletes/:id"))) {
      const r = safe(athletePatch, body); if (!r.ok) return r.res;
      const u = await db.updateAthlete(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }

    // Plays
    if (method === "GET" && (m = match(path, "athletes/:id/plays")))
      return jsonRes(200, await db.listPlays(Number(m.id)));
    if (method === "POST" && (m = match(path, "plays"))) {
      const r = safe(playCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, await db.createPlay(r.data));
    }
    if (method === "PATCH" && (m = match(path, "plays/:id"))) {
      const r = safe(playPatch, body); if (!r.ok) return r.res;
      const u = await db.updatePlay(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }
    if (method === "DELETE" && (m = match(path, "plays/:id"))) {
      await db.deletePlay(Number(m.id));
      return jsonRes(200, { ok: true });
    }

    // Reports
    if (method === "GET" && (m = match(path, "athletes/:id/reports")))
      return jsonRes(200, await db.listReports(Number(m.id)));
    if (method === "POST" && (m = match(path, "reports"))) {
      const r = safe(reportCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, await db.createReport(r.data));
    }

    // Projections
    if (method === "GET" && (m = match(path, "athletes/:id/projections")))
      return jsonRes(200, await db.listProjections(Number(m.id)));
    if (method === "POST" && (m = match(path, "projections"))) {
      const r = safe(projectionCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, await db.createProjection(r.data));
    }

    // Dev items
    if (method === "GET" && (m = match(path, "athletes/:id/dev-items")))
      return jsonRes(200, await db.listDevItems(Number(m.id)));
    if (method === "POST" && (m = match(path, "dev-items"))) {
      const r = safe(devCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, await db.createDevItem(r.data));
    }
    if (method === "PATCH" && (m = match(path, "dev-items/:id"))) {
      const r = safe(devPatch, body); if (!r.ok) return r.res;
      const u = await db.updateDevItem(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }
    if (method === "DELETE" && (m = match(path, "dev-items/:id"))) {
      await db.deleteDevItem(Number(m.id));
      return jsonRes(200, { ok: true });
    }

    // Season stats
    if (method === "GET" && (m = match(path, "athletes/:id/stats")))
      return jsonRes(200, await db.listStats(Number(m.id)));
    if (method === "POST" && (m = match(path, "stats"))) {
      const r = safe(statsCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, await db.createStats(r.data));
    }
    if (method === "PATCH" && (m = match(path, "stats/:id"))) {
      const r = safe(statsPatch, body); if (!r.ok) return r.res;
      const u = await db.updateStats(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }
    if (method === "DELETE" && (m = match(path, "stats/:id"))) {
      await db.deleteStats(Number(m.id));
      return jsonRes(200, { ok: true });
    }

    // Video analyses (swing / pitching). Filter by ?kind=swing|pitching.
    if (method === "GET" && (m = match(path, "athletes/:id/analyses"))) {
      const kind = req.nextUrl.searchParams.get("kind") || undefined;
      return jsonRes(200, await db.listVideoAnalyses(Number(m.id), kind));
    }
    if (method === "POST" && (m = match(path, "analyses"))) {
      const r = safe(videoAnalysisCreate, body); if (!r.ok) return r.res;
      return jsonRes(200, await db.createVideoAnalysis(r.data));
    }
    if (method === "PATCH" && (m = match(path, "analyses/:id"))) {
      const r = safe(videoAnalysisPatch, body); if (!r.ok) return r.res;
      const u = await db.updateVideoAnalysis(Number(m.id), r.data);
      if (!u) return jsonRes(404, { error: "Not found" });
      return jsonRes(200, u);
    }
    if (method === "DELETE" && (m = match(path, "analyses/:id"))) {
      await db.deleteVideoAnalysis(Number(m.id));
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
