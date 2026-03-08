import { NextRequest, NextResponse } from "next/server"

const FINNHUB_BASE = "https://finnhub.io/api/v1"
const getToken = () => process.env.FINNHUB_API_KEY || ""

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get("endpoint")

    if (!endpoint) {
      return NextResponse.json(
        { ok: false, error: "Missing endpoint parameter" },
        { status: 400 }
      )
    }

    // Build Finnhub URL with all query params except "endpoint"
    const params = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (key !== "endpoint") params.set(key, value)
    })
    params.set("token", getToken())

    const url = `${FINNHUB_BASE}/${endpoint}?${params.toString()}`
    const res = await fetch(url)

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Finnhub error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Finnhub proxy error:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Finnhub request failed" },
      { status: 500 }
    )
  }
}
