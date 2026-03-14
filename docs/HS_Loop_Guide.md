# Healthy Start Command Center — Guide

## Colab Server Setup (Do This First)

The AI runs on Google Colab (GPU). You must start the Colab server before using `/hs/loop`.

### First Time Setup

1. Open the notebook: GitHub > `sportsmockery/LevelUp` > `python/colab_server.ipynb`
2. Select **GPU runtime**: Runtime > Change runtime type > T4 or A100
3. Run cells in order:

| Cell | What it does | Action needed |
|---|---|---|
| **1** | Mounts Google Drive, clones repo, installs deps | Just run it. Authorize Drive when prompted. |
| **2** | Downloads SAM model, restores YOLO + trained models from Drive | Upload `yolov12s_010826.pt` if first time (Cell 2b) |
| **3** | Sets Roboflow API key, fetches dental datasets | Paste your key where it says `ROBOFLOW_API_KEY = ''` |
| **4** | Starts ngrok tunnel | Paste your ngrok token. Copy the PUBLIC URL it prints. |
| **5** | Starts the FastAPI server | Just run it. Server blocks here (keeps running). |

### Restarting the Server

**IMPORTANT: You must restart ngrok (Cell 4) BEFORE restarting the server (Cell 5).** The order matters:

1. Stop the server cell (click the stop button on Cell 5)
2. Re-run **Cell 4** (ngrok) — this creates a new tunnel
3. Re-run **Cell 5** (server)
4. If the ngrok URL changed, update Vercel:
   - Tell Claude the new URL, or manually run:
   - `vercel env rm HS_DETECTION_URL production --yes`
   - `echo "NEW_URL" | vercel env add HS_DETECTION_URL production`
   - Redeploy: `npm run build-deploy`

### Updating Code on Colab

When code changes are pushed to GitHub, pull them on Colab:
```
!cd /content/levelup && git pull origin main
```
Then restart Cell 4 (ngrok) + Cell 5 (server).

### Common Issues

| Problem | Cause | Fix |
|---|---|---|
| "fetch failed" or HTML error with `ERR_NGROK_3200` | Ngrok tunnel died (Colab disconnected) | Restart Cells 4 + 5, update URL in Vercel if changed |
| "ROBOFLOW_API_KEY not set" | Key not in server env | Re-run Cell 3 with your key, restart Cell 4 + 5 |
| Training failed — best.pt not created | Path issues or bad data | Pull latest code (`git pull`), restart Cells 4 + 5 |
| Loop shows generic tooth labels (m3, canR) | Trained models missing | Click Start — auto-training will begin (~20 min) |
| Models lost after Colab restart | Drive not mounted | Ensure Cell 1 runs first (mounts Drive). Models auto-restore from Drive. |

### Google Drive Persistence

Trained models are saved to **Google Drive > My Drive > hs_models/**:
- `detector_best.pt` — 9-class YOLO detector
- `classifier_best.pt` — ResNet18 contact classifier
- `yolov12s_010826.pt` — Base YOLO model
- `sam_vit_b_01ec64.pth` — SAM segmentation model

On Colab restart, Cell 2 restores these from Drive instantly — **no retraining needed**. The first training run takes ~20 min, but every restart after that is instant.

---

## What the Loop Does

The scoring loop runs your dental images through a **3-stage pipeline** on every pass:

```
Stage 1: YOLO Detection    -> Finds teeth, surfaces, gaps, restorations, ortho hardware
Stage 2: Pair Graph         -> Pairs adjacent teeth, measures interproximal distances
Stage 3: Classification     -> Labels each contact + clinical adjudication via rules engine
```

---

## Starting a Loop

1. Go to **levelupwrestlingapp.com/hs/loop**
2. Click **Config** to set parameters:
   - **Source Directory** — where images live (`data/raw/train/images`)
   - **Interval** — seconds between passes (60 = re-scores every minute)
   - **Modality** — match your image type:
     - `intraoral_photo` — photos taken in-mouth (weighted 30%)
     - `bitewing` — X-rays showing crowns/contacts (weighted 40%, highest confidence)
     - `periapical` — X-rays showing root tips (weighted 20%)
   - **Confidence** — YOLO detection threshold (0.25-0.30 recommended, lower = more detections)
   - **Augmentation** — enable to test scoring consistency across image transforms
3. Click **Start**

---

## Reading Results — The 5 Tabs

### Tab 1: Scoring Loop

**Stats Row** (top):

| Metric | What it means |
|---|---|
| **Images** | How many images were scored this pass |
| **Contacts** | Total tooth-to-tooth contact pairs found |
| **Flagged** | Contacts with clinical problems detected |
| **Flag Rate** | % of contacts that are problematic — **above 30% = concern** |
| **Duration** | How long the pass took |

**Label Distribution** — shows how contacts are classified:

| Label | Clinical Meaning | Ortho Relevance |
|---|---|---|
| `normal_contact` | Tight, healthy contact | No intervention needed |
| `open_contact` | Gap between teeth | May need brackets/aligners to close |
| `unclear_contact` | Low confidence — needs manual review | Re-image or examine clinically |

**Results Feed** — per-image breakdown. Look for:
- **Red "f" count** — flagged contacts in that image
- **AUG badge** — augmentation was tested
- **Yellow warning** — inconsistent across augmented variants (unreliable score)

### Tab 2: Drift Analytics

This tracks model quality over multiple passes/iterations.

| Metric | What to watch |
|---|---|
| **Mean S_final** | Overall score quality (higher = better). Below 0.65 = unreliable |
| **Mean IoU** | How well YOLO boxes match SAM masks. Below 0.70 = detection issues |
| **Mean Drift** | Pixel drift between YOLO and SAM boundaries. Above 15px = concern |
| **Tier Distribution** | PLATINUM/GOLD = trustworthy labels. SILVER = review. REJECT = discard |

**YOLO vs SAM Scatter Plot:**
- Points in the **red zone** (high YOLO confidence, low SAM score) = **overconfident failures** — the model thinks it found something but SAM disagrees. These need manual review.

### Tab 3: Hard Samples

**"Hall of Shame"** — the most confusing images ranked by worst score.

| Quality Metric | What it means |
|---|---|
| **Blur** | Below 80 = motion blur, unusable |
| **Contrast** | Below 50% = underexposed/washed out |
| **Occlusion** | Above 30% = teeth blocked by lips/tongue/hardware |

**Action:** Re-photograph these patients with better positioning/lighting. These images cannot produce reliable diagnoses.

### Tab 4: Modality Gaps

Shows which image types perform best.

- **Bitewing X-rays** should have the lowest IoU gap (most reliable for contacts)
- **Intraoral photos** typically have higher gaps due to saliva glare, angle variation
- **Focus next data collection** on whichever modality has the highest gap %

### Tab 5: OMMS / Production

The OMMS (Orthodontic Model Maturity Score) tab is the production readiness dashboard. It shows whether the model is safe and accurate enough for clinical use.

#### OMMS Score

```
OMMS = (0.3 * S_geo) + (0.7 * S_clin) - (Penalty * B_crit)
```

| Component | Weight | What it measures |
|---|---|---|
| **S_geo** (Geometric) | 30% | d_min drift accuracy (target <= 0.15mm) and mask IoU |
| **S_clin** (Clinical) | 70% | % of diagnoses and hardware suggestions matching the orthodontist |
| **B_crit** (Penalty) | -10 each | Automatic FAIL if any biological breach detected |

#### Production Readiness Levels

| Status | OMMS Range | Meaning |
|---|---|---|
| **RED** | < 85 or any bio breach | Not production ready. Model needs more training. |
| **YELLOW** | 85 - 91 | Needs targeted training on specific clusters. |
| **GREEN** | 92+ for 3 consecutive runs | Ready for Level 3 Autopilot (production). |

#### Hero Card

The top card shows:
- **Current OMMS** with color (red/yellow/green)
- **Learning Velocity** — how fast the score is improving per run
- **Progress bar** toward the 92.0 production target
- **4 key metrics**: Mean Drift (mm), Logic Match (%), Bio Breaches, Hardware Accuracy (%)
- **Deltas** vs the 7-day rolling average

#### Intelligence Audit Table

Shows performance across 4 layers:

| Layer | What it tracks | Good status |
|---|---|---|
| **Anatomical** | IoU accuracy of mask detection | Improving (delta > 0) |
| **Diagnostic** | Logic alignment — does AI diagnosis match hard rules? | Improving |
| **Safety** | Biological breach count (hardware too close to roots) | Secure (0 breaches) |
| **Hardware** | TAD placement logic accuracy | >= 90% |

#### OMMS Trend Chart

Bar chart of OMMS over the last 20 runs, color-coded RED/YELLOW/GREEN. Look for:
- **Steady upward climb** = model is learning
- **Dips** = model regression (check what changed)
- **Plateau** = needs new training data or purge of bad clusters

#### Top Failure Mode

Auto-detected pattern where the model struggles most. Example:
> "Low accuracy on Class II Div 2 (74%). Action: Trigger Recursive Purge on Class_II_Div_2 cluster."

---

## Hard Clinical Logic Ruleset

The Clinical Auditor validates every model run against these hard rules. If the AI violates any rule, a Clinical Override is triggered.

### Sagittal Classification (Mandatory)

| Condition | Diagnosis |
|---|---|
| Molar = Distal AND Overjet > 4.0mm | **Class II, Division 1** |
| Molar = Distal AND Overjet < 2.0mm AND Incisors = Lingual | **Class II, Division 2** |
| Molar = Mesial AND Overjet < 0mm | **Class III** |
| Overjet < 0mm AND ANB angle < 0 | **Skeletal Class III (Surgical Risk)** |

### Vertical and Transverse (Mandatory)

| Condition | Diagnosis |
|---|---|
| Overbite < 0mm | **Anterior Open Bite** |
| Overbite > 40% | **Deep Bite** |
| Maxillary width < Mandibular width | **Posterior Crossbite** |

### Hardware Suggestion Engine

| Condition | Hardware Recommendation |
|---|---|
| Crowding > 5.0mm | **RPE (Rapid Palatal Expander)** or serial extractions |
| Overjet > 6.0mm AND high anchorage need | **TADs (Temporary Anchorage Devices)** |
| d_min > 1.0mm across 3+ contacts | **Power Chain** (space closure) |
| Root proximity < 1.0mm to TAD position | **BIOLOGICAL BREACH ALERT** — block inference |

### Biological Breach Protocol

If any hardware is placed within 1.0mm of a root apex:
1. Inference is **blocked immediately**
2. The image is flagged as a **Biological Breach**
3. OMMS receives a **-10 point penalty** per breach
4. Status automatically drops to **RED** regardless of other scores
5. The breach is logged in the Safety layer of the audit table

---

## Truth Engine — Clinical Override Pipeline

When an orthodontist disagrees with the AI's diagnosis and clicks "Clinical Override":

### Step 1: Coordinate Capture
The system records the exact pixel region where the human-AI disagreement occurred (tooth ID, surface, bounding box, measured d_min).

### Step 2: Vector Search
Queries the entire image dataset for similar cases using a geometric signature:
- d_min range (mm)
- Image angle
- Hardware types present
- Image modality
- Quality flags

### Step 3: Mass Flagging
All matching images are **demoted from SILVER to SCRAP**, preventing them from being used in the next training epoch.

### Step 4: Labeling Refinement
A labeling hint is generated for the affected cluster. Example:
> "In images with high beam artifact, prioritize the marginal ridge over the blurry gingival crest. 412 similar images demoted to SCRAP."

### How This Improves the Model

The Truth Engine creates a self-correcting feedback loop:
```
Expert Override -> Find Similar Bad Data -> Remove from Training -> Retrain
   -> Better Model -> Fewer Overrides -> Higher OMMS -> Production
```

Each override makes the next training run cleaner. Track the impact in the OMMS tab under "clusters purged" and "purge impact on S_geo".

---

## OMMS Scores (Automatic)

OMMS scores are now **auto-posted after every loop pass**. You don't need to do anything — the OMMS / Production tab populates automatically as the loop runs.

The auto-score uses:
- **S_geo**: Based on pipeline availability (full pipeline = 0.3mm drift, 0.75 IoU estimate)
- **S_clin**: Based on label distribution (% of contacts with definitive labels, not "unclear")
- **Hardware match**: 80% baseline when full pipeline is active
- **Bio breaches**: 0 by default (increases when TAD proximity violations are detected)

To improve OMMS scores over time:
1. Run more loop passes — the model learns from each run
2. Use Clinical Overrides to purge bad data
3. Run SAM Factory iterations to get real IoU measurements (replaces estimates)
4. Retrain after accumulating overrides

---

## SAM Factory Iterations

The SAM Factory compares YOLO detections against SAM2 segmentation masks to measure how accurate the detector really is. This populates the **Drift Analytics**, **Hard Samples**, and **Modality Gaps** tabs.

### Running a SAM Factory Iteration

**Option A: From the /hs page (single image)**
1. Go to `levelupwrestlingapp.com/hs`
2. Upload a dental image
3. Select **SAM Factory** mode
4. Click **Run SAM Factory**
5. See per-mask GOLD/SILVER/REJECT tier scores

**Option B: From the API (batch)**
```
POST /api/hs/loop
{
  "action": "start",
  "config": { ... }
}
```
The loop's Command Center view (`/api/hs/loop?view=command-center`) returns drift data after factory iterations.

**Option C: Factory run endpoint (one iteration)**
```
POST https://YOUR_NGROK_URL/factory/run
{
  "image_dir": "data/raw/train/images",
  "confidence": 0.25,
  "enhance": true
}
```
This runs one full iteration: YOLO detects on all images, SAM2 refines masks, computes IoU and drift per detection. Returns:
- Platinum/Gold/Silver/Reject counts
- Mean score, mean IoU, mean drift
- Modality breakdown
- Hard samples list

### What SAM Factory Produces

| Metric | What it means |
|---|---|
| **YOLO confidence** | How sure the detector is about each detection |
| **SAM score** | How well SAM2 can refine the mask (independent quality check) |
| **Geometric IoU** | Overlap between YOLO box and SAM mask — the real accuracy metric |
| **Final score** | Weighted combination: 0.4 * YOLO + 0.6 * SAM |
| **Tier** | PLATINUM (>0.92), GOLD (>0.85), SILVER (>0.65), REJECT (<0.65) |

### After Running SAM Factory

The following tabs populate:
- **Drift Analytics** — YOLO vs SAM scatter plot, tier bars, score trends
- **Hard Samples** — images where YOLO and SAM disagree most (need manual review)
- **Modality Gaps** — which image types have the biggest YOLO-to-SAM gap

The SAM Factory also updates the OMMS score with **real IoU measurements** instead of estimates, making the production readiness assessment more accurate.

---

## Data Persistence

All results are saved to **Google Drive** automatically:

| Data | Local path | Drive path |
|---|---|---|
| Loop pass history | `runs/loop_results.json` | `hs_models/results/loop_results.json` |
| Individual passes | — | `hs_models/results/pass_N_timestamp.json` |
| OMMS audit history | `data/audit_history.json` | `hs_models/results/audit_history.json` |
| Trained detector | `runs/detect/.../best.pt` | `hs_models/detector_best.pt` |
| Trained classifier | `runs/classify/.../best.pt` | `hs_models/classifier_best.pt` |
| Truth Engine data | `data/truth_engine/` | — |

Data persists across Colab restarts via Google Drive. Each loop pass saves both the full history and an individual pass file.

---

## Interpreting Results for Ortho Diagnosis

### Per-Patient Workflow

For each patient, look at their images in the Results Feed and check the **clinical labels**:

#### Contact Classifications -> Diagnosis

| Clinical Label | Diagnosis | Hardware Recommendation |
|---|---|---|
| **normal_contact** | Healthy interproximal contact | None needed at this site |
| **food_trap_risk** | Open contact, food impaction likely | **Brackets + archwire** to close gap, or **clear aligners** with attachment |
| **restoration_failure** | Filling/crown margin is defective | **Restorative referral first**, then ortho if alignment caused the failure |
| **monitor** | Borderline — could progress | Re-image in 3-6 months. No hardware yet |
| **not_assessable** | Image quality too low | **Re-photograph** — cannot diagnose |

#### Morphology Labels -> Severity

| Morphology | Severity | Typical Hardware |
|---|---|---|
| **closed_contact** | None | No intervention |
| **open_small** (< 0.5mm) | Mild | **Elastic chain** between brackets, or aligner with closing attachment |
| **open_large** (> 1.0mm) | Significant | **Brackets + coil spring**, or aligners with power ridges. May need **TADs** (temporary anchorage devices) if anchorage is limited |
| **restoration_step** | Iatrogenic | Fix restoration first; if tooth has drifted, **sectional wire** or **aligner** to re-establish contact |
| **marginal_ridge_mismatch** | Moderate | **Bracket repositioning** or **step bend in archwire** to level marginal ridges |

#### Detection Classes -> What Hardware is Already Present

The YOLO detector identifies existing hardware:

| Detection | Meaning |
|---|---|
| **ortho_hardware** | Brackets/wires already present — patient is in active treatment |
| **restoration_margin** | Has existing fillings/crowns — plan ortho around these |
| **articulating_mark** | Bite marks visible — occlusion has been checked |
| **contact_gap_candidate** | Visible space between teeth — primary target for closure |

---

## Key Decision Thresholds

| Measurement | Threshold | Decision |
|---|---|---|
| Gap distance | < 0.1mm | Normal — confirmed by bitewing |
| Gap distance | 0.1 - 0.5mm | Monitor or elastic chain |
| Gap distance | 0.5 - 1.0mm | Active closure needed |
| Gap distance | > 1.0mm | Significant diastema — brackets + springs or aligners + TADs |
| Classifier confidence | > 80% | Trust the label |
| Classifier confidence | 50-80% | Cross-reference with X-ray |
| Classifier confidence | < 50% | Do not use — manual diagnosis required |
| Image quality | < 30% | Discard — re-image the patient |

---

## Auto-Training Pipeline

When you click **Start** on the loop page and the trained models don't exist yet, the system automatically starts the full training pipeline. No manual Colab cells needed.

### What Happens Automatically

1. **Synthetic Data Generation** (~1 min) — Creates 300 labeled dental images with teeth, gaps, restorations, and gum lines. All 9 YOLO classes are annotated.
2. **YOLO Detector Training** (~15-20 min on T4 GPU) — Fine-tunes the base model on synthetic data to detect tooth surfaces, gaps, restorations, and hardware.
3. **Contact Crop Generation** (~1 min) — Extracts interproximal crops from the synthetic data and auto-sorts them into normal/open/unclear.
4. **ResNet18 Classifier Training** (~5 min on T4 GPU) — Trains the contact classifier on the crops.

### Training Progress on the Dashboard

While training runs, the loop page shows:
- **Progress bar** with percentage (0-100%)
- **Current phase**: synth_gen, detector_train, crop_gen, classifier_train
- **Model status**: Detector Ready / Classifier Ready indicators
- **Error details** if anything fails

### After Training Completes

Once both models are ready:
- Models are **automatically saved to Google Drive** (no manual step)
- Click **Start** again — the loop now runs the full 3-stage pipeline
- Results include clinical labels, gap measurements, hardware suggestions
- The OMMS tab starts scoring each run
- On next Colab restart, models restore from Drive instantly — no retraining

### Manual Training (Advanced)

You can also trigger training manually:
- **POST /api/hs/train** with optional config:
  ```json
  {
    "num_synth_images": 500,
    "detector_epochs": 80,
    "classifier_epochs": 30,
    "batch_size": 16
  }
  ```
- **GET /api/hs/train** to check status at any time

### Retraining After Overrides

After accumulating Clinical Overrides via the Truth Engine, retrain to improve the model:
1. The Truth Engine has already purged bad training data (SCRAP tier)
2. Trigger a new training run via POST /api/hs/train
3. The new model will be trained on cleaner data
4. OMMS should increase on the next scoring pass

---

## Recommended Workflow

### Daily Clinical Workflow

1. **Run a full pass** with all patient images
2. **Review flagged contacts** in the Diagnosis & Hardware Feed — these are potential treatment sites
3. **Check Hard Samples** tab — re-photograph those patients
4. **For each flagged patient:**
   - What morphology? (open_small vs open_large vs restoration_step)
   - What is the gap distance in pixels? (geometric data)
   - Is there existing hardware? (ortho_hardware detections)
   - What modality confirmed it? (bitewing > intraoral photo)
5. **Review hardware suggestions** — the system recommends brackets, TADs, elastic chain, etc. based on measurements
6. **Override if wrong** — click Clinical Override to trigger the Truth Engine pipeline
7. **Prescribe hardware** based on the validated diagnosis

### Model Improvement Workflow

1. **Check OMMS tab** after each run — is the score climbing?
2. **Review Intelligence Audit table** — which layers are drifting?
3. **Check Top Failure Mode** — what is the model consistently getting wrong?
4. **Use Clinical Overrides** when the AI misdiagnoses — this purges bad training data
5. **Retrain on Colab** after accumulating overrides — the purged data improves the next model
6. **Track the Road to Production** — 3 consecutive GREEN runs (OMMS >= 92) = safe for autopilot

### Production Readiness Checklist

- [ ] OMMS >= 92 for 3 consecutive runs
- [ ] Zero biological breaches in last 10 runs
- [ ] Logic Match >= 95% (sagittal classification correct)
- [ ] Hardware Accuracy >= 90%
- [ ] Mean Drift <= 0.15mm
- [ ] All modality gaps < 10%
- [ ] Top failure mode accuracy > 85%
