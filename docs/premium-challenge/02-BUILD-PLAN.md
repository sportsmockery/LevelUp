# ThetaDesk — Web App Build Plan

**Working name:** ThetaDesk (placeholder)
**Route:** `/options` inside the existing LevelUp Next.js app
**Date:** 2026-09-20
**Companion doc:** `01-RULEBOOK.md` — the app is an executable implementation of that rulebook

---

## 1. What the app is for

One job: **convert a skeptical trading principal from "AI can't beat my traders" to "show me
the contract" in a single sitting.**

It is not a backtesting toy and not a trade-idea generator. It is a *proof instrument*. Three
claims, each with a screen that substantiates it:

| Claim | The screen that proves it |
|---|---|
| "The process is mechanical and auditable." | Rule-trace panel — every trade decomposed into the rules that fired, against the market snapshot at the decision timestamp |
| "We understand our tail, which is more than most desks can show you." | Scenario shocker + historical stress replay + probability cone |
| "The track record is real, not backfitted." | Hash-chained, pre-registered trade log anchored to public git commits |

Design everything against the seven-minute demo in §3. If a feature doesn't serve that demo or
the live track that follows it, it is out of scope for v1.

---

## 2. Why it belongs in this repo

`sportsmockery/LevelUp` already runs as a multi-tenant demo factory — `app/pafa`,
`app/sunvista`, `app/wod`, `app/windcreek`, `app/hs` are each independent client surfaces on
shared infrastructure. Adding `app/options` costs nothing and inherits:

- **Next.js 16 App Router + React 19** — server components for the heavy data reads
- **Tailwind 4 + shadcn/radix** — the dashboard chrome exists already
- **Recharts 3** — equity curves, cones, distributions
- **Supabase** (`@supabase/ssr`, migrations in `supabase/migrations/`) — Postgres + RLS + auth
- **Vercel deploy pipeline** with the `npm run build-deploy` safety protocol in `CLAUDE.md`
- **`python/`** — there is already a FastAPI-on-Colab pattern in this repo for GPU work. The
  same pattern serves the backtest engine, which is compute-heavy and belongs in Python.

Namespace every table `td_*` and every route under `/options` so it stays fully isolated from
the wrestling and dental systems.

---

## 3. The seven-minute demo (build to this)

This is the spec. Everything in §5–§12 exists to make these seven minutes possible.

| Time | Screen | What he sees | What it answers |
|---|---|---|---|
| **0:00** | **Live** | Equity curve from \$10,000, Day 1 to today, overlaid on SPY and the CBOE PUT index. Header badge: *"1,247 log entries · chain verified · anchored to commit `a3f9c21`, 2026-09-19 16:05 ET"* — clickable through to GitHub. | "Is this real or a screenshot?" |
| **1:00** | **Blotter → rule trace** | He picks *any* trade. Panel opens: the option chain as it was at that second, IV rank 41, VRP +3.2 vols, expected move ±\$4.10, short strike at 0.21Δ — and all 19 rules with pass/fail and the observed value beside each threshold. | "Is there a human guessing behind this?" |
| **2:30** | **Risk** | Beta-weighted net delta, net theta/vega, BP utilization, sector concentration, and the kill-switch ladder with the current rung lit. | "Do you know what you're carrying?" |
| **3:30** | **Scenario** | He drags the sliders: SPX −10% overnight, IV +80%. Instant repriced P&L per position, which kill switches trip, post-shock buying power. | **The question every principal actually asks.** |
| **4:30** | **Replay** | One click: Feb 2018. Mar 2020. Oct 2022. Apr 2025. Watch the system de-risk in real time against historical data — the ladder stepping down, positions closing. | "What happens when it goes wrong?" |
| **5:30** | **Probability** | Monte Carlo cone, forward 12 months. P(≥100%) = 6%. P(≥30%) = 47%. P(DD > 20%) = 18%. Then drag the aggression slider to the "100% target" configuration and watch P(ruin) climb. | "Can you actually do 100%?" — answered with a distribution instead of a promise |
| **6:30** | **Head-to-head** | Leaderboard: us, his desk, SPY, PUT index. Same axis, same cost model, same clock. | "So who's winning?" |

The 5:30 slide is the one that wins the room. It is the only honest answer to his 100%
question, and honesty from a machine that can also show its kill switch is a stronger pitch
than any return number.

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  BROWSER  — levelupwrestlingapp.com/options                         │
│  Next.js 16 RSC · Tailwind 4 · shadcn · Recharts 3                  │
└───────────────┬─────────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────────┐
│  NEXT.JS API ROUTES  app/api/options/*                              │
│  live · blotter · trace · risk · scenario · replay · mc · leaderboard│
└──────┬────────────────────────────────┬─────────────────────────────┘
       │                                │
┌──────▼───────────────────┐   ┌────────▼────────────────────────────┐
│ SUPABASE POSTGRES        │   │ QUANT SERVICE (Python / FastAPI)    │
│ td_* tables              │   │ backtest · monte carlo · pricing    │
│ RLS: public read on      │   │ scenario repricing · IV surface     │
│ published views only     │   │ Fly.io or Modal (see §13)           │
└──────▲───────────────────┘   └────────▲────────────────────────────┘
       │                                │
┌──────┴────────────────────────────────┴────────────────────────────┐
│  SCHEDULED JOBS  (Vercel Cron → API routes with service role)      │
│  09:25 ET universe refresh  ·  09:45 + 14:30 scan & enter          │
│  every 15m management sweep ·  16:05 mark, metrics, chain anchor    │
└──────▲──────────────────────────────────────────────────────────────┘
       │
┌──────┴──────────────────────────────────────────────────────────────┐
│  EXTERNAL  Polygon/ORATS (chains, IV) · Alpaca (paper exec)         │
│            GitHub (audit anchors) · FRED (rates)                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Split rationale:** TypeScript owns everything user-facing and all live trading orchestration
(it's where the repo's competence and the deploy pipeline are). Python owns the numerics —
Black-Scholes/Bjerksund-Stensland pricing, IV surfaces, the event-driven backtester, and Monte
Carlo — because `numpy`/`scipy`/`pandas` are the right tools and the backtest is CPU-bound in
a way that does not belong in a serverless function.

---

## 5. Data layer

The single biggest cost and correctness risk in the project. **Historical options data is
expensive, messy, and the place where almost every retail backtest silently lies.**

### 5.1 Vendor evaluation

*Prices are indicative as of writing — verify current tiers before committing.*

| Vendor | Strength | Weakness | Role |
|---|---|---|---|
| **ORATS** | Pre-computed IV rank/percentile, smoothed surfaces, clean EOD options history back ~2007. Built for exactly this. | Not tick-level. Subscription is mid-four-figures annually at the research tier. | **Recommended for backtest + IV metrics** |
| **ThetaData** | Tick-level historical NBBO options quotes; the highest-fidelity fill modeling available at an indie price point. | You compute IV/Greeks yourself. Large data volumes. | Recommended if fill realism is challenged |
| **Polygon.io** | Good live + recent-history options snapshots, Greeks/IV included, flat files for bulk, clean REST/WS. | Historical depth and IV-rank history weaker than ORATS. | **Recommended for live chains** |
| **CBOE DataShop** | Authoritative EOD, à-la-carte purchase. | Expensive per dataset, no API ergonomics. | Tie-breaker for disputed numbers |
| **Alpaca** | Free paper + live options trading API, OPRA data, modern REST. | Execution venue, not a research source. | **Recommended for paper execution** |
| **Tradier** | Free chains with a funded account; real brokerage. | Thin historical data. | Fallback live source |
| **IBKR / tastytrade** | Where real money should eventually trade. | Clunky APIs (IBKR), gateway session management. | Phase 6, live capital |

**Recommended stack:** ORATS (historical + IV metrics) → Polygon (live chains) → Alpaca (paper
execution) → IBKR or tastytrade (live capital, later). Start on the cheapest ORATS/Polygon
tier that covers the universe in §4 of the rulebook; the universe is ~50 names, not 5,000.

### 5.2 Ingestion jobs

| Job | Schedule (ET) | Writes |
|---|---|---|
| Universe refresh | 09:25 daily | `td_underlyings` — ADV, mcap, sector, earnings date, div/ex-date, eligibility flags |
| Chain snapshot | 09:45, 14:30, 16:05 | `td_chain_snapshots`, `td_contracts`, `td_quotes` |
| IV metrics | 16:10 | `td_iv_metrics` — IV30, IVR/IVP (252d), RV20, VRP, cycle expected move |
| Benchmarks | 16:15 | `td_benchmarks` — SPY TR, PUT/PUTW, VIX, VIX9D, 3M T-bill |
| Historical backfill | one-time + weekly | 10 years of EOD chains for the universe |

Snapshots are **immutable and versioned**. A backtest records the `data_version` it consumed
so any published number is reproducible byte-for-byte.

---

## 6. Data model

Supabase migration in `supabase/migrations/`, all tables prefixed `td_`.

```sql
-- Reference -----------------------------------------------------------
td_underlyings        (symbol PK, name, sector, adv_20d, market_cap,
                       next_earnings, next_ex_div, div_amount,
                       approved_for_ownership bool, eligible bool,
                       eligibility_trace jsonb, updated_at)

td_contracts          (id PK, occ_symbol UNIQUE, symbol, expiry, strike,
                       right char(1), multiplier)

-- Market data (immutable, versioned) ----------------------------------
td_chain_snapshots    (id PK, symbol, snapshot_ts, spot, source,
                       data_version)
td_quotes             (snapshot_id FK, contract_id FK, bid, ask, last,
                       volume, open_interest, iv, delta, gamma, theta, vega,
                       PRIMARY KEY (snapshot_id, contract_id))
td_iv_metrics         (symbol, date, iv30, iv_rank_252, iv_pct_252, rv20,
                       vrp, expected_move_cycle, PRIMARY KEY (symbol, date))
td_benchmarks         (date, symbol, close, total_return_index,
                       PRIMARY KEY (date, symbol))

-- Decisions and execution ---------------------------------------------
td_signals            (id PK, run_id, decided_at, symbol, structure,
                       legs jsonb, credit_target, max_loss, bp_required,
                       rule_trace jsonb,        -- every rule: passed/observed/threshold
                       rules_version, data_version,
                       status)                  -- proposed|rejected|submitted
td_orders             (id PK, signal_id FK, account_id, submitted_at,
                       broker_order_id, legs jsonb, limit_price, tif, status)
td_fills              (id PK, order_id FK, filled_at, leg_idx, qty, price,
                       commission, regulatory_fees)
td_positions          (id PK, account_id, symbol, structure, opened_at,
                       closed_at, credit_received, max_loss, bp_used,
                       realized_pnl, close_reason, assigned bool,
                       assignment_intended bool, status)
td_position_legs      (position_id FK, leg_idx, contract_id FK, qty,
                       open_price, close_price)

-- State and risk -------------------------------------------------------
td_equity_snapshots   (account_id, ts, nlv, cash, bp_used, bp_available,
                       net_delta_beta, net_theta, net_vega,
                       open_position_count, high_water_mark, drawdown,
                       killswitch_state, PRIMARY KEY (account_id, ts))
td_risk_events        (id PK, ts, account_id, level, rule_id,
                       observed jsonb, action_taken, killswitch_from,
                       killswitch_to)

-- Research -------------------------------------------------------------
td_backtest_runs      (id PK, config jsonb, rules_version, data_version,
                       period_start, period_end, seed, metrics jsonb,
                       is_out_of_sample bool, created_at)
td_mc_runs            (id PK, backtest_run_id FK, method, n_paths,
                       horizon_days, results jsonb)

-- Audit ----------------------------------------------------------------
td_audit_log          (seq BIGSERIAL PK, ts, event_type, payload jsonb,
                       payload_hash, prev_hash, chain_hash)
td_anchors            (id PK, anchored_at, chain_seq, chain_hash,
                       git_commit_sha, note)

-- Competition ----------------------------------------------------------
td_accounts           (id PK, label, kind)   -- live|simulated|competitor|benchmark
td_competitor_equity  (account_id FK, date, nlv, source_note,
                       PRIMARY KEY (account_id, date))
```

**RLS:** service role writes everything. Public read is granted only on published views
(`td_v_public_equity`, `td_v_public_blotter`, `td_v_public_trace`) so the demo link can be
shared without auth, while raw tables stay locked.

---

## 7. Strategy engine

The design decision that carries the whole pitch: **rules are first-class data objects, and
every evaluation is persisted.**

```ts
type Rule = {
  id: string                    // 'entry.iv_rank_min'
  version: string
  scope: 'universe' | 'entry' | 'sizing' | 'management' | 'risk'
  params: Record<string, number | string>
  evaluate(ctx: DecisionContext): RuleResult
}

type RuleResult = {
  ruleId: string
  passed: boolean
  observed: number | string     // 41.2
  threshold: number | string    // '>= 25'
  note?: string
}
```

A candidate trade runs the full rule set and produces a `rule_trace: RuleResult[]`, persisted
on `td_signals` **whether or not the trade is taken**. Rejected candidates are as much a part
of the proof as accepted ones — showing a principal the 340 trades the system *declined* last
month, each with a reason, is more convincing than showing him the 22 it took.

**Rule set v1** implements rulebook §4 (7 universe rules), §7.1 (7 entry rules), §7.2
(6 sizing rules), §7.3 (7 management rules), §9 (4 risk overlays + 5 ladder states). `rules_version`
is the SHA of the serialized rule set; it is stamped on every signal and annotated on the
equity curve whenever it changes.

**Decision loop** (runs on the cron schedule in §4):

```
universe eligible? → IV/VRP rich enough? → structure selection →
strike selection from live chain → sizing & concentration check →
portfolio-level check (delta, vega, BP, kill-switch state) →
write signal + full trace → submit order → write order/fill
```

Management runs on its own sweep: profit target, 21-DTE roll, delta breach, stop, ITM-near-expiry,
ex-dividend check.

---

## 8. Backtest engine

Python, event-driven, in `python/options/`. Credibility lives or dies here.

**Loop:** for each trading day → load immutable chain snapshot → mark open positions at NBBO →
run management rules → run entry rules → apply fills → update BP and equity → evaluate
kill-switch ladder → record.

**Correctness requirements.** Each of these is a place where a naive backtest overstates
returns, and each is a question a professional will ask:

| # | Requirement | Naive failure |
|---|---|---|
| 1 | Quotes read at the **decision timestamp**, fills applied on the next tradeable price | Look-ahead: deciding on close, filling at close |
| 2 | Fill = mid − max(\$0.02, 25% of spread), both directions | Filling at mid, which nobody gets |
| 3 | Full cost model: \$0.65/contract each way + assignment + ORF/SEC/TAF | Ignoring fees — fatal on a \$10k, high-turnover book |
| 4 | **Early assignment model:** short call with extrinsic < dividend on the day before ex-date → assigned. Deep-ITM short put with ~zero extrinsic → assignment risk | Assuming European exercise on American options |
| 5 | Expiration: ITM by ≥ \$0.01 → auto-exercised | Assuming worthless expiry |
| 6 | **Reg-T BP** computed correctly per structure, recomputed daily | Ignoring buying power = infinite leverage |
| 7 | PDT rule under \$25k | Simulating day trades that can't legally happen |
| 8 | Delisted/acquired underlyings included | Survivorship bias |
| 9 | Liquidity gate at the historical bid-ask, not today's | Backtesting fills in markets that weren't there |
| 10 | Hard-coded seed; run is reproducible from `(config, rules_version, data_version, seed)` | Unreproducible results |

**Validation before any result is shown to anyone:**

- Reproduce a published benchmark — the CBOE PUT index methodology — within tracking error.
  If the engine can't replicate a public index, it can't be trusted on a private strategy.
- Reconcile the simulated book against the live Alpaca paper book daily once Phase 5 runs.
  Publish the divergence. A visible, small, stable divergence is a credibility asset.

---

## 9. Anti-overfitting protocol

The section a quant will turn to first. Write it down *before* running anything.

1. **Pre-registration.** The rule set is committed to git and hashed before the out-of-sample
   period is touched. The commit timestamp is the proof.
2. **Data split.**
   - In-sample (design): 2015-01-01 → 2020-12-31
   - Out-of-sample (single evaluation): 2021-01-01 → 2023-12-31
   - Holdout / walk-forward: 2024-01-01 → present, rolling
3. **Parameter sensitivity.** Publish a heat map over the key parameters (short delta, DTE,
   profit target, stop multiple). If performance is a needle at Δ=0.22 and collapses at 0.18
   and 0.26, it's noise and the rule gets widened or dropped. **A plateau is the claim, not a peak.**
4. **Multiple-testing disclosure.** Report the number of configurations tested and a deflated
   Sharpe ratio. Volunteering this is disarming; being caught omitting it is fatal.
5. **Regime slices, reported individually, not averaged:** 2018 Q1 volmageddon, Mar 2020,
   2022 bear, 2023–24 low-vol melt-up, Apr 2025 vol shock.
6. **Bootstrap confidence intervals** on CAGR, max DD, and MAR — block bootstrap to preserve
   autocorrelation.
7. **Negative controls.** Run the engine with the edge deliberately removed (random strike
   selection, IV-rank filter disabled). If the neutered version performs similarly, the
   "edge" was beta.

---

## 10. Monte Carlo / probability engine

Feeds the 5:30 slide.

- **Method:** block bootstrap of historical trade outcomes (preserving clustering), plus a
  regime-switching resample so drawdown clusters aren't destroyed. 10,000 paths, 12-month
  horizon, compounding at the rulebook's sizing.
- **Outputs:** fan chart (5/25/50/75/95 percentile equity cones); P(return ≥ X) for
  X ∈ {0, 10%, 30%, 50%, 100%}; P(max DD > 20%) — i.e. P(forfeiture); expected and 95th-percentile
  max drawdown; time-to-recovery distribution.
- **Aggression slider.** Re-parameterizes BP utilization, short-strike delta, and DTE, and
  re-runs (cached grid, so it feels instant). Sliding to the configuration whose *median*
  outcome is +100% shows P(DD > 20%) jumping to something like 55–70%. **That interaction is
  the most persuasive object in the entire app** — it answers his headline question with an
  honest distribution instead of a promise, which is precisely the behavior he does not expect
  from a vendor.

---

## 11. Live paper execution

- **Broker:** Alpaca paper account (free, real options API, modern REST) for Phase 5;
  IBKR or tastytrade if/when real capital goes on.
- **Orchestration:** Vercel Cron → `app/api/options/cron/*` with a service-role secret and an
  idempotency key per (date, job) so a retry can't double-submit.
- **Order handling:** multi-leg orders as a single combo where the broker supports it, limit
  at mid, three price-improvement steps toward the natural over 90 seconds, then cancel. Never
  market orders on options.
- **Reconciliation:** 16:05 ET pull of broker positions/fills, diffed against `td_positions`.
  Any mismatch raises a `td_risk_events` row and surfaces on the dashboard — visible operational
  discipline, not a hidden error log.
- **Safety:** hard caps enforced server-side and independently of the strategy engine —
  max contracts per order, max orders per day, max BP. The kill-switch ladder is evaluated
  before *every* submission, not just on a schedule.

---

## 12. Verifiable track record

The mechanism that turns "trust us" into "verify us," and the reason to build this in a git
repo at all.

```
entry_hash = SHA256(prev_hash ‖ canonical_json(payload))
```

- Every signal, order, fill, position change, risk event, and daily mark is appended to
  `td_audit_log` with `prev_hash` / `chain_hash`.
- **Trades are written before the order is submitted.** Backfilling a winner or deleting a
  loser breaks the chain from that point forward, detectably.
- **Daily anchor, 16:05 ET:** the chain head hash is written to `audit/anchors/YYYY-MM-DD.json`
  and committed to this public repo. GitHub's commit timestamp is a third-party witness we
  don't control. Cost: zero. Persuasive power on a skeptical audience: very high.
- **Public verifier:** `/options/verify` re-walks the entire chain in the browser from the public
  view and shows a green/red result per anchor. He can run it himself, on his own machine,
  without an account.

---

## 13. Delivery plan

Assumes one focused developer with agent assistance. Demo-ready in four weeks.

| Phase | Window | Deliverable | Done when |
|---|---|---|---|
| **0 — Decisions** | Sep 21–23 | Vendor accounts, rulebook signed off, `app/options` scaffold, `td_*` migration | Migration applied; empty dashboard deploys |
| **1 — Data** | Sep 24–30 | Ingestion jobs, 10-year backfill for the universe, IV metrics pipeline | IV rank for any universe name on any historical date, in one query |
| **2 — Backtest** | Oct 1–7 | Event-driven engine with all 10 correctness requirements (§8) | PUT-index replication within tolerance |
| **3 — Strategy + validation** | Oct 8–14 | Rule engine with persisted traces; §9 protocol executed end to end | OOS results produced exactly once, sensitivity heat maps published |
| **4 — UI + demo mode** | Oct 15–21 | All seven demo screens; scenario shocker; replay; probability cone | **Seven-minute demo runs clean, twice, with no operator narration needed** |
| **5 — Live paper** | Oct 22 – Nov 4 | Alpaca paper trading, cron automation, hash chain + git anchors, verifier page | Three consecutive days of automated trading reconciled with zero manual intervention |
| **6 — The track** | Nov 3 onward | Day 1 of the 12-month challenge | 30 / 90 / 180 / 365-day checkpoints published |

**Critical path:** data quality (Phase 1) → backtest correctness (Phase 2). Everything else can
be parallelized or cut. If Phase 1 slips, the demo slips — do not compress it.

**First client contact:** the Oct 21 demo. **Second:** the 30-day live checkpoint in early
December, which converts the demo from a simulation into a track record.

---

## 14. Cost and operations

*Verify current pricing before committing — these are indicative.*

| Item | Monthly | Notes |
|---|---|---|
| Historical options data (ORATS or ThetaData) | \$100–\$400 | Largest line item; scale by universe size |
| Live chains (Polygon) | \$30–\$200 | Delayed tier is fine for a 21–45 DTE strategy |
| Quant service (Fly.io / Modal) | \$20–\$50 | Scale-to-zero; backtests are bursty |
| Vercel Pro | \$20 | Already paid for |
| Supabase Pro | \$25 | Already paid for |
| Alpaca paper | \$0 | |
| **Total incremental** | **~\$170–\$670/mo** | |

Plus \$10,000 of at-risk trading capital if the live track is funded with real money.

**Ops:** Vercel cron failures and reconciliation mismatches page via the existing alerting.
All deploys go through `npm run build-deploy` per `CLAUDE.md` — no exceptions, no `--force`.

---

## 15. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Historical options data cost or quality** | High — it's the foundation | Budget for a real vendor. Do not scrape. Validate against a second source on a sample. |
| **Backtest overstates returns** | Fatal to credibility | The 10 requirements in §8 plus PUT-index replication plus live-vs-sim reconciliation |
| **Overfitting** | Fatal | §9, pre-registered and published |
| **The strategy genuinely underperforms in the live window** | Medium | The honest framing in rulebook §1 is the hedge: the pitch is the *process and risk control*, not a return promise. A disciplined −5% with a working kill switch still beats a lucky +40% from a black box, to this audience. |
| **Vol regime is unfavorable at launch** | Medium | The engine simply sits in cash when IVR < 25. "We didn't trade because premium was cheap" is a defensible, on-screen answer. |
| **Regulatory** | High if ignored | Rulebook §11.5 — counsel before any arrangement beyond demonstrating with your own capital |
| **Client dismisses it as a backtest** | High | This is exactly why Phase 5 and §12 exist. Lead with the live chain-anchored track, not the backtest. |

---

## 16. What "winning" looks like

Not a return number. Three outcomes, in order of how much they matter:

1. He asks a question the app can answer *live, on screen, in the meeting* — a specific trade,
   a specific date, a specific shock. That's the moment the conversation stops being about
   whether AI can trade.
2. He sends the `/options/verify` link to someone on his desk to try to break.
3. He proposes terms.

---

## 17. Immediate next steps

1. Settle rulebook §11 items 1–4 with the client (live vs. simulated, whether his desk
   publishes a curve, term length, drawdown DQ).
2. Open ORATS/Polygon trial accounts and pull a one-week sample for five universe names —
   validate field coverage before committing to a tier.
3. Scaffold `app/options` + the `td_*` migration and deploy an empty shell, so the URL exists
   from day one.
4. Build Phase 1. Do not skip ahead to the UI; the UI is a week of work on top of correct data
   and worthless on top of bad data.
