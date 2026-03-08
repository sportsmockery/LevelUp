import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { data, error } = await supabaseServer
      .from("TV_Alerts")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return NextResponse.json({ ok: true, alert: null })
    }

    return NextResponse.json({
      ok: true,
      alert: {
        id: data.id,
        receivedAt: data.received_at,
        ticker: data.ticker,
        action: data.action,
        price: data.price,
        payload: data.payload,
      },
    })
  } catch (error: any) {
    console.error("Latest alert error:", error)
    return NextResponse.json({ ok: false, error: "Failed to fetch alert" }, { status: 500 })
  }
}
