import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const since = searchParams.get("since") // ISO timestamp to fetch only newer alerts

    let query = supabaseServer
      .from("TV_Alerts")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gt("received_at", since)
    }

    const { data, error } = await query

    if (error) {
      console.error("TV_Alerts fetch error:", error)
      return NextResponse.json({ ok: true, alerts: [] })
    }

    const alerts = (data || []).map((row: any) => ({
      id: row.id,
      receivedAt: row.received_at,
      ticker: row.ticker,
      action: row.action,
      price: row.price,
      message: row.payload?.message || row.payload?.alert_message || null,
      isExit: isExitSignal(row.action, row.payload),
      payload: row.payload,
    }))

    return NextResponse.json({ ok: true, alerts })
  } catch (error: any) {
    console.error("Latest alerts error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch alerts" }, { status: 500 })
  }
}

function isExitSignal(action: string | null, payload: any): boolean {
  const actionLower = (action || "").toLowerCase()
  const message = (payload?.message || payload?.alert_message || "").toLowerCase()
  return (
    actionLower.includes("exit") ||
    actionLower.includes("sell") ||
    actionLower.includes("close") ||
    message.includes("exit") ||
    message.includes("sell") ||
    message.includes("close")
  )
}
