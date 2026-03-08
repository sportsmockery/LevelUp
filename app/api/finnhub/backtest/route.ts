import { NextRequest, NextResponse } from "next/server"

const FINNHUB_BASE = "https://finnhub.io/api/v1"
const getToken = () => process.env.FINNHUB_API_KEY || ""

const STRATEGIES = ["QQQ", "SPMO", "MTUM"]
const BENCHMARK = "SPY" // S&P 500 ETF

const TIMEFRAMES: Record<string, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
  "3Y": 1095,
}

async function fetchCandles(symbol: string, fromTs: number, toTs: number) {
  const params = new URLSearchParams({
    symbol,
    resolution: "D",
    from: String(fromTs),
    to: String(toTs),
    token: getToken(),
  })
  const res = await fetch(`${FINNHUB_BASE}/stock/candle?${params}`)
  if (!res.ok) throw new Error(`Finnhub candle error for ${symbol}: ${res.status}`)
  const data = await res.json()
  if (data.s !== "ok" || !data.c?.length) return null
  return data
}

function calcMetrics(candles: any) {
  const closes: number[] = candles.c
  if (closes.length < 2) return null

  const startPrice = closes[0]
  const endPrice = closes[closes.length - 1]
  const totalReturn = ((endPrice - startPrice) / startPrice) * 100

  // Daily returns
  const dailyReturns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1])
  }

  // Annualized return
  const tradingDays = closes.length
  const years = tradingDays / 252
  const annualizedReturn = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100

  // Volatility (annualized std dev)
  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
  const variance = dailyReturns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / dailyReturns.length
  const dailyVol = Math.sqrt(variance)
  const annualizedVol = dailyVol * Math.sqrt(252) * 100

  // Sharpe ratio (assuming 5% risk-free rate)
  const sharpe = annualizedVol > 0 ? (annualizedReturn - 5) / annualizedVol : 0

  // Max drawdown
  let peak = closes[0]
  let maxDrawdown = 0
  for (const price of closes) {
    if (price > peak) peak = price
    const dd = ((peak - price) / peak) * 100
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  // Monthly win rate (positive months)
  const monthlyReturns: number[] = []
  const step = Math.min(21, Math.floor(closes.length / 2))
  for (let i = step; i < closes.length; i += step) {
    monthlyReturns.push((closes[i] - closes[i - step]) / closes[i - step])
  }
  const winRate = monthlyReturns.length > 0
    ? (monthlyReturns.filter((r) => r > 0).length / monthlyReturns.length) * 100
    : 0

  return {
    startPrice: +startPrice.toFixed(2),
    endPrice: +endPrice.toFixed(2),
    totalReturn: +totalReturn.toFixed(2),
    annualizedReturn: +annualizedReturn.toFixed(2),
    annualizedVol: +annualizedVol.toFixed(2),
    sharpe: +sharpe.toFixed(2),
    maxDrawdown: +maxDrawdown.toFixed(2),
    winRate: +winRate.toFixed(1),
    dataPoints: closes.length,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get("timeframe") // optional, returns all if omitted
    const allSymbols = [...STRATEGIES, BENCHMARK]

    const now = Math.floor(Date.now() / 1000)
    const framesToCalc = timeframe && TIMEFRAMES[timeframe]
      ? { [timeframe]: TIMEFRAMES[timeframe] }
      : TIMEFRAMES

    const results: Record<string, any> = {}

    for (const [label, days] of Object.entries(framesToCalc)) {
      const fromTs = now - days * 86400

      const symbolResults = await Promise.all(
        allSymbols.map(async (symbol) => {
          try {
            const candles = await fetchCandles(symbol, fromTs, now)
            if (!candles) return { symbol, error: "No data" }
            const metrics = calcMetrics(candles)
            if (!metrics) return { symbol, error: "Insufficient data" }
            return { symbol, ...metrics }
          } catch (e: any) {
            return { symbol, error: e.message }
          }
        })
      )

      const benchmark = symbolResults.find((r) => r.symbol === BENCHMARK)
      const strategies = symbolResults
        .filter((r) => r.symbol !== BENCHMARK)
        .map((s) => ({
          ...s,
          vsBenchmark: benchmark && "totalReturn" in s && "totalReturn" in benchmark
            ? +(s.totalReturn - benchmark.totalReturn).toFixed(2)
            : null,
        }))

      results[label] = { strategies, benchmark }
    }

    return NextResponse.json({ ok: true, results })
  } catch (error: any) {
    console.error("Backtest error:", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
