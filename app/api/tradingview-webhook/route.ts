import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.secret !== process.env.TRADINGVIEW_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    console.log("TradingView webhook received:", body)

    return NextResponse.json({ ok: true, received: body })
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
  }
}
