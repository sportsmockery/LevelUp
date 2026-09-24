# RLS Audit — LevelUp Wrestling (`dzwuqmklqrhrwcbablfg`)

**Date:** 2026-09-24 · **Against:** commit `d487c56` · **Advisor re-run:** yes, same day

---

## 1. The exposure

Supabase's security advisor flags **46 public tables with RLS disabled**. They are
reachable by the `anon` role through PostgREST. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
ships in the browser bundle by design, so **anyone who opens devtools can read and
write every row in all 46 tables** — including `profiles`.

## 2. Why the advisor's own fix is dangerous

The advisor offers remediation SQL that enables RLS on all 46 at once. **Do not run
it.** RLS with no policy denies `anon` and `authenticated` outright, and the audit
below found 19 tables that are read *through the anon key*. Running it takes down
club invites, the leaderboard, annotations, sharing, imports, the comparison tool,
progressive analysis, and login.

## 3. Method

For each flagged table, every `.from('<table>')` call site was located across
`app/`, `lib/`, `components/`, `contexts/`, `src/` and `mobile/`, then each calling
file classified by which Supabase client it imports:

| Client module | Key | Subject to RLS? |
|---|---|---|
| `lib/supabase.ts` (`createBrowserClient`) | anon | **Yes** |
| `lib/supabase-server.ts` (`createClient`) | service role | No — bypasses RLS |
| `lib/scout-db.ts` | service role | No |
| `mobile/lib/supabase.ts` | anon | **Yes** |

**The central finding:** a number of Next.js API routes import `lib/supabase.ts` —
the *browser* client — and use it server-side. Running server-side it has no cookie
session, so it acts as plain `anon`. Those routes work today only because RLS is
off. They are the reason this cannot be a one-shot migration.

## 4. Results

### Tier A — no code path (27 tables) → **fixed in this PR**

No reference anywhere in the repo. RLS-on with no policy is safe; the service role
still reads them.

`matches`, `videos`, `training_plans`, `weight_simulations`, `trainers`,
`tournaments`, `action_sequences`, `biomechanical_standards`, `model_versions`,
`prompt_calibrations`, `calibration_snapshots`, `StockIQ_Findings`,
`Backtest_Trades`, `Data_Health`, `TV_Alerts`, `Terms_Acceptance`, and all 11
`golf_*` tables.

Two caveats worth stating rather than burying:

- `matches`, `videos` and `tournaments` appear in `mobile/` — but only as UI copy
  and `Array.from()` calls. Mobile's only Supabase queries are `profiles`, `clubs`
  and `club_members`. Checked explicitly.
- `StockIQ_Findings`, `Backtest_Trades`, `Data_Health`, `TV_Alerts` and the `golf_*`
  set have no code path *in this repo*, but plainly belong to other projects sharing
  this database. **If one of those projects reads them with an anon key, this PR
  breaks it.** Confirm before merging.

### Tier B — server-side routes using the anon client (17 tables) → **needs a code change first**

Each is reached only from an API route that imports `lib/supabase.ts`. The fix is
two steps, in order: switch the route to `lib/supabase-server.ts`, deploy, then
enable RLS. Doing it the other way round breaks the route.

| Table | Route(s) |
|---|---|
| `wrestler_profiles` | `api/club/leaderboard`, `api/wrestler/[id]/progress` |
| `longitudinal_trends` | `api/wrestler/[id]/progress` |
| `expert_validations` | `api/admin/validation-stats`, `api/admin/analyses/[id]/review`, `lib/training-data.ts` |
| `validation_disagreements` | `api/admin/analyses/[id]/review` |
| `comparisons` | `api/comparison` |
| `elite_technique_library` | `api/comparison` |
| `frame_annotations` | `api/annotations/{load,save,share}` |
| `shared_annotations` | `api/annotations/share` |
| `training_data_exports` | `lib/training-data.ts` |
| `tw_wrestler_records` | `api/import/trackwrestling` |
| `matboss_imports` | `api/import/matboss` |
| `shared_analyses` | `api/share` |
| `activity_feed` | `api/club/activity` |
| `club_leaderboard_snapshots` | `api/club/leaderboard` |
| `analysis_cache` | `api/analyze` |
| `progressive_sessions` | `api/analyze/progressive` |
| `coach_scores` | `api/admin/calibration` |

Note that several of these are **admin** routes (`api/admin/*`) reading through the
anon key. That is its own finding, independent of RLS.

### Tier C — genuine client reads (2 tables) → **needs a real policy, human decision**

| Table | Read from | Proposed policy | Confidence |
|---|---|---|---|
| `profiles` | `contexts/AuthContext.tsx` (web browser), `mobile/lib/auth.tsx`, plus four API routes | `SELECT`/`UPDATE` where `id = auth.uid()`; a separate read for coaches/club members needs the club-membership predicate | Medium — the coach/parent visibility rules need confirming against product intent |
| `clubs` | `mobile/.../club-settings.tsx` (browser), `api/club/invite/validate`, `api/family/connections` | `SELECT` for members via `club_members`; writes owner-only | Medium |

**`profiles` is the highest-risk table in the set** — it holds user identity and the
`role` column, and it is currently world-writable. Given CLAUDE.md protects
`cbur22@gmail.com`'s `athlete` role, note that right now *anyone on the internet can
change it*. This one deserves attention ahead of everything else in Tier B.

## 5. Recommended order

1. **This PR** — Tier A, 27 tables, no behaviour change. (Confirm the other-project
   tables first.)
2. **`profiles` and `clubs`** — write the policies, test login, club settings and the
   family/parent flows on a preview deploy before merging.
3. **Tier B** — convert the 17 routes to the service-role client, deploy, verify,
   then a second migration enabling RLS on those tables.
4. Separately: move the `api/admin/*` routes off the anon key regardless of RLS.

## 6. Other advisor findings, not addressed here

- **`is_publishing_org_member`** is a `SECURITY DEFINER` function executable by
  `anon` via `/rest/v1/rpc/`. Worth revoking `EXECUTE` from `anon`.
- **Leaked-password protection is disabled** in Supabase Auth. One toggle in the
  dashboard.
- The four `td_v_public_*` views are flagged as `SECURITY DEFINER`. That is
  deliberate — they are the options desk's public read surface and expose only
  published rows. No action.
- `td_audit_log_append_only` had a mutable `search_path`; fixed in this PR since it
  is ours and a one-liner.
