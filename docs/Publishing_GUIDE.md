# LevelUp Publishing — User Guide

Multi-tenant music registration & publishing automation. Enter your catalog once. Generate platform-ready packets for BMI, the MLC, Songtrust, SoundExchange, the US Copyright Office, and your distributor. Track filing status. Keep a permanent workbook archive.

**Live at:** https://levelupwrestlingapp.com/publishing

---

## Quick start (10-minute first release)

1. **Sign up** at `/signup`. Confirm your email (if confirmation is enabled).
2. **Visit `/publishing`** → click **Open app**.
3. **Settings** → create your first **organization**.
4. **Writers** → add yourself as a writer (legal name + PRO + IPI). Add a publisher.
5. **New Release** → fill in title, type, artist, copyright year, ℗ + © lines.
6. **Release detail** → upload artwork; add a track; click into the track.
7. **Track detail** → assign writer split (100% total); assign publisher split (100%); set writer approval to "approved"; enter the ISRC.
8. **Exports** → pick the release → click **Generate** on each platform you need.
9. **Workbook archive** → download the files.
10. Upload each file to the platform's own bulk-upload page, or use the BMI / Copyright PDFs as your reference while filling out their web form.

---

## Concepts

### Organization
A publishing tenant — typically one label, one writer, or one production company. Releases, writers, publishers, splits, exports, and audit logs live inside the org. You can be a member of multiple orgs.

### Roles
| Role | Can |
|---|---|
| **owner** | Everything, including delete the org and demote other owners |
| **admin** | Everything except delete the org |
| **editor** | Create / edit releases, tracks, writers, publishers, splits, files |
| **collaborator** | Read everything; update **only** their own writer split rows (for approvals) |
| **viewer** | Read-only |

### Writer vs. publisher share
A song has two royalty sides, each 100%:
- **Writer share** → paid to songwriters via PROs (BMI/ASCAP/SESAC/GMR) and the MLC.
- **Publisher share** → paid to publishing entities (each writer should have one, even if self-published).

Both must sum to exactly 100% on every track. The system blocks exports until they do.

### ISRC
A 12-character code identifying a master recording: 2-letter country + 3-character registrant + 2-digit year + 5-digit designation. Format `^[A-Z]{2}[A-Z0-9]{3}\d{7}$`. Reusing an ISRC across remixes/edits is the most common mistake — each unique recording needs its own.

### IPI
Interested Parties Information number — 6 to 11 digits assigned by your PRO. Without it, PROs and the MLC cannot match royalties to you.

### The 14-step workflow
The system enforces a locked order. Each release shows its checklist on the right side of the detail page:

```
1.  Create organization
2.  Add artist profile
3.  Add writers + IPI
4.  Add publishers + IPI
5.  Create release
6.  Upload artwork
7.  Add tracks
8.  Assign ISRCs
9.  Assign writer splits (= 100%)
10. Get split approvals
11. Assign publisher splits (= 100%)
12. Validate per platform
13. Generate registration files
14. Record registration status
```

Steps cannot be completed until prerequisites are done. If you completed a step **outside** the system (e.g., already filed at BMI by hand), use the **"Mark completed outside system"** link on the locked step and provide a written reason. This writes to the audit log.

---

## Pages

### `/publishing` — Public landing
Marketing + workflow overview. Open to anyone.

### `/publishing/app` — Home
Catalog overview, counts, and the 14-step workflow reference.

### `/publishing/app/settings`
- Create + switch organizations
- Define custom fields (per entity type: release / track / writer / publisher)
- Invite teammates by email (they must already have a LevelUp account)
- Change member roles

### `/publishing/app/writers`
CRUD for writers and publishers. Each requires PRO + IPI.

### `/publishing/app/releases`
List of releases. Click "New release" to create one.

### `/publishing/app/releases/[id]`
Release detail:
- Track list + add track
- Artwork upload (3000×3000 RGB JPG/PNG/WEBP)
- Custom fields for this release
- Right-side checklist showing 14-step state

### `/publishing/app/releases/[id]/tracks/[id]`
Track detail:
- Metadata (title, duration in ms, ISRC, ISWC, BPM, key, language, explicit/instrumental)
- Writer splits manager — must sum to 100%
- Per-writer approval status (pending / approved / needs changes / rejected)
- Publisher splits manager — must sum to 100%
- Custom fields for this track

### `/publishing/app/isrc`
ISRC ledger:
- Single-add with format validation
- Bulk-paste (one per line; invalid lines skipped)
- Assign to a track (also writes the ISRC onto the track row)
- Status filter (reserved / assigned / retired)

### `/publishing/app/approvals`
Collaborator dashboard. Lists `track_writers` rows where your account's email matches the email on a writer profile in this org. Approve / reject / mark needs-changes for each split. Status badges propagate to the release-level checklist.

### `/publishing/app/exports`
The Export Center.
1. Pick a release.
2. Read the catalog + per-platform validation. Blocking issues are red; warnings are amber.
3. Click **Generate** on a platform tile. The Master Workbook is org-scoped and doesn't require a release.

### `/publishing/app/workbook-archive`
Every file the system has ever generated for this org. Versioned, timestamped, permanent. Click **Download** to get a 10-minute signed URL.

---

## Exports — what each one produces

| Platform | Files | Layout |
|---|---|---|
| **BMI** | PDF + .txt packet | Per-work dossier you reference while filling out BMI Songview by hand. Includes the verbatim review warning. |
| **MLC** | .xlsx + .json | Matches the Bulk Work Registration Spreadsheet structure: per-work rows with Writer 1/2/3… and Original Publisher 1/2/3… numbered columns. HH:MM:SS duration. Capacity codes CA/C/A. |
| **Songtrust** | .csv + .xlsx | Per-writer rows (so 100% reconstructs cleanly). Songtrust doesn't publish their template publicly — README inside the workbook flags `template_pending`. |
| **SoundExchange** | .csv + .xlsx | Matches the Repertoire Data Template: per-recording rows with ISRC, Featured Artist, Master Rights Owner, ℗ Line, HH:MM:SS. |
| **Copyright eCO** | Form PA + Form SR PDFs + .txts | Two packets: Form PA (composition) and Form SR (sound recording). You file each separately on copyright.gov. |
| **Distributor** | .csv + .xlsx | DDEX-style one-row-per-track. Compatible with CD Baby Pro bulk import. For DistroKid / TuneCore, use as a clipboard reference for their UI. |
| **Master Workbook** | .xlsx | 10-tab snapshot of the entire org catalog: Releases, Tracks, Writers, Publishers, Splits, ISRC Ledger, Platform Status, Custom Fields, Generated Files, Audit Log. |

Every generated workbook includes a **README** sheet inside it with provenance, format notes, and platform-specific reminders.

---

## How filing actually works

LevelUp Publishing does **not** submit on your behalf. There is no automation against BMI, MLC, Songtrust, SoundExchange, eCO, or DistroKid — none of them publish a public registration API, and ToS prohibits automated submission. The workflow is:

1. We generate the file in the platform's exact format.
2. **You** log into the platform's website yourself.
3. **You** click "Upload bulk file" (where supported) or use our PDF as a reference while filling out their web form (BMI, eCO).
4. **You** copy the confirmation number back into our system.

### Platforms that accept bulk file upload
- **MLC** (bulk work registration template)
- **SoundExchange** (repertoire upload)
- **Songtrust** (catalog import — admin tool)
- **CD Baby Pro** (bulk import)

### Platforms that only support manual entry (use our packet as a reference)
- **BMI Songview**
- **ASCAP**, **SESAC**, **GMR**
- **US Copyright Office eCO** (Form PA + Form SR)
- **DistroKid**, **TuneCore** (per-release UI flow)

---

## Validation gates

The Export Center blocks file generation when blocking issues exist. Common blockers:

- Release missing title / primary artist / copyright year / tracks
- Track missing title / duration / valid-format ISRC (when ISRC is set)
- Writer shares ≠ 100% on any track
- Publisher shares ≠ 100% on any track (if any publishers assigned)
- Writer has invalid IPI format (must be 6–11 digits)
- Platform-specific: BMI requires every writer to have an IPI; MLC requires ISRC; etc.

Warnings (amber, non-blocking):
- No ℗ / © line set
- No artwork uploaded
- Track has no ISRC
- Writer has no PRO set
- Writer split not yet approved

---

## Audit log

Every meaningful action is written to `audit_logs`:

- `organization_created`, `member_added`, `member_role_changed`, `member_removed`
- `release_created` (via Supabase RLS), `artwork_uploaded`
- `track_created`, `split_updated`
- `isrc_assigned`
- `platform_files_generated`
- `file_downloaded` (every signed-URL download)
- `step_override_recorded` (with the written reason)

Audit rows are visible to any org member with **viewer** role or higher. They are write-only from the application — service role only on the insert side, no UI to edit them.

---

## Storage

Files live in two Supabase Storage buckets, both private, RLS-scoped to `org_id`:

- `mp-artwork` — release artwork (path: `<org_id>/<release_id>/<timestamp>-<filename>`)
- `mp-workbooks` — every generated registration file (path: `<org_id>/<release_id>/<platform>/<timestamp>/<filename>`)

Downloads happen via short-lived (10-minute) signed URLs issued by `/api/publishing/files/[fileId]/url`.

---

## Out of scope (intentionally)

- We do **not** store your platform passwords (BMI, MLC, etc.)
- We do **not** automate web submissions (no Playwright, no headless browsers)
- We do **not** generate ISRCs for you — bring your own registrant code
- We do **not** provide legal certification of authorship — Copyright eCO packets explicitly carry a "REVIEW BEFORE FILING" warning
- We do **not** send physical contracts, escrow money, or act as a publishing administrator ourselves

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Login button stuck on "Signing in…" | Old cached JS | Hard refresh (Cmd/Ctrl+Shift+R), then try again |
| After sign-in, lands on /login again | Cookies not syncing | Hard refresh; verify `sb-*` cookies exist in DevTools → Application → Cookies |
| Magic-link / confirmation email points to localhost | Supabase Site URL misconfigured | Settings (Supabase dashboard) → Authentication → URL Configuration → set Site URL to `https://levelupwrestlingapp.com` |
| Generate button greyed out | Blocking validation issues | Scroll up — the red items list the exact fields to fix |
| Track says writer total isn't 100% | Splits don't sum | Edit shares until total turns green ✓ |
| Master Workbook export doesn't need a release | By design | Master Workbook is org-scoped — covers entire catalog |
| Can't see another member's writer profile | RLS working as designed | Both users must be members of the same org |

---

## Architecture (for developers)

- **Routes**: `/app/publishing/*` (Next.js App Router, React Server Components where possible)
- **API**: `/app/api/publishing/*` — service-role-backed mutations + signed-URL generation
- **DB**: Supabase Postgres, 17 unprefixed tables, RLS via `is_publishing_org_member()` SECURITY DEFINER helper
- **Auth**: Shared with the wrestling app (`auth.users`). Org membership and role live in `organization_members`
- **Storage**: Two Supabase Storage buckets, org-scoped policies
- **Adapters**: One folder per platform under `lib/platform-adapters/`. Each exports `validate()` and `generate()`. Adding a new platform = 4 files + one row in `validateForPlatform()`.
- **Spreadsheets**: `exceljs` for `.xlsx`, `papaparse` for `.csv`, `jspdf` for `.pdf`
- **Migration**: `supabase/migrations/20260517000000_music_publishing.sql`

---

## Quick command reference

```bash
# Local dev
npm run dev

# Deploy (must use this — enforces safety protocol)
npm run build-deploy

# Apply a new SQL migration to prod
# (via Supabase SQL editor — paste contents of new migration file)
```

---

*Last updated: 2026-05-17. Maintainer: cbur22@gmail.com.*
