import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { supabaseServer } from "@/lib/supabase-server"

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })

// Time-of-day greeting helper
function getTimeOfDay(): string {
  const hour = new Date().getUTCHours() - 5 // EST approximation
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}

// Rotate greetings — pick one based on day of year
const GREETINGS = [
  (name: string, tod: string) => `Good ${tod}${name ? `, ${name}` : ""}. Let me walk you through where the strategies stand.`,
  (name: string, tod: string) => `${name ? `${name}, w` : "W"}elcome back. Here's your strategy briefing — let's get into the numbers.`,
  (name: string, tod: string) => `Hey${name ? ` ${name}` : " there"}. Markets are open and the signals are in. Here's what you need to know.`,
  (name: string, tod: string) => `${name ? `${name}, g` : "G"}ood to see you. I've got your strategy update ready — let's take a look.`,
  (name: string, tod: string) => `Welcome in${name ? `, ${name}` : ""}. I've been watching the boards. Here's the latest on your strategies.`,
  (name: string, tod: string) => `${name ? `${name}, h` : "H"}ope you're doing well. Let me bring you up to speed on QQQ, SPMO, and MTUM.`,
  (name: string, tod: string) => `Good ${tod}${name ? `, ${name}` : ""}. Coffee's on, charts are loaded — let's talk strategy.`,
  (name: string, tod: string) => `${name ? `${name}, g` : "G"}lad you're here. A few things moved since we last spoke. Let me catch you up.`,
  (name: string, tod: string) => `Hey${name ? ` ${name}` : ""}, welcome. The dashboard is live and I've got the daily numbers pulled. Let's dig in.`,
  (name: string, tod: string) => `${name ? `${name}, r` : "R"}ight on time. The momentum readings just updated — let me show you what changed.`,
  (name: string, tod: string) => `Welcome back${name ? `, ${name}` : ""}. Before we go deep, here's the 30-second snapshot of where things stand.`,
  (name: string, tod: string) => `Good ${tod}${name ? `, ${name}` : ""}. I've reviewed today's signals across all three strategies. Here's the summary.`,
]

function pickGreeting(firstName: string): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const idx = dayOfYear % GREETINGS.length
  return GREETINGS[idx](firstName, getTimeOfDay())
}

const STOCKIQ_SYSTEM_PROMPT = `You are StockIQ, a Senior Investment Strategy AI Advisor. You have the equivalent of 15 years on institutional trading desks before moving into strategy research. You speak like someone who has been in the room when real money was on the line — calm under pressure, precise with numbers, and genuinely invested in helping the person across the table succeed.

PERSONALITY:
- Confident but not arrogant — state findings clearly, acknowledge uncertainty when it exists
- Warm but professional — never crosses into casual or sloppy
- Direct — lead with the answer, then explain. Never bury the point.
- Data-first — every claim is grounded in strategy performance, backtest results, or indicator logic. Never speculate or guess.
- Calm under pressure — when markets are volatile, slow down, lower the intensity, reassure with facts not hype
- Honest about risk — never hide drawdowns, losing periods, or strategy limitations. Address them head-on.
- Conversational but structured — your tone feels like a smart colleague talking, not a textbook

VOICE RULES:
- Clear, plain American English. No jargon without brief explanation.
- Contractions are fine ("here's what I'm seeing" not "here is what I am observing")
- No filler phrases like "Great question!" or "That's interesting"
- No emojis in analysis
- Active voice: "QQQ gained 3.1%" not "A gain of 3.1% was observed"
- Short to medium sentences. Max 25 words when explaining data.
- Bad news is matter-of-fact and constructive: "MTUM lagged the benchmark. That's the trade-off of broader momentum diversification — it smooths risk but gives up some upside in concentrated rallies."
- Never make promises or predictions. Use "historically," "based on the backtest," "the data shows"
- Never say "I think" about market direction. Say "the strategy signals," "the indicators show," "the data suggests"

KNOWLEDGE BOUNDARIES — ONLY discuss:
- QQQ, SPMO, MTUM ETF performance and strategy signals
- S&P 500 benchmark comparison and DualMomentum (SPY/EFA rotation)
- Strategy logic: moving averages, RSI, ROC, relative strength, VWAP, Bollinger Bands
- Market breadth, risk indicators (VIX, credit spreads), liquidity signals
- Volume intelligence, strategy performance metrics, signal layer
- Backtest methodology and interpretation
- Webhook alerts and trade log interpretation

NEVER discuss: individual stock picks outside the strategies, crypto, forex, options, futures, tax advice, estate planning, personal portfolio recommendations, or future market predictions.

TASK: Generate a dashboard update message. This appears in a typewriter-style update bar at the top of the dashboard. Keep it to 2-4 sentences max. Lead with the most important directional call. Include specific numbers. Do NOT use bullet points, headers, or markdown — just flowing text. Synthesize multiple findings into one coherent narrative. End with what to watch for next.`

export async function GET(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const since = searchParams.get("since") // ISO timestamp of user's last visit
    const firstName = searchParams.get("name") || "" // User's first name for greeting

    // Fetch findings since last visit (or last 24h if no timestamp)
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: findings } = await supabaseServer
      .from("StockIQ_Findings")
      .select("*")
      .gt("created_at", sinceDate)
      .order("created_at", { ascending: false })
      .limit(10)

    // If no new findings, fetch the most recent ones anyway
    let relevantFindings = findings || []
    if (relevantFindings.length === 0) {
      const { data: latest } = await supabaseServer
        .from("StockIQ_Findings")
        .select("*")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(5)
      relevantFindings = latest || []
    }

    const greeting = pickGreeting(firstName)

    if (relevantFindings.length === 0) {
      return NextResponse.json({
        ok: true,
        greeting,
        message: "Markets have been quiet since your last visit. All three strategies — QQQ, SPMO, and MTUM — are holding their current postures. No signal changes to report. I'm monitoring and will flag anything that moves.",
        findingsCount: 0,
        since: sinceDate,
      })
    }

    // Use GPT-4o with StockIQ personality to generate the summary
    const openai = getOpenAI()

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: STOCKIQ_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `The visitor last checked in at ${sinceDate}. Here are the findings since then:

${JSON.stringify(relevantFindings.map(f => ({
  direction: f.direction,
  confidence: f.confidence_score,
  category: f.category,
  message: f.message,
  reasoning: f.reasoning,
  symbols: f.symbols,
  created_at: f.created_at,
})), null, 2)}

Deliver a concise update for the dashboard typewriter bar. Do NOT include a greeting — that's handled separately. Jump straight into the strategy update.`,
        },
      ],
      max_tokens: 250,
    })

    const message = response.choices[0]?.message?.content || "The system is running and I'm reviewing the latest signals across all three strategies. I'll have a full update shortly."

    return NextResponse.json({
      ok: true,
      greeting,
      message,
      findingsCount: relevantFindings.length,
      since: sinceDate,
      latestFindingAt: relevantFindings[0]?.created_at || null,
    })
  } catch (error: any) {
    console.error("StockIQ summary error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
