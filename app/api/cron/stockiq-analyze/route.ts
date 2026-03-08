import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { supabaseServer } from "@/lib/supabase-server"
import { recordHealthUpdate } from "@/lib/data-health"

const FINNHUB_BASE = "https://finnhub.io/api/v1"
const getFinnhubToken = () => process.env.FINNHUB_API_KEY || ""
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })

const TRACKED_SYMBOLS = ["QQQ", "SPY", "SPMO", "MTUM"]
const MACRO_SYMBOLS = ["TLT", "UUP", "HYG", "GLD", "VXX"]

async function fetchFinnhub(endpoint: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ ...params, token: getFinnhubToken() })
  const res = await fetch(`${FINNHUB_BASE}/${endpoint}?${query}`)
  if (!res.ok) return null
  return res.json()
}

async function gatherMarketIntelligence() {
  const allSymbols = [...TRACKED_SYMBOLS, ...MACRO_SYMBOLS]

  // Fetch quotes for all symbols
  const quotes = await Promise.all(
    allSymbols.map(async (symbol) => {
      const quote = await fetchFinnhub("quote", { symbol })
      if (!quote || quote.c === 0) return null
      return { symbol, price: quote.c, change: quote.d, changePercent: quote.dp, high: quote.h, low: quote.l, open: quote.o, prevClose: quote.pc }
    })
  )

  // Fetch general market news
  const news = await fetchFinnhub("news", { category: "general" })

  // Fetch company news for tracked symbols
  const today = new Date().toISOString().split("T")[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  const symbolNews = await Promise.all(
    TRACKED_SYMBOLS.map(async (symbol) => {
      const articles = await fetchFinnhub("company-news", { symbol, from: weekAgo, to: today })
      return { symbol, articles: (articles || []).slice(0, 3) }
    })
  )

  // Fetch recent TV alerts from our database
  let recentAlerts: any[] = []
  if (supabaseServer) {
    const { data } = await supabaseServer
      .from("TV_Alerts")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(10)
    recentAlerts = data || []
  }

  // Fetch previous findings for context
  let previousFindings: any[] = []
  if (supabaseServer) {
    const { data } = await supabaseServer
      .from("StockIQ_Findings")
      .select("message, confidence_score, category, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
    previousFindings = data || []
  }

  return {
    quotes: quotes.filter(Boolean),
    generalNews: (news || []).slice(0, 5).map((n: any) => ({ headline: n.headline, summary: n.summary, source: n.source })),
    symbolNews,
    recentAlerts,
    previousFindings,
    timestamp: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret or allow manual trigger in dev
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    // Gather all market intelligence
    const intel = await gatherMarketIntelligence()

    const openai = getOpenAI()

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are StockIQ, an elite quantitative trading AI analyst. You are running your scheduled analysis cycle.

Your job: Analyze all market data, news, alerts, and previous findings to produce SPECIFIC DIRECTIONAL CALLS — LONG or EXIT — for investors following QQQ, SPMO, MTUM momentum strategies vs S&P 500 benchmark.

You ONLY publish a finding when you have a specific directional opinion:
- "long" = investors should enter or hold a long position in this asset
- "exit" = investors should exit or avoid this position

IMPORTANT RULES:
- EVERY finding MUST have a direction: "long" or "exit"
- Only publish when you have conviction (60+ confidence). No wishy-washy observations.
- Each finding must explain WHY: what specific data, indicators, or conditions support this call
- Reference actual numbers: prices, percentage changes, MA levels, relative strength readings
- Include which of the 8 dashboard layers (regime, price, breadth, risk, liquidity, volume, strategy performance, signal) support or contradict your call
- Do NOT repeat previous findings unless the situation has materially changed
- Think like a hedge fund PM making allocation decisions, not a commentator

Respond with a JSON object: { "findings": [...] }. Each finding:
{
  "confidence_score": number (0-100),
  "direction": "long" | "exit",
  "category": "signal" | "risk" | "opportunity" | "regime" | "alert",
  "message": "concise directional call (1-2 sentences max)",
  "reasoning": "specific data points, indicator readings, and dashboard layers supporting this call",
  "symbols": ["relevant", "tickers"]
}

Return between 1-5 findings. Only include findings that clear a 60+ confidence threshold. If nothing noteworthy, return an empty array [].`,
        },
        {
          role: "user",
          content: `Current market intelligence gathered at ${intel.timestamp}:

QUOTES:
${JSON.stringify(intel.quotes, null, 2)}

GENERAL MARKET NEWS:
${JSON.stringify(intel.generalNews, null, 2)}

SYMBOL-SPECIFIC NEWS:
${JSON.stringify(intel.symbolNews, null, 2)}

RECENT TRADINGVIEW ALERTS:
${JSON.stringify(intel.recentAlerts, null, 2)}

PREVIOUS STOCKIQ FINDINGS (avoid repeating):
${JSON.stringify(intel.previousFindings, null, 2)}

Analyze this data using your full quantitative framework. For each tracked strategy (QQQ, SPMO, MTUM), determine if you have a directional call. Only publish findings where you have genuine conviction.`,
        },
      ],
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content || "[]"
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error("StockIQ returned invalid JSON:", content)
      return NextResponse.json({ ok: false, error: "Invalid AI response" }, { status: 500 })
    }

    const findings = Array.isArray(parsed) ? parsed : parsed.findings || []

    if (findings.length === 0) {
      return NextResponse.json({ ok: true, message: "No noteworthy findings this cycle", count: 0 })
    }

    // Store findings in Supabase
    const rows = findings.map((f: any) => ({
      confidence_score: f.confidence_score,
      direction: f.direction || null,
      category: f.category,
      message: f.message,
      reasoning: f.reasoning,
      symbols: f.symbols || [],
      data_sources: { quotes: intel.quotes.map((q: any) => q?.symbol), newsCount: intel.generalNews.length, alertCount: intel.recentAlerts.length },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24hr expiry
    }))

    const { error } = await supabaseServer.from("StockIQ_Findings").insert(rows)

    if (error) {
      console.error("Failed to store findings:", error)
      return NextResponse.json({ ok: false, error: "Failed to store findings" }, { status: 500 })
    }

    await recordHealthUpdate("stockiq_findings", "ok", `${findings.length} findings generated`)
    return NextResponse.json({ ok: true, count: findings.length, findings })
  } catch (error: any) {
    console.error("StockIQ cron error:", error)
    await recordHealthUpdate("stockiq_findings", "error", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
