# The Premium Challenge — Optimized Rulebook v1.0

**Status:** Draft for client review
**Date:** 2026-09-20
**Supersedes:** the informal rules as given

---

## 0. The rules as given, and what's wrong with them

> "Options trading to see who can generate the highest return in premiums. The goal is to
> not own the stock unnecessarily. In some cases you may not be able to avoid buying at
> times, but the primary goal is optimize for premium returns. $10k to start, 100% return
> yearly moving forward is the goal."

Four problems, each of which a professional trader will exploit or dismiss:

| # | Problem | Why it matters | Fix |
|---|---|---|---|
| 1 | **"Highest return in premiums" has no risk term.** | The strategy that maximizes premium collected is naked short options at maximum size. It wins 11 months out of 12 and then returns -100%. A contest scored on gross premium *selects for* the blow-up trade. | Score net return, subject to a hard drawdown constraint, with a risk-adjusted co-metric. §2 |
| 2 | **"Don't own the stock" is the wrong constraint.** | Assignment is not the risk; unhedged tail exposure is. Banning ownership pushes you toward rolling losers forever — which is how small accounts die. Meanwhile defined-risk spreads never assign if managed, and they're more capital-efficient anyway. | Replace with an *assignment budget* and an approved-ownership list. §6 |
| 3 | **"$10k" is underspecified and structurally binding.** | Cash vs. margin, options approval level, and the PDT rule below \$25k each change what's even legal to trade. One cash-secured put on a \$60 stock is 60% of the account. | Specify account type, approval level, and a structure set sized for \$10k. §3, §5 |
| 4 | **"100% yearly" is a marketing number, not a target.** | See §1. Promising it is how you lose a trading principal's respect in the first meeting. | Publish the honest distribution, make 100% an explicitly-priced stretch configuration. §1 |

Everything below is the corrected version. It is written so that **both sides can be scored by
the same machine**, which is the entire point.

---

## 1. Honest expectation setting (read this before §2)

State this to the client directly. It is the single highest-leverage thing in the pitch.

Mechanical premium selling harvests the **variance risk premium** — the persistent gap between
implied volatility and subsequently realized volatility. It is a real, well-documented,
capacity-constrained edge. It is not a 100%/year edge at controlled risk.

**The arithmetic on \$10,000:**

- A cash-secured put ties up the full strike notional. On a \$30 underlying that's \$3,000 —
  30% of the account for one position. At a realistic 1.0–1.5% of notional per monthly cycle,
  a fully-deployed CSP book returns roughly **8–15%/year**. It cannot reach 100%.
- Defined-risk spreads are the only structure that gets a \$10k account into double digits
  monthly. A \$5-wide put credit spread collecting \$1.00 uses \$400 of buying power for \$100
  of max profit. Managed at 50%, that's ~12.5% on deployed capital per ~25-day cycle.
- Run six of those continuously (~\$2,400 BP, 24% utilization), at a realistic ~75% win rate
  with a 2× credit stop, and expectancy lands near **10–15%/year net**.
- To reach 100% you must push buying-power utilization toward 70–80% and shorten duration.
  The same configuration that produces +100% in a benign vol year produces **-40% to -60% in
  a February 2018 or March 2020** event.

**So the defensible claim is:**

> Target **25–40% CAGR** with a hard **20% max drawdown** limit, fully mechanical and fully
> auditable. 100% is available as a documented high-aggression configuration whose
> probability-of-ruin we will show you on screen, and which we do not recommend.

A trading firm principal has heard "100% a year" from a hundred people. He has never heard
"here is my probability cone, here is my tail, here is my kill switch, and here is a
tamper-evident log you can audit line by line." **That** is what wins the business. The app in
`02-BUILD-PLAN.md` is built to deliver exactly that in under seven minutes.

---

## 2. Objective function and scoring

**Primary metric — Net Return on Starting Equity**

```
Return = (Ending NLV − 10,000) / 10,000
```

Net of all commissions, exchange/regulatory fees, assignment fees, and modeled slippage.
Mark-to-market daily at the 16:00 ET official close (NBBO mid for options).

**Hard constraint — Maximum Drawdown ≤ 20%**

```
DD(t) = (HighWaterMark(t) − NLV(t)) / HighWaterMark(t)
```

Measured on **daily closing NLV**. A close below 80% of the high-water mark is an immediate
forfeiture for that side. This is what stops the contest from selecting for the blow-up
trade, and it is the rule most worth insisting on.

**Co-primary — MAR ratio (return per unit of pain)**

```
MAR = CAGR / MaxDrawdown
```

Published alongside raw return. A side that returns 40% with an 8% drawdown (MAR 5.0) beat a
side that returned 55% with a 30% drawdown — and any trading principal knows it.

**Reported alongside (not scored, but published continuously):**

| Metric | Definition |
|---|---|
| Sortino ratio | Downside-deviation-adjusted return, rf = 3M T-bill |
| Premium capture rate | Realized P&L ÷ gross credit received |
| Win rate / profit factor | Gross wins ÷ gross losses |
| Avg days in trade (DIT) | Position-weighted |
| Return on buying power | P&L ÷ average BP deployed — the true efficiency number |
| Unintended assignment rate | Assignments not on the approved list ÷ total expirations |
| Tail ratio | Worst 5% of trade outcomes vs. best 5% |

**Benchmarks displayed on the same axis:** SPY total return, CBOE S&P 500 PutWrite Index
(PUT) or PUTW, and the client's own desk if he'll share a daily equity curve.

---

## 3. Account, capital, and legal structure

| Parameter | Setting | Rationale |
|---|---|---|
| Starting equity | \$10,000, both sides | As specified |
| Account type | Reg-T margin | Cash accounts can't trade spreads or use same-day proceeds |
| Options approval | **Level 3** — spreads, CSPs, covered calls | Level 4 (naked calls) is prohibited for both sides: undefined risk makes the contest unscoreable |
| Deposits | **None** after Day 1 | Adding capital masks drawdown; all profit compounds |
| Withdrawals | None during the term | Same reason |
| Term | 12 months, with 30 / 90 / 180-day public checkpoints | The 30-day checkpoint is the "instant proof"; the 12 months is the actual claim |
| PDT | Under \$25k, max 3 day trades per rolling 5 business days | Binds both sides. Strategy is designed at 7–45 DTE so this is never the limiting factor. Flag it to the client so it isn't a surprise. |
| Execution | Both sides on the same venue and fill model | See §8 |

---

## 4. Universe

A position may only be opened on an underlying that passes **all** of:

- **Liquidity:** underlying 20-day ADV ≥ 2,000,000 shares.
- **Option liquidity:** open interest ≥ 1,000 at the intended short strike; total chain OI ≥ 10,000.
- **Spread width:** option bid-ask ≤ the greater of \$0.05 or 5% of mid. Penny-quoted classes preferred.
- **Price band:** \$15–\$60 for any structure that could result in share ownership (keeps a
  single assignment under ~60% of equity). No band for defined-risk spreads.
- **Market cap:** ≥ \$5B, or a broad-market / sector ETF.
- **No binary events:** excluded — pre-revenue biotech, names with a scheduled FDA/PDUFA or
  court date inside the expiration cycle, names in an announced M&A deal.

**Core list (indicative):** SPY, QQQ, IWM, DIA, XLF, XLE, XLK, GLD, SLV, TLT, EEM, plus a
rotating watchlist of ~40 large-cap single names that clear the filters. The engine
recomputes eligibility nightly; the list is data, not opinion.

---

## 5. Permitted structures

| # | Structure | Max BP | Short-leg delta | DTE | Notes |
|---|---|---|---|---|---|
| 1 | Put credit spread | width − credit | 0.15–0.25 | 21–45 | **Primary engine.** Width ≤ \$5 |
| 2 | Call credit spread | width − credit | 0.12–0.20 | 21–45 | Only when IVR high and trend is not up |
| 3 | Iron condor (index ETFs only) | max side − credits | ≤ 0.18/side | 30–60 | Short strikes ≥ 1.5× expected move |
| 4 | Cash-secured put | strike × 100 − credit | 0.15–0.30 | 21–45 | **Approved-ownership names only** (§6) |
| 5 | Covered call | shares held | 0.20–0.30 | 14–35 | Post-assignment only; strike ≥ cost basis |
| 6 | Jade lizard | put side | put ≤ 0.25 | 30–45 | Credit **must exceed** call-spread width → zero upside risk |
| 7 | Poor-man's covered call | long LEAPS debit | long ≥ 0.75Δ | 90–365 long | Unlocked only above \$20k equity |

**Prohibited for both sides:** naked short calls; ratio spreads or backspreads with undefined
risk; short strangles without wings; any structure whose max loss cannot be computed at entry.

**0DTE:** capped at 2 positions per week, ≤ 3% of equity at risk each, defined-risk only.
Permitted but deliberately marginalized — 0DTE is a fee-generation machine that flatters win
rate and destroys tail statistics.

---

## 6. Assignment policy (the corrected "don't own the stock" rule)

The original rule bans an outcome. This version prices it.

**Principle:** never be assigned shares you would not want at that basis, and never let share
exposure crowd out the premium engine.

1. **Approved-ownership list.** CSPs may only be sold on underlyings pre-designated as
   "willing to own" — ETFs and profitable large caps that pass §4 and a fundamental screen.
   The list is published at the start of the term and frozen. Assignment on a list name is a
   planned outcome, not a failure.
2. **Assignment budget.** At most **one** assigned share position open at a time, and total
   share exposure ≤ **40% of equity**. Breaching the budget forces the next covered call to be
   struck at-the-money for a fast exit.
3. **Exit clock.** An assigned position must be exited within **two covered-call cycles
   (~60 days)**. If the second call expires and shares remain, sell the shares at market and
   book the loss. No indefinite bag-holding.
4. **Avoidance protocol** (this is the operational version of "don't own the stock"):
   - Never carry a short ITM option into expiration. Close or roll any short leg that is ITM
     with ≤ 2 DTE, unconditionally.
   - Roll untested short legs at **21 DTE** — gamma risk rises non-linearly inside three weeks.
   - Roll tested legs out (and down/up) **for a net credit only**. If no credit roll exists,
     close the position and take the loss. A debit roll is a loss you refused to book.
   - **Ex-dividend check:** any short call whose extrinsic value is less than the upcoming
     dividend is closed the day before the ex-date. This is the #1 cause of surprise early
     assignment and virtually every retail backtest ignores it.
5. **KPI, not a ban.** *Unintended assignment rate* (assignments outside the approved list, or
   in breach of the budget) is published. Target: **0%**. That is a far stronger claim than
   "we try not to own stock."

---

## 7. Entry, sizing, and management rules

These are the rules the engine encodes literally. Every one produces a pass/fail record on
every candidate trade, which is what makes the track record auditable.

### 7.1 Entry filters (all must pass)

| Rule | Threshold |
|---|---|
| **IV Rank** (252-day) | ≥ 25 — only sell premium when it's actually rich |
| **Variance risk premium** | IV30 − RV20 > 2 vol points |
| **Expected move** | Short strike outside 1.0× the cycle expected move (1.5× for condors) |
| **Earnings** | No cycle spanning an earnings date, unless flagged as an explicit vol-crush trade capped at 3% of equity |
| **Term structure** | No new short-vol entries when VIX9D > VIX (backwardation = stress regime) |
| **Trend filter** | Put spreads only when underlying > 200-day SMA, or IVR ≥ 50 |
| **Liquidity** | §4 filters re-checked at the decision timestamp, not from a stale snapshot |

### 7.2 Sizing and concentration

- Max loss per position ≤ **5% of current equity**.
- Max **6** concurrent positions.
- Max **50%** buying-power utilization (see §9 for how this tightens under stress).
- Minimum **35% cash buffer** at all times.
- ≤ **2** positions per GICS sector; ≤ **1** per underlying.
- Beta-weighted portfolio delta held between **−0.30 and +0.30 per \$1,000 of equity**
  (i.e. −3.0 to +3.0 SPY-equivalent deltas on a \$10k account). This is what stops a "premium"
  book from quietly becoming a leveraged long-equity bet.
- Net vega bounded such that a **+50% IV shock** costs ≤ 10% of equity.

### 7.3 Management

| Trigger | Action |
|---|---|
| Position reaches **50% of max credit** | Close (25% for ≤14 DTE structures) |
| **21 DTE** and untested | Roll to next cycle for a credit, or close |
| Short leg delta ≥ **0.45**, or underlying breaches short strike | Roll for credit; if unavailable, close |
| Loss reaches **2× credit received** | Hard stop, close immediately |
| Short leg ITM with **≤ 2 DTE** | Close or roll, unconditionally (§6.4) |
| Short call extrinsic < upcoming dividend | Close before ex-date |
| Assigned shares | Enter covered-call cycle; exit clock starts (§6.3) |

---

## 8. Fairness and execution protocol

For the result to mean anything to a professional, both sides must be measurable under
identical assumptions.

- **Same fill model.** If simulated: fills at NBBO mid **minus** a slippage haircut of the
  greater of \$0.02/contract or 25% of the quoted spread, on entry and exit. If live: actual
  fills, with a screenshot-level broker statement reconciliation monthly.
- **Same cost model.** \$0.65/contract commission each way, \$0.65 assignment/exercise fee,
  plus actual ORF/SEC/TAF regulatory fees. Applied to both sides even if one side's broker
  is cheaper.
- **Same clock.** Daily mark at 16:00 ET. Weekly reconciliation.
- **Pre-registration of trades.** Every trade is written to an **append-only, hash-chained
  log before the order is sent** — entry, structure, strikes, credit, rationale, and the full
  rule-evaluation trace. Each entry's hash includes the previous entry's hash; the chain head
  is published daily as a public git commit. This makes backfilling or editing a trade
  cryptographically detectable. The client can verify the entire history himself, without
  trusting us. See `02-BUILD-PLAN.md` §9.
- **No hindsight entries.** A trade absent from the log at the time of the fill does not count.
- **Data versioning.** Backtests record the data vendor, snapshot version, and rules version
  hash, so any published result is exactly reproducible.

---

## 9. Risk kill-switch ladder

A state machine on drawdown from high-water mark. The current state is displayed live on the
dashboard — showing a skeptical trader the *de-risking machinery* is worth more than showing
him the returns.

| State | Trigger | Max BP | Allowed structures | New positions |
|---|---|---|---|---|
| **NORMAL** | DD < 8% | 50% | All | Unrestricted |
| **CAUTION** | DD ≥ 8% | 35% | All | Max 2/week, half size |
| **DEFENSIVE** | DD ≥ 12% | 25% | Defined-risk only | Max 1/week, half size |
| **LOCKDOWN** | DD ≥ 16% | 10% | Close-only + covered calls on existing shares | None |
| **HALT** | DD ≥ 20% | 0% | Flat everything | Contest forfeited |

**Independent overlays** (apply at any state):

- **VIX > 35** → defensive sizing, defined-risk only, no new CSPs.
- **VIX term backwardation** (VIX9D > VIX) → no new short-premium entries.
- **Correlation spike** — trailing 20-day average pairwise correlation of open positions
  > 0.7 → treat the book as one position for sizing purposes.
- **Three consecutive stop-outs** → 5 trading-day cool-down, review, no new entries.

Every state transition writes a `risk_event` to the audit chain with the triggering values.

---

## 10. What each side must produce

| Deliverable | Frequency |
|---|---|
| Hash-chained trade log (pre-fill) | Every trade |
| Daily NLV, BP utilization, Greeks, kill-switch state | Daily, 16:00 ET |
| Broker statement reconciliation | Monthly |
| Full metric set (§2) | Continuous, on the live dashboard |
| Rule-trace for any trade on demand | On request, instantly |

---

## 11. Open items for the client

Five questions, each of which changes the build. Worth settling in the first meeting.

1. **Live capital or simulated?** Recommendation: run *both* — a live \$10k account for
   legitimacy, and a parallel simulated book on the same signals to prove the fill model is
   honest. Divergence between them is itself a credibility exhibit.
2. **Will his desk publish a daily equity curve?** Without it there's no head-to-head, only a
   benchmark comparison. If he won't, propose SPY + PUT index as the standing opponent.
3. **Term length.** 12 months is the real test; a 30-day sprint is the attention-getter.
   Recommendation: start the 12-month clock now, demo the 30-day checkpoint.
4. **Is the 20% drawdown DQ acceptable to both sides?** If his traders won't accept a risk
   constraint, that asymmetry is itself the argument.
5. **Compensation structure.** The moment you trade his capital or take a fee for advice, you
   are likely into Investment Advisers Act territory (and CTA/CPO rules if futures options
   are ever in scope). Get securities counsel before any arrangement beyond a demonstration
   trading your own \$10k. This is a one-line item now and a deal-killer later.

---

## 12. Rule change control

Rules are versioned in git. Any change to a threshold creates a new `rules_version` hash, is
committed publicly *before* it takes effect, and is annotated on the equity curve. Historical
results are never re-run under new rules and presented as the old track record.

This clause exists because it is the first thing a professional will test you on.
