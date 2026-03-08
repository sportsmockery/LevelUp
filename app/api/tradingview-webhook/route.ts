import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.secret !== process.env.TRADINGVIEW_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { error } = await supabaseServer.from("TV_Alerts").insert({
      ticker: body.ticker || null,
      action: body.action || null,
      price: body.price || null,
      payload: body,
    })

    if (error) {
      console.error("TV_Alerts insert error:", error)
      return NextResponse.json({ ok: false, error: "Failed to save alert" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
  }
}
