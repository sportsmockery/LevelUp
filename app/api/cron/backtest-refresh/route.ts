import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { recordHealthUpdate } from "@/lib/data-health"

const FINNHUB_BASE = "https://finnhub.io/api/v1"
const getToken = () => process.env.FINNHUB_API_KEY || ""

// Strategies to backtest — each uses SMA crossover on its own ticker
const STRATEGIES = [
  { strategy: "QQQ", ticker: "QQQ", fastPeriod: 10, slowPeriod: 30 },
  { strategy: "SPMO", ticker: "SPMO", fastPeriod: 10, slowPeriod: 30 },
  { strategy: "MTUM", ticker: "MTUM", fastPeriod: 10, slowPeriod: 30 },
]

// Dual Momentum: rotate between SPY and EFA based on relative strength
const DUAL_MOMENTUM = { strategy: "DualMomentum", tickers: ["SPY", "EFA"], lookback: 63 } // ~3 months

interface Trade {
  strategy: string
  ticker: string
  direction: string
  entryPrice: number
  exitPrice: number | null
  entryTime: string
  exitTime: string | null
  pnlPercent: number | null
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchCandles(symbol: string, fromTs: number, toTs: number) {
  const token = getToken()
  const params = new URLSearchParams({
    symbol,
    resolution: "D",
    from: String(fromTs),
    to: String(toTs),
    token,
  })
  const url = `${FINNHUB_BASE}/stock/candle?${params}`
  // Rate limit: Finnhub free tier allows 60 calls/min
  await delay(1500)
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`Finnhub candle fetch failed for ${symbol}: HTTP ${res.status}, token present: ${!!token}, token length: ${token.length}`)
    return null
  }
  const data = await res.json()
  if (data.s !== "ok" || !data.c?.length) {
    console.error(`Finnhub candle data issue for ${symbol}: status=${data.s}, has closes=${!!data.c?.length}`)
    return null
  }
  return data
}

function sma(values: number[], period: number, index: number): number | null {
  if (index < period - 1) return null
  let sum = 0
  for (let i = index - period + 1; i <= index; i++) {
    sum += values[i]
  }
  return sum / period
}

function generateSmaCrossoverTrades(
  strategy: string,
  ticker: string,
  closes: number[],
  timestamps: number[],
  fastPeriod: number,
  slowPeriod: number,
): Trade[] {
  const trades: Trade[] = []
  let inPosition = false
  let entryPrice = 0
  let entryTime = ""

  for (let i = slowPeriod; i < closes.length; i++) {
    const fastSma = sma(closes, fastPeriod, i)
    const slowSma = sma(closes, slowPeriod, i)
    const prevFastSma = sma(closes, fastPeriod, i - 1)
    const prevSlowSma = sma(closes, slowPeriod, i - 1)

    if (!fastSma || !slowSma || !prevFastSma || !prevSlowSma) continue

    // Buy signal: fast SMA crosses above slow SMA
    if (!inPosition && prevFastSma <= prevSlowSma && fastSma > slowSma) {
      inPosition = true
      entryPrice = closes[i]
      entryTime = new Date(timestamps[i] * 1000).toISOString()
    }
    // Sell signal: fast SMA crosses below slow SMA
    else if (inPosition && prevFastSma >= prevSlowSma && fastSma < slowSma) {
      const exitPrice = closes[i]
      const exitTime = new Date(timestamps[i] * 1000).toISOString()
      trades.push({
        strategy,
        ticker,
        direction: "long",
        entryPrice: +entryPrice.toFixed(2),
        exitPrice: +exitPrice.toFixed(2),
        entryTime,
        exitTime,
        pnlPercent: +((exitPrice - entryPrice) / entryPrice * 100).toFixed(2),
      })
      inPosition = false
    }
  }

  // If still in a position, record as open trade
  if (inPosition) {
    const lastIdx = closes.length - 1
    trades.push({
      strategy,
      ticker,
      direction: "long",
      entryPrice: +entryPrice.toFixed(2),
      exitPrice: null,
      entryTime,
      exitTime: null,
      pnlPercent: +((closes[lastIdx] - entryPrice) / entryPrice * 100).toFixed(2),
    })
  }

  return trades
}

function generateDualMomentumTrades(
  candlesA: { c: number[]; t: number[] },
  candlesB: { c: number[]; t: number[] },
  lookback: number,
): Trade[] {
  const trades: Trade[] = []
  const minLen = Math.min(candlesA.c.length, candlesB.c.length)
  if (minLen < lookback + 1) return trades

  let currentTicker: string | null = null
  let entryPrice = 0
  let entryTime = ""

  for (let i = lookback; i < minLen; i++) {
    // Calculate lookback returns for both
    const retA = (candlesA.c[i] - candlesA.c[i - lookback]) / candlesA.c[i - lookback]
    const retB = (candlesB.c[i] - candlesB.c[i - lookback]) / candlesB.c[i - lookback]

    const preferred = retA >= retB ? "SPY" : "EFA"
    const preferredCandles = retA >= retB ? candlesA : candlesB

    if (currentTicker !== preferred) {
      // Close existing position
      if (currentTicker) {
        const exitCandles = currentTicker === "SPY" ? candlesA : candlesB
        const exitPrice = exitCandles.c[i]
        trades.push({
          strategy: "DualMomentum",
          ticker: currentTicker,
          direction: "long",
          entryPrice: +entryPrice.toFixed(2),
          exitPrice: +exitPrice.toFixed(2),
          entryTime,
          exitTime: new Date(exitCandles.t[i] * 1000).toISOString(),
          pnlPercent: +((exitPrice - entryPrice) / entryPrice * 100).toFixed(2),
        })
      }
      // Open new position
      currentTicker = preferred
      entryPrice = preferredCandles.c[i]
      entryTime = new Date(preferredCandles.t[i] * 1000).toISOString()
    }
  }

  // Close open position
  if (currentTicker) {
    const exitCandles = currentTicker === "SPY" ? candlesA : candlesB
    const lastIdx = exitCandles.c.length - 1
    trades.push({
      strategy: "DualMomentum",
      ticker: currentTicker,
      direction: "long",
      entryPrice: +entryPrice.toFixed(2),
      exitPrice: null,
      entryTime,
      exitTime: null,
      pnlPercent: +((exitCandles.c[lastIdx] - entryPrice) / entryPrice * 100).toFixed(2),
    })
  }

  return trades
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

    // YTD range
    const now = Math.floor(Date.now() / 1000)
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    // Go back extra days to have enough data for SMA warmup
    const fromTs = Math.floor(yearStart.getTime() / 1000) - 60 * 86400

    const allTrades: Trade[] = []
    const token = getToken()
    const debug: Record<string, any> = { tokenPresent: !!token, tokenLength: token.length, fromTs, toTs: now }

    // Generate SMA crossover trades for each strategy
    for (const s of STRATEGIES) {
      const candles = await fetchCandles(s.ticker, fromTs, now)
      if (!candles) {
        debug[s.ticker] = { error: "No candle data returned" }
        continue
      }
      debug[s.ticker] = { dataPoints: candles.c.length, firstDate: new Date(candles.t[0] * 1000).toISOString(), lastDate: new Date(candles.t[candles.t.length - 1] * 1000).toISOString() }
      const trades = generateSmaCrossoverTrades(
        s.strategy, s.ticker, candles.c, candles.t, s.fastPeriod, s.slowPeriod
      )
      debug[s.ticker].allTradesGenerated = trades.length
      // Filter to YTD only (entries after Jan 1)
      const ytdStart = yearStart.toISOString()
      const ytdTrades = trades.filter(t => t.entryTime >= ytdStart)
      debug[s.ticker].ytdTrades = ytdTrades.length
      allTrades.push(...ytdTrades)
    }

    // Generate Dual Momentum trades
    const [spyCandles, efaCandles] = await Promise.all([
      fetchCandles("SPY", fromTs, now),
      fetchCandles("EFA", fromTs, now),
    ])
    debug.SPY = spyCandles ? { dataPoints: spyCandles.c.length } : { error: "No data" }
    debug.EFA = efaCandles ? { dataPoints: efaCandles.c.length } : { error: "No data" }
    if (spyCandles && efaCandles) {
      const dmTrades = generateDualMomentumTrades(spyCandles, efaCandles, DUAL_MOMENTUM.lookback)
      const ytdStart = yearStart.toISOString()
      const ytdDm = dmTrades.filter(t => t.entryTime >= ytdStart)
      debug.DualMomentum = { allTrades: dmTrades.length, ytdTrades: ytdDm.length }
      allTrades.push(...ytdDm)
    }

    // Clear old backtest trades and insert new ones
    await supabaseServer.from("Backtest_Trades").delete().neq("id", 0)

    if (allTrades.length > 0) {
      const rows = allTrades.map(t => ({
        strategy: t.strategy,
        ticker: t.ticker,
        direction: t.direction,
        entry_price: t.entryPrice,
        exit_price: t.exitPrice,
        entry_time: t.entryTime,
        exit_time: t.exitTime,
        pnl_percent: t.pnlPercent,
      }))

      const { error } = await supabaseServer.from("Backtest_Trades").insert(rows)
      if (error) {
        console.error("Failed to store backtest trades:", error)
        return NextResponse.json({ ok: false, error: "Failed to store trades" }, { status: 500 })
      }
    }

    await recordHealthUpdate(
      "backtest_trades",
      allTrades.length > 0 ? "ok" : "error",
      allTrades.length > 0 ? `${allTrades.length} trades generated` : "No trades generated — Finnhub candle data unavailable"
    )

    return NextResponse.json({
      ok: true,
      count: allTrades.length,
      strategies: [...new Set(allTrades.map(t => t.strategy))],
      trades: allTrades,
      debug,
    })
  } catch (error: any) {
    console.error("Backtest refresh error:", error)
    await recordHealthUpdate("backtest_trades", "error", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
