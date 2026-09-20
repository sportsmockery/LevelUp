-- ThetaDesk — systematic options premium desk
-- Phase 0 schema. See docs/premium-challenge/02-BUILD-PLAN.md §6.
--
-- All objects are prefixed td_ and are fully isolated from the wrestling
-- and Healthy Start systems in this database.
--
-- Access model: the strategy engine and cron jobs write with the service
-- role (which bypasses RLS). Every base table has RLS enabled with no
-- permissive policy, so anon/authenticated cannot read them directly.
-- Public read is granted ONLY on the td_v_public_* views at the bottom of
-- this file, which deliberately run with definer rights so a shared demo
-- link needs no account.

-- =========================================================================
-- 1. Accounts — the competing books, benchmarks, and the opposing desk
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('live', 'simulated', 'competitor', 'benchmark')),
  starting_nlv  numeric(14,2) NOT NULL DEFAULT 10000.00,
  started_on    date,
  is_public     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE td_accounts IS 'One row per tracked book. live/simulated are ours; competitor is the client desk; benchmark is SPY/PUT.';

-- =========================================================================
-- 2. Reference data — universe and contracts
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_underlyings (
  symbol                 text PRIMARY KEY,
  name                   text,
  sector                 text,
  adv_20d                bigint,
  market_cap             bigint,
  next_earnings          date,
  next_ex_div            date,
  div_amount             numeric(10,4),
  -- Rulebook §6.1: CSPs may only be sold on names we are willing to own.
  approved_for_ownership boolean NOT NULL DEFAULT false,
  eligible               boolean NOT NULL DEFAULT false,
  -- Per-rule pass/fail for eligibility, so "why isn't X tradeable today" is answerable.
  eligibility_trace      jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS td_underlyings_eligible_idx ON td_underlyings (eligible) WHERE eligible;

CREATE TABLE IF NOT EXISTS td_contracts (
  id          bigserial PRIMARY KEY,
  occ_symbol  text NOT NULL UNIQUE,
  symbol      text NOT NULL REFERENCES td_underlyings(symbol) ON DELETE CASCADE,
  expiry      date NOT NULL,
  strike      numeric(12,4) NOT NULL,
  right       char(1) NOT NULL CHECK (right IN ('C', 'P')),
  multiplier  integer NOT NULL DEFAULT 100
);

CREATE INDEX IF NOT EXISTS td_contracts_lookup_idx ON td_contracts (symbol, expiry, strike, right);

-- =========================================================================
-- 3. Market data — immutable and versioned
--    A backtest records the data_version it consumed so any published
--    number is reproducible. Snapshots are never updated in place.
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_chain_snapshots (
  id            bigserial PRIMARY KEY,
  symbol        text NOT NULL REFERENCES td_underlyings(symbol) ON DELETE CASCADE,
  snapshot_ts   timestamptz NOT NULL,
  spot          numeric(12,4) NOT NULL,
  source        text NOT NULL,
  data_version  text NOT NULL,
  UNIQUE (symbol, snapshot_ts, data_version)
);

CREATE INDEX IF NOT EXISTS td_chain_snapshots_ts_idx ON td_chain_snapshots (snapshot_ts DESC);

CREATE TABLE IF NOT EXISTS td_quotes (
  snapshot_id    bigint NOT NULL REFERENCES td_chain_snapshots(id) ON DELETE CASCADE,
  contract_id    bigint NOT NULL REFERENCES td_contracts(id) ON DELETE CASCADE,
  bid            numeric(12,4),
  ask            numeric(12,4),
  last           numeric(12,4),
  volume         bigint,
  open_interest  bigint,
  iv             numeric(10,6),
  delta          numeric(10,6),
  gamma          numeric(12,8),
  theta          numeric(12,6),
  vega           numeric(12,6),
  PRIMARY KEY (snapshot_id, contract_id)
);

CREATE TABLE IF NOT EXISTS td_iv_metrics (
  symbol               text NOT NULL REFERENCES td_underlyings(symbol) ON DELETE CASCADE,
  date                 date NOT NULL,
  iv30                 numeric(10,6),
  iv_rank_252          numeric(6,2),   -- rulebook §7.1: entry requires >= 25
  iv_pct_252           numeric(6,2),
  rv20                 numeric(10,6),
  vrp                  numeric(10,6),  -- iv30 - rv20; entry requires > 2 vol points
  expected_move_cycle  numeric(12,4),
  PRIMARY KEY (symbol, date)
);

CREATE TABLE IF NOT EXISTS td_benchmarks (
  date                 date NOT NULL,
  symbol               text NOT NULL,   -- SPY, PUT, PUTW, VIX, VIX9D, DGS3MO
  close                numeric(14,6),
  total_return_index   numeric(14,6),
  PRIMARY KEY (date, symbol)
);

-- =========================================================================
-- 4. Rule versioning — rules live in git; this table annotates the curve
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_rules_versions (
  rules_version  text PRIMARY KEY,       -- sha of the serialized rule set
  effective_from timestamptz NOT NULL,
  git_commit_sha text,
  summary        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE td_rules_versions IS 'Rulebook §12: threshold changes are committed publicly BEFORE taking effect and annotated on the equity curve.';

-- =========================================================================
-- 5. Decisions — every candidate, taken or rejected
--    rule_trace is the heart of the audit story: it records every rule
--    evaluation with observed value and threshold, for rejects too.
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_signals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id     uuid NOT NULL REFERENCES td_accounts(id) ON DELETE CASCADE,
  run_id         uuid NOT NULL,
  decided_at     timestamptz NOT NULL,
  symbol         text NOT NULL REFERENCES td_underlyings(symbol),
  structure      text NOT NULL CHECK (structure IN (
                   'put_credit_spread', 'call_credit_spread', 'iron_condor',
                   'cash_secured_put', 'covered_call', 'jade_lizard', 'pmcc')),
  legs           jsonb NOT NULL,
  credit_target  numeric(12,4),
  max_loss       numeric(12,2),
  bp_required    numeric(12,2),
  rule_trace     jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules_version  text REFERENCES td_rules_versions(rules_version),
  data_version   text,
  status         text NOT NULL CHECK (status IN ('proposed', 'rejected', 'submitted')),
  reject_reason  text,   -- the first rule_id that failed
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS td_signals_account_time_idx ON td_signals (account_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS td_signals_status_idx ON td_signals (status);

-- =========================================================================
-- 6. Execution
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id        uuid REFERENCES td_signals(id) ON DELETE SET NULL,
  account_id       uuid NOT NULL REFERENCES td_accounts(id) ON DELETE CASCADE,
  submitted_at     timestamptz NOT NULL,
  broker_order_id  text,
  intent           text NOT NULL CHECK (intent IN ('open', 'close', 'roll', 'assignment_exit')),
  legs             jsonb NOT NULL,
  limit_price      numeric(12,4),
  tif              text NOT NULL DEFAULT 'day',
  status           text NOT NULL CHECK (status IN ('pending', 'filled', 'partial', 'cancelled', 'rejected')),
  -- Guards a cron retry from double-submitting the same order.
  idempotency_key  text UNIQUE
);

CREATE TABLE IF NOT EXISTS td_fills (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES td_orders(id) ON DELETE CASCADE,
  filled_at         timestamptz NOT NULL,
  leg_idx           integer NOT NULL,
  contract_id       bigint REFERENCES td_contracts(id),
  qty               integer NOT NULL,
  price             numeric(12,4) NOT NULL,
  commission        numeric(10,4) NOT NULL DEFAULT 0,
  regulatory_fees   numeric(10,4) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS td_positions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES td_accounts(id) ON DELETE CASCADE,
  signal_id             uuid REFERENCES td_signals(id) ON DELETE SET NULL,
  symbol                text NOT NULL REFERENCES td_underlyings(symbol),
  structure             text NOT NULL,
  opened_at             timestamptz NOT NULL,
  closed_at             timestamptz,
  credit_received       numeric(12,2),
  max_loss              numeric(12,2),
  bp_used               numeric(12,2),
  realized_pnl          numeric(12,2),
  close_reason          text CHECK (close_reason IN (
                          'profit_target', 'stop_loss', 'roll_21dte', 'delta_breach',
                          'itm_near_expiry', 'ex_div_risk', 'expired', 'assigned',
                          'killswitch', 'manual')),
  assigned              boolean NOT NULL DEFAULT false,
  -- Rulebook §6.5: assignment on an approved name is planned; anything else
  -- counts against the published unintended-assignment rate.
  assignment_intended   boolean,
  status                text NOT NULL CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS td_positions_account_status_idx ON td_positions (account_id, status);
CREATE INDEX IF NOT EXISTS td_positions_opened_idx ON td_positions (opened_at DESC);

CREATE TABLE IF NOT EXISTS td_position_legs (
  position_id  uuid NOT NULL REFERENCES td_positions(id) ON DELETE CASCADE,
  leg_idx      integer NOT NULL,
  contract_id  bigint NOT NULL REFERENCES td_contracts(id),
  qty          integer NOT NULL,
  open_price   numeric(12,4),
  close_price  numeric(12,4),
  PRIMARY KEY (position_id, leg_idx)
);

-- =========================================================================
-- 7. Portfolio state and risk
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_equity_snapshots (
  account_id           uuid NOT NULL REFERENCES td_accounts(id) ON DELETE CASCADE,
  ts                   timestamptz NOT NULL,
  nlv                  numeric(14,2) NOT NULL,
  cash                 numeric(14,2),
  bp_used              numeric(14,2),
  bp_available         numeric(14,2),
  net_delta_beta       numeric(12,4),   -- SPY-beta-weighted, rulebook §7.2
  net_theta            numeric(12,4),
  net_vega             numeric(12,4),
  open_position_count  integer NOT NULL DEFAULT 0,
  high_water_mark      numeric(14,2) NOT NULL,
  drawdown             numeric(8,5) NOT NULL DEFAULT 0,
  killswitch_state     text NOT NULL DEFAULT 'NORMAL'
                         CHECK (killswitch_state IN ('NORMAL','CAUTION','DEFENSIVE','LOCKDOWN','HALT')),
  PRIMARY KEY (account_id, ts)
);

CREATE TABLE IF NOT EXISTS td_risk_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES td_accounts(id) ON DELETE CASCADE,
  ts                timestamptz NOT NULL,
  level             text NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
  rule_id           text NOT NULL,
  observed          jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_taken      text,
  killswitch_from   text,
  killswitch_to     text
);

CREATE INDEX IF NOT EXISTS td_risk_events_time_idx ON td_risk_events (ts DESC);

-- =========================================================================
-- 8. Research — backtests and Monte Carlo
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_backtest_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config             jsonb NOT NULL,
  rules_version      text REFERENCES td_rules_versions(rules_version),
  data_version       text NOT NULL,
  period_start       date NOT NULL,
  period_end         date NOT NULL,
  seed               bigint NOT NULL,
  metrics            jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Build plan §9: the out-of-sample window is evaluated exactly once.
  is_out_of_sample   boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS td_mc_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_run_id   uuid REFERENCES td_backtest_runs(id) ON DELETE CASCADE,
  method            text NOT NULL,
  n_paths           integer NOT NULL,
  horizon_days      integer NOT NULL,
  results           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- 9. Audit chain — the tamper-evidence mechanism
--    chain_hash = sha256(prev_hash || canonical_json(payload)).
--    Entries are append-only: no UPDATE or DELETE grant is ever issued,
--    and the trigger below refuses both even for the table owner.
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_audit_log (
  seq           bigserial PRIMARY KEY,
  ts            timestamptz NOT NULL DEFAULT now(),
  account_id    uuid REFERENCES td_accounts(id) ON DELETE SET NULL,
  event_type    text NOT NULL,
  payload       jsonb NOT NULL,
  payload_hash  text NOT NULL,
  prev_hash     text NOT NULL,
  chain_hash    text NOT NULL UNIQUE
);

CREATE OR REPLACE FUNCTION td_audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'td_audit_log is append-only (attempted %)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS td_audit_log_no_mutate ON td_audit_log;
CREATE TRIGGER td_audit_log_no_mutate
  BEFORE UPDATE OR DELETE ON td_audit_log
  FOR EACH ROW EXECUTE FUNCTION td_audit_log_append_only();

CREATE TABLE IF NOT EXISTS td_anchors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anchored_at     timestamptz NOT NULL,
  chain_seq       bigint NOT NULL,
  chain_hash      text NOT NULL,
  git_commit_sha  text,
  note            text
);

COMMENT ON TABLE td_anchors IS 'Daily chain head committed to the public repo; GitHub''s commit timestamp is the third-party witness.';

-- =========================================================================
-- 10. Competition tracking
-- =========================================================================
CREATE TABLE IF NOT EXISTS td_competitor_equity (
  account_id   uuid NOT NULL REFERENCES td_accounts(id) ON DELETE CASCADE,
  date         date NOT NULL,
  nlv          numeric(14,2) NOT NULL,
  source_note  text,
  PRIMARY KEY (account_id, date)
);

-- =========================================================================
-- 11. RLS — lock every base table; service role bypasses this entirely.
-- =========================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'td_accounts','td_underlyings','td_contracts','td_chain_snapshots','td_quotes',
    'td_iv_metrics','td_benchmarks','td_rules_versions','td_signals','td_orders',
    'td_fills','td_positions','td_position_legs','td_equity_snapshots','td_risk_events',
    'td_backtest_runs','td_mc_runs','td_audit_log','td_anchors','td_competitor_equity'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', t);
  END LOOP;
END;
$$;

-- No permissive policies are created: with RLS on and no policy, anon and
-- authenticated read nothing. All reads for the demo go through the views below.

-- =========================================================================
-- 12. Public read surface
--     These views intentionally run with definer rights (the default) so a
--     shared demo link works without an account. They expose only published
--     accounts and only non-sensitive columns — no broker order ids, no
--     idempotency keys, no account internals.
-- =========================================================================

CREATE OR REPLACE VIEW td_v_public_equity AS
SELECT
  a.id   AS account_id,
  a.label,
  a.kind,
  e.ts,
  e.nlv,
  e.high_water_mark,
  e.drawdown,
  e.killswitch_state,
  e.bp_used,
  e.net_delta_beta,
  e.open_position_count
FROM td_equity_snapshots e
JOIN td_accounts a ON a.id = e.account_id
WHERE a.is_public;

CREATE OR REPLACE VIEW td_v_public_blotter AS
SELECT
  p.id,
  p.account_id,
  p.symbol,
  p.structure,
  p.opened_at,
  p.closed_at,
  p.credit_received,
  p.max_loss,
  p.bp_used,
  p.realized_pnl,
  p.close_reason,
  p.assigned,
  p.assignment_intended,
  p.status,
  p.signal_id
FROM td_positions p
JOIN td_accounts a ON a.id = p.account_id
WHERE a.is_public;

CREATE OR REPLACE VIEW td_v_public_trace AS
SELECT
  s.id,
  s.account_id,
  s.decided_at,
  s.symbol,
  s.structure,
  s.legs,
  s.credit_target,
  s.max_loss,
  s.bp_required,
  s.rule_trace,
  s.rules_version,
  s.data_version,
  s.status,
  s.reject_reason
FROM td_signals s
JOIN td_accounts a ON a.id = s.account_id
WHERE a.is_public;

CREATE OR REPLACE VIEW td_v_public_anchors AS
SELECT anchored_at, chain_seq, chain_hash, git_commit_sha, note
FROM td_anchors;

GRANT SELECT ON td_v_public_equity, td_v_public_blotter,
               td_v_public_trace, td_v_public_anchors
          TO anon, authenticated;

-- =========================================================================
-- 13. Seed the benchmark and book rows
-- =========================================================================
INSERT INTO td_accounts (label, kind, starting_nlv, is_public)
SELECT v.label, v.kind, v.nlv, v.pub
FROM (VALUES
  ('ThetaDesk — Live',      'live',       10000.00, true),
  ('ThetaDesk — Simulated', 'simulated',  10000.00, true),
  ('SPY Total Return',      'benchmark',  10000.00, true),
  ('CBOE PutWrite (PUT)',   'benchmark',  10000.00, true)
) AS v(label, kind, nlv, pub)
WHERE NOT EXISTS (SELECT 1 FROM td_accounts WHERE td_accounts.label = v.label);
