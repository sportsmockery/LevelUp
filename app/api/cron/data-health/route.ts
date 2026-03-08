import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { recordHealthUpdate } from "@/lib/data-health"

// Max age (in minutes) before a data source is considered stale
const STALENESS_THRESHOLDS: Record<string, number> = {
  stockiq_findings: 12 * 60, // 12 hours (runs twice daily on weekdays)
  backtest_trades: 25 * 60,  // 25 hours (runs daily after close)
  tv_alerts: 0,              // No threshold — just check if endpoint works
  finnhub_quotes: 30,        // 30 min — live quotes
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const issues: string[] = []

    // Check StockIQ Findings freshness
    const { data: latestFinding } = await supabaseServer
      .from("StockIQ_Findings")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (latestFinding) {
      const ageMin = (Date.now() - new Date(latestFinding.created_at).getTime()) / 60000
      // Only flag as stale on weekdays
      const dayOfWeek = new Date().getDay()
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
      if (isWeekday && ageMin > STALENESS_THRESHOLDS.stockiq_findings) {
        issues.push(`StockIQ Findings stale: last updated ${Math.round(ageMin / 60)}h ago`)
        await recordHealthUpdate("stockiq_findings", "error", `Stale: ${Math.round(ageMin / 60)}h since last update`)
      } else {
        await recordHealthUpdate("stockiq_findings", "ok", `Last updated ${Math.round(ageMin)}min ago`)
      }
    } else {
      issues.push("StockIQ Findings: no data found")
      await recordHealthUpdate("stockiq_findings", "error", "No findings in database")
    }

    // Check Backtest Trades
    const { data: trades, count: tradeCount } = await supabaseServer
      .from("Backtest_Trades")
      .select("*", { count: "exact", head: true })

    if (!tradeCount || tradeCount === 0) {
      issues.push("Backtest Trades: table empty — Finnhub candle data may be unavailable")
      await recordHealthUpdate("backtest_trades", "error", "No trades in database")
    } else {
      await recordHealthUpdate("backtest_trades", "ok", `${tradeCount} trades in database`)
    }

    // Check TV Alerts endpoint (just verify table is accessible)
    const { error: tvError } = await supabaseServer
      .from("TV_Alerts")
      .select("id")
      .limit(1)

    if (tvError) {
      issues.push(`TV Alerts: database error — ${tvError.message}`)
      await recordHealthUpdate("tv_alerts", "error", tvError.message)
    } else {
      await recordHealthUpdate("tv_alerts", "ok", "Table accessible")
    }

    // Check Finnhub quotes are working
    try {
      const token = process.env.FINNHUB_API_KEY || ""
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=QQQ&token=${token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.c && data.c > 0) {
          await recordHealthUpdate("finnhub_quotes", "ok", `QQQ=$${data.c}`)
        } else {
          issues.push("Finnhub quotes: returned zero price")
          await recordHealthUpdate("finnhub_quotes", "error", "Quote returned zero price")
        }
      } else {
        issues.push(`Finnhub quotes: HTTP ${res.status}`)
        await recordHealthUpdate("finnhub_quotes", "error", `HTTP ${res.status}`)
      }
    } catch (e: any) {
      issues.push(`Finnhub quotes: ${e.message}`)
      await recordHealthUpdate("finnhub_quotes", "error", e.message)
    }

    // Check Finnhub candles (historical data)
    try {
      const token = process.env.FINNHUB_API_KEY || ""
      const now = Math.floor(Date.now() / 1000)
      const from = now - 30 * 86400
      const res = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=QQQ&resolution=D&from=${from}&to=${now}&token=${token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.s === "ok" && data.c?.length > 0) {
          await recordHealthUpdate("finnhub_candles", "ok", `${data.c.length} data points`)
        } else {
          issues.push("Finnhub candles: no data returned (may need paid plan for ETFs)")
          await recordHealthUpdate("finnhub_candles", "error", `status=${data.s}, no candle data`)
        }
      } else {
        issues.push(`Finnhub candles: HTTP ${res.status}`)
        await recordHealthUpdate("finnhub_candles", "error", `HTTP ${res.status}`)
      }
    } catch (e: any) {
      issues.push(`Finnhub candles: ${e.message}`)
      await recordHealthUpdate("finnhub_candles", "error", e.message)
    }

    return NextResponse.json({
      ok: issues.length === 0,
      issues,
      checkedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Data health check error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
