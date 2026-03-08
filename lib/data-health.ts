import { supabaseServer } from "@/lib/supabase-server"

export async function recordHealthUpdate(source: string, status: "ok" | "error", details?: string) {
  if (!supabaseServer) return
  await supabaseServer.from("Data_Health").upsert(
    {
      source,
      status,
      details: details || null,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "source" }
  )
}
