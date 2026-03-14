# Session Summary — March 13-14, 2026

## What We Built

Built a complete AI-powered orthodontic diagnostic system that runs on Google Colab (GPU) and connects to a live web dashboard at `levelupwrestlingapp.com/hs`.

## Architecture

```
Patient uploads image -> levelupwrestlingapp.com/hs
  -> Vercel Next.js API (/api/hs/*)
    -> ngrok tunnel -> Google Colab Python server (port 8100)
      -> YOLO v12 tooth detection (97.6% mAP)
      -> SAM2 segmentation masks
      -> ResNet18 contact classifier
      -> Rotation analyzer (PCA + frontal view detection)
    -> Results back to browser with diagnosis + hardware recommendations
```

## Models (PROTECT THESE)

### Current Best: v3 (DO NOT OVERWRITE)
- **Detector**: `detector_v3.pt` — **97.6% mAP50, 91.3% mAP50-95**
- Trained on **real labeled patient images** from Roboflow
- Saved on Google Drive: `/My Drive/hs_models/detector_v3.pt`
- Also saved as `detector_best.pt` (restore target)
- `best_version.json` tracks this as the best version

### Previous versions (on Drive for reference)
- v1: Synthetic-only training (54% val acc) — too few open contacts
- v2: Auto-labeled real images (22.7% mAP) — noisy labels, poor results

### Protection Mechanisms
- `auto_train.py` will NOT overwrite existing models unless `force=True`
- `loop/start` only triggers training if models don't exist
- Drive versioning saves each training run as `detector_vN.pt`
- `best_version.json` tracks which version has the highest accuracy
- Restore always loads the best version, not the latest

## Training Journey (24 hours)

| Step | Data | Accuracy | Problem |
|---|---|---|---|
| 1. No model | None | 0% | Only generic tooth classes (m3, canR) |
| 2. Synthetic v1 | 300 fake images, 30% gaps | 54% val, 4.1% open_contact | Called everything "normal" |
| 3. Rebalanced v2 | 500 fake images, 60% gaps | 84% val | Called everything "open" (overcorrected) |
| 4. Rebalanced v3 | 500 fake images, 40% gaps | 70% val, balanced output | Still only ~50% real accuracy |
| 5. Auto-labeled real | 11,192 images, YOLO labels | 22.7% mAP | Noisy auto-labels, early stopping |
| 6. **Roboflow labeled** | **76 real images, pre-labeled** | **97.6% mAP** | **Current best — PROTECT THIS** |

**Key lesson**: 76 properly labeled real images beat 11,000 auto-labeled images and 500 synthetic images combined.

## Features Implemented

### Single Image Analysis (/hs)
- **YOLO Detection** — raw tooth detection with bounding boxes
- **YOLO + SAM Segmentation** — detection + mask overlay
- **Broken Contacts** — gap detection, clinical diagnosis, hardware recommendations
- **Rotation Analysis** — tooth rotation vs arch curve, works on occlusal AND frontal views
- **Enhance (CLAHE)** — image enhancement for low-quality photos
- **SAM Factory** — auto-labeling with GOLD/SILVER/REJECT tiers

### Scoring Loop (/hs/loop) — 8 Tabs
1. **Scoring Loop** — per-image diagnosis, hardware suggestions, label distribution
2. **OMMS / Production** — model maturity score (target: 92+ for 3 runs = production)
3. **Results BI** — KPI cards, classification breakdown, flag rate trend, top flagged images
4. **Drift Analytics** — YOLO vs SAM divergence tracking
5. **Hard Samples** — worst images ranked by quality
6. **Modality Gaps** — per-modality performance comparison
7. **Definitions** — 70+ terms defined (every term on the page)
8. **User Guide** — step-by-step instructions

### Backend Systems
- **Clinical Auditor** — hard logic rules (sagittal, vertical, transverse classification)
- **OMMS Scoring** — auto-calculated after every loop pass
- **Truth Engine** — clinical override back-propagation (purges bad training data)
- **Auto-Training** — generates synthetic data + trains models from Start button
- **Google Drive Persistence** — models + results survive Colab restarts
- **Model Versioning** — each training run saved as vN, best version protected

### Clinical Logic
- Sagittal: Class I, II Div 1/2, III, surgical risk
- Vertical: Open bite, deep bite
- Transverse: Posterior crossbite
- Hardware suggestions: Brackets, TADs, elastic chain, RPE, power chain, aligners
- Biological breach detection: blocks inference if hardware < 1mm from root

## Key Files

| File | Purpose |
|---|---|
| `python/server.py` | FastAPI server — all endpoints |
| `python/broken_contacts/rotation_analyzer.py` | Tooth rotation detection |
| `python/broken_contacts/auto_train.py` | Auto-training pipeline with Drive persistence |
| `python/broken_contacts/auto_label_real.py` | Auto-labeling real images for training |
| `python/broken_contacts/clinical_auditor.py` | Hard logic + OMMS scoring |
| `python/broken_contacts/truth_engine.py` | Clinical override back-propagation |
| `python/broken_contacts/labeling.py` | Comprehensive ortho scan labeling schema |
| `python/colab_server.ipynb` | Colab notebook for running the server |
| `app/hs/page.tsx` | Single image analysis UI |
| `app/hs/loop/page.tsx` | Command Center dashboard (8 tabs) |
| `docs/HS_Loop_Guide.md` | Full user guide |
| `CLAUDE.md` | System documentation for Claude |

## How to Restart (Colab)

1. Open `python/colab_server.ipynb` from GitHub
2. Run **Cell 1** — mounts Drive, clones/pulls repo, installs deps
3. Run **Cell 2** — restores models from Drive (v3 loads instantly)
4. Run **Cell 3** — sets Roboflow API key
5. Run **Cell 4** — starts ngrok tunnel (copy URL if changed)
6. Run **Cell 5** — starts server
7. Go to `levelupwrestlingapp.com/hs/loop` and click Start

**Models restore from Drive in seconds — no retraining needed.**

## Next Steps to Improve

1. **Label more images on Roboflow** — each 50 labeled images improves the model significantly
2. **Run loop + review flagged images** — confirm or override AI diagnoses
3. **Use Clinical Overrides** — triggers Truth Engine to purge bad data
4. **Upload more patient images** — variety of cases improves generalization
5. **Target OMMS 92+** — 3 consecutive GREEN runs = production ready
