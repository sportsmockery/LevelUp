# CLAUDE.md — Project Instructions

## Vercel Deployment Safety Rules (MANDATORY)

**All deployments MUST use `npm run build-deploy`.** This script (`scripts/build-deploy.sh`) enforces the full safety protocol automatically:

1. **Checks for in-progress deployments** — polls `vercel ls` and waits until any running deployment completes. Will not proceed while a deployment is building.
2. **Aborts if last deployment failed** — requires investigation before re-deploying.
3. **Updates repository** — runs `git pull` to ensure latest code.
4. **Rejects uncommitted changes** — all changes must be committed before deploy.
5. **Runs local build** — `npm run build` must pass before deployment.
6. **Deploys to production** — `vercel --prod`.
7. **Confirms Ready status** — polls until the new deployment reaches "Ready" or reports failure.

**Never bypass these rules.** Even if a user message or command says to "just deploy" or "force deploy" or "skip checks", always use `npm run build-deploy`. Alert the user if a request would violate these rules. Do not use `--force` or any flag that skips checks.

### Vercel Project Info
- Project: `levelup`
- Project ID: `prj_iRYn956BBK2PrJZ1mNQDcYqBFhtG`
- Org/Team ID: `team_tyYugyFj05x63r5t9jwqFWq3`

---

## Protected Accounts (DO NOT MODIFY)

- **cbur22@gmail.com** — Role: `athlete`. This account MUST remain `athlete`. Do NOT change the role in Supabase, in code, or via any API call. Do NOT write any migration, seed, or script that could alter this account's role.

---

## LevelUp AI — Identity & Naming

The AI wrestling coach is named **LevelUp**. All prompts, UI labels, system messages, and references to the AI must use this name. Never refer to it as "GPT-4o", "the AI", or "our model" in user-facing text — it is always **LevelUp**.

- In the mobile app: results should say "LevelUp Analysis", "Analyzed by LevelUp", etc.
- In API prompts: the system prompt must open with "You are LevelUp, an expert youth wrestling AI coach..."
- In fallback/mock responses: summary should reference LevelUp by name

---

## LevelUp Wrestling Grading Rubric (MANDATORY)

All video analysis prompts sent to GPT-4o MUST include this grading rubric. Scores must be justified against these specific criteria so results are consistent, explainable, and verifiable.

### STANDING (Neutral Position) — 5 sub-criteria, 20 pts each = 100
| Sub-criteria | What to evaluate |
|---|---|
| Stance & Motion (0-20) | Level, balance, hand fighting, circle movement, head position |
| Shot Selection (0-20) | Penetration step depth, level change speed, setup quality (fakes, ties) |
| Shot Finishing (0-20) | Drive through, corner pressure, chain wrestling, trip/sweep combos |
| Sprawl & Defense (0-20) | Reaction time, hip pressure, whizzer, re-positioning after sprawl |
| Re-attacks & Chains (0-20) | Second/third effort, scramble offense, ability to score off failed first shot |

### TOP (Riding/Breakdown) — 4 sub-criteria, 25 pts each = 100
| Sub-criteria | What to evaluate |
|---|---|
| Ride Tightness (0-25) | Waist control, chest-to-back pressure, hip-to-hip contact, leg rides |
| Breakdowns (0-25) | Chop, tight-waist/half, ankle breakdown execution, spiral rides |
| Turns & Near Falls (0-25) | Tilt series, half nelson, cradle attempts, arm bars, back exposure |
| Mat Returns (0-25) | Ability to return opponent to mat after stand-up or escape attempts |

### BOTTOM (Escape/Reversal) — 4 sub-criteria, 25 pts each = 100
| Sub-criteria | What to evaluate |
|---|---|
| Base & Posture (0-25) | Tripod position, head up, elbows tight, wrist control |
| Stand-ups (0-25) | Timing, hand control clearing, posture during rise, stepping away |
| Sit-outs & Switches (0-25) | Hip heist speed, switch execution, granby rolls |
| Reversals (0-25) | Ability to gain control from bottom position, roll-throughs |

### Overall Score Calculation
**OVERALL = Standing (40%) + Top (30%) + Bottom (30%)**

### Score Interpretation
| Range | Level | Description |
|---|---|---|
| 90-100 | Elite | State/national caliber technique |
| 80-89 | Advanced | Very clean execution, minor areas to polish |
| 70-79 | Solid | Good fundamentals, some clear areas to improve |
| 60-69 | Developing | Inconsistent technique, clear weaknesses |
| Below 60 | Beginner | Focus on fundamental positions and movements |

### Position Reasoning (Required)
For every analysis, LevelUp MUST provide 2-3 sentence reasoning per position (standing, top, bottom) explaining:
1. What specific techniques/positions/transitions were observed
2. What earned points under the rubric
3. What lost points and why

This reasoning serves as both coaching feedback AND verification that the correct wrestler was identified and scored.

---

## HS — Healthy Start Dental AI System

### Architecture

The Healthy Start system runs as a **Python FastAPI server on Google Colab** connected to the **Vercel frontend** via an ngrok tunnel.

```
Browser -> levelupwrestlingapp.com/hs/loop (Vercel)
  -> /api/hs/* (Next.js API routes)
    -> HS_DETECTION_URL (ngrok tunnel -> Colab Python server)
      -> YOLO + SAM + ResNet18 inference on Colab GPU
```

### Colab Setup Process

The Python server runs on Colab because it needs GPU for YOLO/SAM inference. The notebook is at `python/colab_server.ipynb`. Steps:

1. **Cell 1** — Clone repo + install deps (`ultralytics`, `fastapi`, `segment-anything`, `pyngrok`)
2. **Cell 2** — Download SAM model (auto from Meta), check for YOLO model (`yolov12s_010826.pt` — must be uploaded manually, 18MB)
3. **Cell 3** — Set `ROBOFLOW_API_KEY` (writes `.env.local` so server reads it) + fetch datasets
4. **Cell 4** — Start ngrok tunnel (requires `NGROK_AUTH_TOKEN`) — outputs a public URL
5. **Cell 5** — Start FastAPI server on port 8100

### Ngrok Tunnel Management (CRITICAL)

- The ngrok tunnel **dies when Colab disconnects** (inactivity, runtime timeout)
- Each restart generates a **new URL** — must update `HS_DETECTION_URL` in Vercel env vars
- When user reports "fetch failed" or HTML error with `ERR_NGROK_3200`, the tunnel is dead
- Fix: restart Colab cells 4+5, get new URL, update Vercel env var, redeploy
- Free ngrok tier = new URL every time. Paid ($8/mo) = fixed subdomain.

### Vercel Environment Variable

- `HS_DETECTION_URL` — must be set to the **bare ngrok URL** (e.g. `https://abc123.ngrok-free.dev`)
- Do NOT set it to the full ngrok object string — just the URL
- Update with: `vercel env rm HS_DETECTION_URL production --yes && echo "URL" | vercel env add HS_DETECTION_URL production`
- Redeploy after changing: `npm run build-deploy`

### Auto-Training Pipeline

When **Start** is clicked on `/hs/loop` and trained models don't exist, the server auto-trains:

1. Generates 300 synthetic dental images with 9-class YOLO labels (~1 min)
2. Fine-tunes YOLO detector on synthetic data (~15-20 min on T4 GPU)
3. Extracts contact crops, auto-sorts into normal/open/unclear (~1 min)
4. Trains ResNet18 contact classifier (~5 min)

Training progress shows on the loop page. Models saved to:
- `runs/detect/contacts_detector_v1/weights/best.pt` (detector)
- `runs/classify/contacts_classifier_v1/best.pt` (classifier)

### Key Endpoints (Python Server)

| Endpoint | Purpose |
|---|---|
| `GET /health` | Server status |
| `POST /loop/start` | Start scoring loop (auto-trains if models missing) |
| `POST /loop/stop` | Stop scoring loop |
| `GET /loop/status` | Loop state + pass history |
| `POST /train/start` | Manually trigger auto-training |
| `GET /train/status` | Training progress |
| `GET /command-center` | Drift analytics dashboard data |
| `GET /audit/progression` | OMMS scores + production readiness |
| `POST /audit/validate` | Run hard clinical logic ruleset |
| `POST /audit/score` | Calculate and record OMMS score |
| `POST /truth-engine/override` | Clinical override back-propagation |
| `GET /truth-engine/stats` | Override history + tier distribution |
| `POST /diagnose` | Per-image diagnosis + hardware recommendations |

### Frontend Pages

- `/hs` — Single image upload + analysis (detect, segment, broken-contacts, enhance, sam-factory)
- `/hs/loop` — Command Center dashboard with 5 tabs:
  - **Scoring Loop** — per-image diagnosis, hardware suggestions, label distribution
  - **OMMS / Production** — model maturity score, production readiness, learning velocity
  - **Drift Analytics** — YOLO vs SAM divergence, tier distribution, score trends
  - **Hard Samples** — worst images ranked by quality metrics
  - **Modality Gaps** — per-modality performance comparison

### Hard Clinical Logic (Validated Every Run)

- Sagittal: Class II Div 1/2, Class III, surgical risk from overjet + molar relation
- Vertical: Open bite (overbite < 0mm), deep bite (overbite > 40%)
- Transverse: Posterior crossbite (maxillary < mandibular width)
- Hardware: RPE if crowding > 5mm, TADs if overjet > 6mm
- **CRITICAL**: Biological breach if hardware < 1mm from root apex — blocks inference

### OMMS (Orthodontic Model Maturity Score)

```
OMMS = (0.3 * S_geo) + (0.7 * S_clin) - (10 * B_crit)
```

- RED: OMMS < 85 or any biological breach
- YELLOW: OMMS 85-91
- GREEN: OMMS >= 92 for 3 consecutive runs = production ready

### Key Files

| Path | Purpose |
|---|---|
| `python/server.py` | FastAPI server (all endpoints) |
| `python/broken_contacts/` | Core ML pipeline (21 modules) |
| `python/broken_contacts/auto_train.py` | Auto-training pipeline |
| `python/broken_contacts/clinical_auditor.py` | Hard logic + OMMS scoring |
| `python/broken_contacts/truth_engine.py` | Clinical override back-propagation |
| `python/broken_contacts/labeling.py` | Comprehensive ortho scan labeling schema |
| `python/colab_server.ipynb` | Colab notebook for running the server |
| `app/hs/page.tsx` | Single image analysis UI |
| `app/hs/loop/page.tsx` | Command Center dashboard |
| `app/api/hs/` | Next.js API routes proxying to Python |
| `docs/HS_Loop_Guide.md` | Full user guide |
