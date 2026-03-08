import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { data, error } = await supabaseServer
      .from("StockIQ_Findings")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("StockIQ findings fetch error:", error)
      return NextResponse.json({ ok: false, error: "Failed to fetch findings" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, findings: data })
  } catch (error: any) {
    console.error("StockIQ findings error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
