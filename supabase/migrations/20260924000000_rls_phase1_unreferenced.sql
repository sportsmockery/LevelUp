-- RLS remediation, phase 1 — tables with no application code path
--
-- Context: Supabase's security advisor flags 46 public tables with RLS
-- disabled. They are reachable by the `anon` role, and since
-- NEXT_PUBLIC_SUPABASE_ANON_KEY ships in the browser bundle by design,
-- anyone can currently read and write every row in them.
--
-- The naive fix — enabling RLS on all 46 — would take the app down. An audit
-- of every `.from('<table>')` call site (see docs/rls-audit/FINDINGS.md) found
-- that 19 of those tables are read through the ANON key, so RLS with no policy
-- would deny those reads. Those tables need a code change first and are NOT
-- touched here.
--
-- This migration covers only the 27 tables with NO code path anywhere in the
-- repo — not in app/, lib/, components/, contexts/, src/, and not in mobile/.
-- Enabling RLS with no policy on these denies anon and authenticated while
-- leaving the service role (which bypasses RLS) unaffected. Nothing in the
-- application reads them, so there is nothing to break.
--
-- Verified 2026-09-24 against commit d487c56.

-- =========================================================================
-- 1. Wrestling tables with no remaining code path
--    Each was checked against app/, lib/, components/, contexts/, src/ and
--    mobile/. `matches`, `videos` and `tournaments` appear in mobile/ as UI
--    copy and Array.from() calls only — mobile's sole Supabase queries are
--    profiles, clubs and club_members.
-- =========================================================================
ALTER TABLE public.matches                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_simulations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_sequences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biomechanical_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_calibrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_snapshots   ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. Tables belonging to other projects that share this database
--    No code path in this repo. If another project reads them with the anon
--    key, that project will break and should be moved to a service-role
--    client or given explicit policies — see FINDINGS.md §4.
-- =========================================================================
ALTER TABLE public."StockIQ_Findings"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Backtest_Trades"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Data_Health"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TV_Alerts"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Terms_Acceptance"  ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. Golf dataset — reference data for a separate project, no code path here
-- =========================================================================
ALTER TABLE public.golf_players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_rankings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_season_stats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_masters_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_recent_form          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_augusta_holes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_player_augusta_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_betting_odds         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_major_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_advanced_stats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_alpha_scores         ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. Belt and braces — drop the table-level grants as well, so the API does
--    not even reach the RLS check for these tables.
-- =========================================================================
DO $blk$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'matches','videos','training_plans','weight_simulations','trainers',
    'tournaments','action_sequences','biomechanical_standards','model_versions',
    'prompt_calibrations','calibration_snapshots',
    'StockIQ_Findings','Backtest_Trades','Data_Health','TV_Alerts','Terms_Acceptance',
    'golf_players','golf_rankings','golf_season_stats','golf_masters_history',
    'golf_recent_form','golf_augusta_holes','golf_player_augusta_stats',
    'golf_betting_odds','golf_major_history','golf_advanced_stats','golf_alpha_scores'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
  END LOOP;
END;
$blk$;

-- =========================================================================
-- 5. Unrelated advisor WARN, fixed here because it is a one-liner and ours:
--    td_audit_log_append_only was created without a fixed search_path.
-- =========================================================================
CREATE OR REPLACE FUNCTION td_audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  RAISE EXCEPTION 'td_audit_log is append-only (attempted %)', TG_OP;
END;
$fn$;
