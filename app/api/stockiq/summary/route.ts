import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { supabaseServer } from "@/lib/supabase-server"

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })

export async function GET(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const since = searchParams.get("since") // ISO timestamp of user's last visit

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

    if (relevantFindings.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No new insights since your last visit. Markets are quiet — StockIQ is monitoring and will alert you when conditions change.",
        findingsCount: 0,
        since: sinceDate,
      })
    }

    // Use GPT-4o to generate a concise, conversational summary
    const openai = getOpenAI()

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are StockIQ, an AI trading analyst. Generate a single concise update message (2-4 sentences max) summarizing the most important insights for a user who just opened their trading dashboard.

RULES:
- Speak directly to the user in first person ("I found...", "I'm seeing...", "My analysis shows...")
- Focus ONLY on actionable insights about the strategies on the page: QQQ, SPMO, MTUM momentum strategies and DualMomentum (SPY/EFA rotation) vs S&P 500 benchmark
- Lead with the most important directional call (LONG or EXIT)
- Include specific numbers: prices, percentage changes, confidence levels
- Keep it brief and punchy — this is a ticker-style update bar, not a report
- Do NOT use bullet points, headers, or formatting — just flowing text
- If multiple findings exist, synthesize them into one coherent narrative
- End with a forward-looking statement about what to watch for next`,
        },
        {
          role: "user",
          content: `The user last visited at ${sinceDate}. Here are the StockIQ findings since then:

${JSON.stringify(relevantFindings.map(f => ({
  direction: f.direction,
  confidence: f.confidence_score,
  category: f.category,
  message: f.message,
  reasoning: f.reasoning,
  symbols: f.symbols,
  created_at: f.created_at,
})), null, 2)}

Summarize these into a single conversational update for the dashboard.`,
        },
      ],
      max_tokens: 200,
    })

    const message = response.choices[0]?.message?.content || "StockIQ is analyzing current market conditions. Check back shortly for updated insights."

    return NextResponse.json({
      ok: true,
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
