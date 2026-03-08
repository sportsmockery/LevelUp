import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { data, error } = await supabaseServer
      .from("Data_Health")
      .select("*")

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // Convert to a map for easy lookup
    const health: Record<string, { status: string; details: string | null; lastUpdated: string }> = {}
    for (const row of data || []) {
      health[row.source] = {
        status: row.status,
        details: row.details,
        lastUpdated: row.last_updated,
      }
    }

    return NextResponse.json({ ok: true, health })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
