import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const strategy = searchParams.get("strategy")

    let query = supabaseServer
      .from("Backtest_Trades")
      .select("*")
      .order("entry_time", { ascending: false })

    if (strategy && strategy !== "All") {
      query = query.eq("strategy", strategy)
    }

    const { data, error } = await query

    if (error) {
      console.error("Backtest trades fetch error:", error)
      return NextResponse.json({ ok: false, error: "Failed to fetch trades" }, { status: 500 })
    }

    const trades = (data || []).map((row: any) => ({
      strategy: row.strategy,
      ticker: row.ticker,
      direction: row.direction,
      entryPrice: row.entry_price,
      exitPrice: row.exit_price,
      entryTime: row.entry_time,
      exitTime: row.exit_time,
      pnlPercent: row.pnl_percent,
      source: "backtest" as const,
    }))

    return NextResponse.json({ ok: true, trades })
  } catch (error: any) {
    console.error("Backtest trades error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
