import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const getOpenAI = () =>
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })

const FINNHUB_BASE = "https://finnhub.io/api/v1"
const getFinnhubToken = () => process.env.FINNHUB_API_KEY || ""

async function fetchFinnhub(endpoint: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ ...params, token: getFinnhubToken() })
  const res = await fetch(`${FINNHUB_BASE}/${endpoint}?${query}`)
  if (!res.ok) throw new Error(`Finnhub ${endpoint} returned ${res.status}`)
  return res.json()
}

async function getMarketData(symbols: string[]) {
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const quote = await fetchFinnhub("quote", { symbol })
        const profile = await fetchFinnhub("stock/profile2", { symbol })
        return {
          symbol,
          name: profile.name || symbol,
          price: quote.c,
          change: quote.d,
          changePercent: quote.dp,
          high: quote.h,
          low: quote.l,
          open: quote.o,
          prevClose: quote.pc,
        }
      } catch {
        return { symbol, error: "Failed to fetch data" }
      }
    })
  )
  return results
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, symbols, context } = body

    if (!prompt) {
      return NextResponse.json({ ok: false, error: "Missing prompt" }, { status: 400 })
    }

    // Fetch live market data if symbols provided
    let marketData = null
    if (symbols && Array.isArray(symbols) && symbols.length > 0) {
      marketData = await getMarketData(symbols.slice(0, 10))
    }

    const openai = getOpenAI()

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are StockIQ, an expert stock and trading AI analyst.",
      },
    ]

    if (marketData) {
      messages.push({
        role: "user",
        content: `Live market data:\n${JSON.stringify(marketData, null, 2)}`,
      })
    }

    if (context) {
      messages.push({
        role: "user",
        content: `Context: ${JSON.stringify(context)}`,
      })
    }

    messages.push({ role: "user", content: prompt })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    })

    const message = response.choices[0]?.message?.content || ""

    return NextResponse.json({ ok: true, response: message, marketData })
  } catch (error: any) {
    console.error("StockIQ error:", error)
    return NextResponse.json({ ok: false, error: error.message || "StockIQ failed" }, { status: 500 })
  }
}
