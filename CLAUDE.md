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

## Git Workflow Rules

- **Do NOT use git worktrees.** Never run `git worktree add` and never spawn sub-agents with `isolation: "worktree"`. Work directly in the main checkout at `/Users/christopherburhans/Documents/projects/levelup`.

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

### Colab Setup Process (HS Process)

When the user says "do the HS process" or "start HS", follow these exact steps. The notebook at `python/colab_server.ipynb` may not load from GitHub — if so, use a blank Colab notebook and run these cells manually.

**IMPORTANT**: Tell the user to open https://colab.research.google.com/#create=true and run these cells one at a time. Give them the code blocks to copy-paste.

**Cell 1 — Clone + Install:**
```python
from google.colab import drive
drive.mount('/content/drive')

import os
if os.path.exists('/content/levelup'):
    !cd /content/levelup && git pull origin main
else:
    !git clone https://github.com/sportsmockery/LevelUp.git /content/levelup

%cd /content/levelup/python

!pip install -q ultralytics fastapi uvicorn python-multipart Pillow pyngrok torch torchvision opencv-python-headless roboflow
!pip install -q git+https://github.com/facebookresearch/segment-anything.git

print('Done — Dependencies installed, Drive mounted')
```

**Cell 2 — Restore Models from Drive:**
```python
import os, pathlib, shutil

MODEL_DIR = pathlib.Path('/content/levelup/python')
GDRIVE_HS = pathlib.Path('/content/drive/MyDrive/hs_models')

for src_name, dst_name in [('sam_vit_b_01ec64.pth', 'sam_vit_b_01ec64.pth'), ('yolov12s_010826.pt', 'yolov12s_010826.pt'), ('detector_best.pt', 'runs/detect/contacts_detector_v1/weights/best.pt'), ('classifier_best.pt', 'runs/classify/contacts_classifier_v1/best.pt')]:
    src = GDRIVE_HS / src_name
    dst = MODEL_DIR / dst_name
    if src.exists() and not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(src), str(dst))
        print(f'Restored: {dst_name} ({src.stat().st_size / 1e6:.1f} MB)')
    elif dst.exists():
        print(f'Already exists: {dst_name}')
    else:
        print(f'Not found on Drive: {src_name}')

for d in ['data/raw/train/images', 'data/labeling_queue', 'data/truth_engine', 'runs']:
    pathlib.Path(f'/content/levelup/python/{d}').mkdir(parents=True, exist_ok=True)
print('Data directories created')
```

**Cell 3 — API Key:**
```python
import os, pathlib
os.environ['ROBOFLOW_API_KEY'] = 'jrDusJN0hjbLzL1G5SrW'
pathlib.Path('/content/levelup/.env.local').write_text('ROBOFLOW_API_KEY=jrDusJN0hjbLzL1G5SrW\n')
print('Key set')
```

**Cell 4 — Ngrok Tunnel:**
```python
from pyngrok import ngrok
ngrok.set_auth_token('USER_NGROK_TOKEN')  # Ask user for their token
public_url = ngrok.connect(8100, 'http')
print(f'URL: {public_url}')
```
After this cell runs, check if the ngrok URL changed. If it did, update Vercel:
```bash
vercel env rm HS_DETECTION_URL production --yes
echo "NEW_URL" | vercel env add HS_DETECTION_URL production
npm run build-deploy
```

**Cell 5 — Start Server:**
```python
import os
os.environ['PYTHONPATH'] = '/content/levelup/python'
!cd /content/levelup/python && python -m uvicorn server:app --host 0.0.0.0 --port 8100
```

After server starts, go to `levelupwrestlingapp.com/hs/loop` and click Start. Or start loop from a new Colab cell:
```python
import requests
requests.post('http://localhost:8100/loop/start', json={"source_dir":"data/raw/train/images","interval_seconds":120,"detector_confidence":0.25,"auto_fetch_datasets":False})
```

### Restarting the Server (Code Updates)

When code is pushed to GitHub and needs to take effect on Colab:
1. Stop server cell (Cell 5)
2. Run: `!cd /content/levelup && git pull origin main`
3. Restart Cell 4 (ngrok) — **MUST restart ngrok BEFORE server**
4. Restart Cell 5 (server)
5. If ngrok URL changed, update Vercel env var and redeploy

### Key Rule: Cells stall when server is running

Colab can only run one cell at a time. The server cell (Cell 5) blocks. To run other code:
- Stop the server cell first, OR
- Use `!python /content/some_script.py` in a cell BEFORE starting the server, OR
- Use `requests.post('http://localhost:8100/...')` from a new cell (this works because it talks to the server over HTTP, not the Python kernel)

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
