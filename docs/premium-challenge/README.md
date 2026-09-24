# The Premium Challenge

Optimized rules and a build plan for a web app that demonstrates systematic options premium
selling against a professional trading desk.

| Doc | Contents |
|---|---|
| [`01-RULEBOOK.md`](./01-RULEBOOK.md) | The client's informal rules, corrected — objective function, account spec, universe, permitted structures, assignment policy, entry/sizing/management rules, fairness protocol, kill-switch ladder |
| [`02-BUILD-PLAN.md`](./02-BUILD-PLAN.md) | ThetaDesk — the seven-minute demo spec, architecture, data vendors, schema, strategy engine, backtest correctness, anti-overfitting protocol, delivery phases, costs, risks |

---

## The short version

**The rules as given select for a blow-up.** "Highest return in premiums" with no risk term is
maximized by naked short options at maximum size — a strategy that wins eleven months out of
twelve. Four corrections make the contest meaningful, and winnable by discipline rather than
by leverage:

1. **Score net return under a hard 20% drawdown cap**, with MAR ratio (return per unit of
   drawdown) as a published co-metric.
2. **Replace "don't own the stock" with an assignment budget** — an approved-ownership list,
   one assigned position at a time, a 60-day exit clock, and *unintended assignment rate* as a
   tracked KPI targeting zero. That's a stronger claim than a ban, and it stops the rule from
   forcing you to roll losers forever.
3. **Specify the account**: Reg-T margin, options level 3, no naked calls either side, and a
   structure set actually sized for \$10,000 (defined-risk spreads as the engine, CSPs only on
   the ownership list). Note the PDT rule below \$25k up front.
4. **Price the 100% target instead of promising it.**

## On the 100% goal

Say this to the client plainly. Mechanical premium selling harvests the variance risk premium —
a real, documented, capacity-constrained edge. It is not a 100%/year edge at controlled risk.
On \$10,000, a cash-secured put book maxes out near 8–15%/year because each position ties up
the full strike notional. Defined-risk spreads do better, but not dramatically: a 50%-of-credit
profit target against a 2× credit stop makes a winner a quarter the size of a loser, so the
strategy needs an **80% win rate just to break even**. Reaching 100% requires pushing
buying-power utilization to 70–80% — and the identical configuration that returns +100% in a
calm year returns −40% to −60% through a February 2018 or March 2020.

So the claim is **10–18% CAGR, fully mechanical, fully auditable, with a hard 20% drawdown
limit** — and 100% shown on screen as a high-aggression configuration with its
probability-of-ruin attached. For reference, the CBOE PutWrite index returns high single digits;
entry filters that sell only when premium is rich should beat it by single-digit points, which
is what a real edge in this trade looks like.

At \$10,000 the strategy is capital-constrained rather than skill-constrained — 15% of \$10,000
is \$1,500. **The challenge is a process demonstration, not an earnings demonstration**, and the
process is what scales to \$250k or \$1M with the same drawdown profile. Say that explicitly
rather than letting him reach it himself.

A trading principal has heard "100% a year" from a hundred people. He has never heard "here is
my probability cone, here is my tail, here is my kill switch, and here is a tamper-evident log
you can audit line by line." That is the pitch.

## What the app does

Three claims, three screens:

- **The process is mechanical** — click any trade, see all 19 rules with pass/fail and the
  observed value beside each threshold, against the option chain as it stood at that second.
  Including the trades the system *declined*.
- **We know our tail** — drag SPX to −10% and IV to +80% and watch the book reprice and the
  kill switches trip. Replay Feb 2018, Mar 2020, Oct 2022 and watch it de-risk.
- **The record is real** — every trade hash-chained and written *before* the order is sent,
  with the chain head committed daily to public git. A `/options/verify` page lets him check the
  whole history himself without an account.

Built as `app/options` in this repo, reusing the existing Next.js 16 / Supabase / Recharts stack
and the `python/` FastAPI pattern for the backtest engine. **Demo-ready in four weeks.**
