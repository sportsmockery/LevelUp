// Scout DB layer — Supabase-backed storage for the College Scout app.
// All scout_* tables have RLS enabled with no policies, so this module
// must run with the service role key (server-side only).

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// ─────────────────────────────────────────────────────────────────────
// camelCase ↔ snake_case helpers
// ─────────────────────────────────────────────────────────────────────
const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

// Column rename overrides where the camelCase ↔ snake_case heuristic
// doesn't produce the column we want (e.g. `inf60` → `inf_60`).
const COL_OVERRIDES_TO_DB: Record<string, string> = {
  inf60: "inf_60",
  fortyYd: "forty_yd",
  sixtyYd: "sixty_yd",
};
const COL_OVERRIDES_FROM_DB: Record<string, string> = {
  inf_60: "inf60",
  forty_yd: "fortyYd",
  sixty_yd: "sixtyYd",
};

function rowToDb(row: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    const dbKey = COL_OVERRIDES_TO_DB[k] ?? toSnake(k);
    out[dbKey] = v;
  }
  return out;
}
function rowFromDb(row: any): any {
  if (!row) return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    const apiKey = COL_OVERRIDES_FROM_DB[k] ?? toCamel(k);
    out[apiKey] = v;
  }
  // Normalize created_at to epoch ms number, matching the original in-memory shape.
  if (out.createdAt && typeof out.createdAt === "string") {
    out.createdAt = new Date(out.createdAt).getTime();
  }
  return out;
}
function rowsFromDb(rows: any[] | null): any[] {
  return (rows || []).map(rowFromDb);
}

// ─────────────────────────────────────────────────────────────────────
// Generic helpers
// ─────────────────────────────────────────────────────────────────────
async function listBy(table: string, athleteId: number, opts?: { orderBy?: string; ascending?: boolean }) {
  const orderBy = opts?.orderBy ?? "created_at";
  const ascending = opts?.ascending ?? false;
  const { data, error } = await client()
    .from(table)
    .select("*")
    .eq("athlete_id", athleteId)
    .order(orderBy, { ascending });
  if (error) throw error;
  return rowsFromDb(data);
}

async function insertRow(table: string, row: any) {
  const { data, error } = await client().from(table).insert(rowToDb(row)).select().single();
  if (error) throw error;
  return rowFromDb(data);
}

async function updateRow(table: string, id: number, patch: any) {
  const { data, error } = await client()
    .from(table)
    .update(rowToDb(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return undefined; // No rows found
    throw error;
  }
  return rowFromDb(data);
}

async function deleteRow(table: string, id: number) {
  const { error } = await client().from(table).delete().eq("id", id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────
// Public DB ops (drop-in replacement for the in-memory store)
// ─────────────────────────────────────────────────────────────────────
export const db = {
  async listAthletes() {
    const { data, error } = await client()
      .from("scout_athletes")
      .select("*")
      .order("id", { ascending: true });
    if (error) throw error;
    return rowsFromDb(data);
  },
  async getAthlete(id: number) {
    const { data, error } = await client().from("scout_athletes").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return undefined;
      throw error;
    }
    return rowFromDb(data);
  },
  async createAthlete(a: any) {
    return insertRow("scout_athletes", { ...a, secondarySports: a.secondarySports ?? "[]" });
  },
  async updateAthlete(id: number, a: any) {
    return updateRow("scout_athletes", id, a);
  },

  listPlays: (athleteId: number) =>
    listBy("scout_plays", athleteId, { orderBy: "play_number", ascending: true }),
  createPlay: (p: any) => insertRow("scout_plays", p),
  updatePlay: (id: number, p: any) => updateRow("scout_plays", id, p),
  deletePlay: (id: number) => deleteRow("scout_plays", id),

  listReports: (athleteId: number) =>
    listBy("scout_reports", athleteId, { orderBy: "report_date", ascending: false }),
  createReport: (r: any) => insertRow("scout_reports", r),

  listProjections: (athleteId: number) =>
    listBy("scout_projections", athleteId, { orderBy: "run_date", ascending: false }),
  createProjection: (p: any) => insertRow("scout_projections", p),

  listDevItems: (athleteId: number) => listBy("scout_dev_items", athleteId),
  createDevItem: (d: any) => insertRow("scout_dev_items", { status: "Active", ...d }),
  updateDevItem: (id: number, d: any) => updateRow("scout_dev_items", id, d),
  deleteDevItem: (id: number) => deleteRow("scout_dev_items", id),

  listStats: (athleteId: number) => listBy("scout_season_stats", athleteId),
  createStats: (s: any) => insertRow("scout_season_stats", s),
  updateStats: (id: number, s: any) => updateRow("scout_season_stats", id, s),
  deleteStats: (id: number) => deleteRow("scout_season_stats", id),

  async listVideoAnalyses(athleteId: number, kind?: string) {
    let q = client()
      .from("scout_video_analyses")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q;
    if (error) throw error;
    return rowsFromDb(data);
  },
  createVideoAnalysis: (v: any) => insertRow("scout_video_analyses", v),
  updateVideoAnalysis: (id: number, v: any) => updateRow("scout_video_analyses", id, v),
  deleteVideoAnalysis: (id: number) => deleteRow("scout_video_analyses", id),
};

export function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
