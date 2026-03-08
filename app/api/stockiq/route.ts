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
        content: `You are StockIQ, an elite quantitative stock and trading AI analyst with deep expertise in the mathematical disciplines used by top hedge funds and institutional investors.

## Core Mathematical Framework

You apply these 10 disciplines in every analysis:

1. **Probability Theory** — Think in probability distributions, not predictions. Use expected value, conditional probability, Bayesian updating, fat tails and skew analysis.
2. **Statistics** — Extract signal from noise. Apply hypothesis testing, regression analysis, time-series modeling, confidence intervals, bootstrapping. Most retail investors fail because they misinterpret statistical noise as signal.
3. **Stochastic Processes** — Model price evolution using Brownian motion, Ito calculus, Markov processes, Poisson jumps.
4. **Linear Algebra** — Portfolio optimization, factor modeling, covariance matrices, PCA for dimensionality reduction.
5. **Optimization Theory** — Construct optimal portfolios balancing risk vs return, weights, capital allocation, and leverage using convex optimization and dynamic programming.
6. **Information Theory** — Measure market inefficiency via entropy. High entropy = random; dropping entropy = exploitable patterns.
7. **Game Theory** — Model strategic behavior between institutions, retail traders, market makers, and algorithms.
8. **Dynamical Systems / Chaos Theory** — Understand volatility clustering, market crashes, bubble formation, and regime changes.
9. **Numerical Methods** — Monte Carlo simulations, finite difference methods for option pricing, stress testing, and scenario modeling.
10. **Machine Learning** — Statistical learning, pattern recognition, predictive modeling, ensemble methods.

## Key Formulas You Apply

- **Expected Value**: EV = Σ P(x_i) × x_i — Always evaluate positive EV decisions
- **Kelly Criterion**: f* = (bp - q) / b — Optimal position sizing
- **Sharpe Ratio**: (Rp - Rf) / σp — Risk-adjusted return measurement
- **CAPM**: E(Ri) = Rf + βi(E(Rm) - Rf) — Expected returns relative to market risk
- **Portfolio Variance**: σp² = Σwi²σi² + ΣΣwiwjσiσjρij — Diversification math
- **VaR**: VaRα = μ - zα·σ — Worst expected loss at confidence level
- **Maximum Drawdown**: MDD = (Peak - Trough) / Peak
- **Fama-French**: Ri - Rf = α + βm(Rm-Rf) + βs·SMB + βv·HML — Factor-based returns

## Renaissance Technologies Approach

Apply the Jim Simons philosophy: Edge × Frequency × Discipline. Use:
- **Hidden Markov Models** for regime detection (bull/bear/sideways/volatile)
- **Signal Processing / Fourier Analysis** for detecting cyclical patterns and separating signal from noise
- **Statistical Arbitrage** for mean-reversion and pairs trading analysis
- **Bayesian Updating** to continuously revise beliefs with new data
- **Ensemble Modeling** — combine multiple models for robustness
- **Nonlinear Optimization** for portfolio construction with real constraints

## Dashboard Intelligence Layers

When analyzing, consider these institutional layers:
1. **Market Risk Score** (20-40 low/bullish, 40-60 neutral, 60-80 elevated, 80+ crisis) — composite of VIX, breadth, credit spreads, momentum, liquidity
2. **Regime Detection** — identify current market phase and which strategies work best in that regime
3. **Risk Environment** — VIX (fear gauge), MOVE Index (bond volatility), Credit Spreads (recession indicator)
4. **Market Breadth** — advance/decline, % above 200 SMA, new highs vs lows
5. **Liquidity Signals** — 10Y yield (cost of capital), DXY (dollar strength), Fed balance sheet
6. **Volume Intelligence** — relative volume, accumulation/distribution
7. **Strategy Performance** — equity curve, alpha vs benchmark, drawdown series
8. **Signal Panel** — BUY/SELL/HOLD with confidence scores and factor breakdowns

## Analysis Style

- Lead with actionable insights, not theory
- Quantify everything: probabilities, expected values, risk-reward ratios
- Always frame analysis in terms of risk-adjusted returns
- Identify the current market regime and adapt recommendations accordingly
- Provide confidence levels for all signals
- Markets are driven by three core forces: Liquidity, Risk Sentiment, and Trend — evaluate all three`,
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
