# Healthy Start — Model Implementation & Improvement Guide

## Current Model Status

| Model | Version | Accuracy | Trained On | Location |
|---|---|---|---|---|
| **YOLO Detector** | v3 (BEST) | 97.6% mAP50 | 76 real labeled images from Roboflow | Google Drive: `hs_models/detector_v3.pt` |
| **Contact Classifier** | v3 | 54% val acc | Synthetic data (needs improvement) | Google Drive: `hs_models/classifier_v3.pt` |
| **Rotation Analyzer** | N/A | Math-based | No training needed | Code: `rotation_analyzer.py` |
| **SAM Segmentation** | vit_b | Pre-trained | Meta's dataset | Google Drive: `hs_models/sam_vit_b_01ec64.pth` |

---

## Part 1: Running the Models

### Option A: Web Dashboard (levelupwrestlingapp.com)

**Single Image Analysis** — `/hs`
1. Start the Colab server (see Colab Setup below)
2. Go to `levelupwrestlingapp.com/hs`
3. Upload a dental image
4. Choose analysis mode:
   - **Broken Contacts** — detects gaps, diagnoses food trap risk, suggests hardware
   - **Rotation Analysis** — measures tooth rotation, recommends treatment
   - **YOLO Detection** — raw tooth detection with bounding boxes
   - **YOLO + SAM** — detection + segmentation masks
5. Set confidence to 25% for best results
6. Click analyze

**Batch Scoring** — `/hs/loop`
1. Click Start — scores all images in `data/raw/train/images/`
2. Monitor on Scoring Loop tab — per-image diagnosis and hardware
3. Check Results BI tab — KPI charts, flag rates, trends
4. Check OMMS tab — model maturity score and production readiness

### Option B: Standalone Script (code_updated.py)

```bash
cd your_project_directory
python code_updated.py
```

Output:
- `masked/2masked_images/` — images with SAM mask overlays
- `masked/2debug_masks/` — images with rotation markers and diagnosis
- `masked/reports/rotation_report.json` — JSON report for all images

Edit these lines in the script to change paths:
```python
IMAGE_DIR = "path/to/your/images/"
YOLO_MODEL_PATH = "path/to/best.pt"   # or it auto-finds trained v3
SAM_MODEL_PATH = "path/to/sam_vit_b_01ec64.pth"
```

### Colab Server Setup

1. Open `python/colab_server.ipynb` from GitHub (`sportsmockery/LevelUp`)
2. Runtime > Change runtime type > GPU (T4 or A100)
3. Run cells 1-5 in order:
   - Cell 1: Mounts Drive, clones repo, installs deps
   - Cell 2: Restores models from Drive (v3 loads instantly)
   - Cell 3: Sets Roboflow API key + fetches datasets
   - Cell 4: Starts ngrok tunnel (copy the URL)
   - Cell 5: Starts FastAPI server
4. If ngrok URL changed, update Vercel: `HS_DETECTION_URL`

**IMPORTANT**: Always restart ngrok (Cell 4) BEFORE restarting server (Cell 5).

---

## Part 2: Making the Detector Better

The YOLO detector is the foundation — everything else depends on it detecting teeth correctly. Current accuracy: 97.6% mAP on 76 labeled images. More labeled data = better model.

### Step 1: Label More Images on Roboflow

The single biggest improvement comes from labeling more real patient images.

**Current project**: `hs-teeth` on Roboflow (workspace: Chriss Workspace)

**To add more images:**

```python
# On Colab — upload more images to Roboflow with pre-labels
from roboflow import Roboflow
from ultralytics import YOLO
from pathlib import Path

rf = Roboflow(api_key="YOUR_KEY")
project = rf.workspace().project("hs-teeth")
model = YOLO('yolov12s_010826.pt')

img_dir = Path('data/raw/train/images')
images = sorted([f for f in img_dir.glob('real_*')])  # your patient images

for i, img_path in enumerate(images[50:150]):  # next batch of 100
    results = model.predict(str(img_path), conf=0.25, verbose=False)
    result = results[0]
    h, w = result.orig_shape

    ann_lines = []
    for box, cls in zip(result.boxes.xyxy.cpu().numpy(), result.boxes.cls.cpu().numpy()):
        x1, y1, x2, y2 = box
        cx = ((x1 + x2) / 2) / w
        cy = ((y1 + y2) / 2) / h
        bw = (x2 - x1) / w
        bh = (y2 - y1) / h
        ann_lines.append(f"{int(cls)} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

    ann_path = img_path.with_suffix('.txt')
    ann_path.write_text("\n".join(ann_lines))
    project.upload(image_path=str(img_path), annotation_path=str(ann_path), split="train")
    ann_path.unlink(missing_ok=True)

    if (i + 1) % 10 == 0:
        print(f'  {i+1} uploaded')
```

**To correct labels on Roboflow:**
1. Go to app.roboflow.com > hs-teeth project
2. Click on an image
3. Click a bounding box to select it
4. Change the class dropdown if wrong (canL, canR, dL, dR, centL, centR, m1, m2, m3)
5. Press Delete to remove a bad box
6. Click and drag to draw a new box for missed teeth
7. Press Enter to save, arrow keys to navigate

**Label priority** (most impactful to label):
1. Frontal view images (model is weakest here)
2. Images with crowding/rotation
3. Images with restorations (gold crowns, fillings)
4. Different lighting conditions
5. Pediatric/mixed dentition cases

### Step 2: Retrain on New Labels

After labeling more images on Roboflow:

```python
# On Colab — download new labeled data and retrain
from roboflow import Roboflow

rf = Roboflow(api_key="YOUR_KEY")
project = rf.workspace().project("hs-teeth")

# Generate new version with augmentation
project.generate_version(settings={
    "preprocessing": {"auto-orient": True, "resize": {"width": 640, "height": 640, "format": "Stretch to"}},
    "augmentation": {"flip": {"horizontal": True, "vertical": False}},
})

# Download
dataset = project.version(2).download("yolov8", location="/content/levelup/python/data/roboflow_hs_v2")

# Create val split if missing
import shutil, random
from pathlib import Path
base = Path('/content/levelup/python/data/roboflow_hs_v2')
train_imgs = sorted((base / 'train' / 'images').glob('*'))
val_img_dir = base / 'valid' / 'images'
val_lbl_dir = base / 'valid' / 'labels'
val_img_dir.mkdir(parents=True, exist_ok=True)
val_lbl_dir.mkdir(parents=True, exist_ok=True)
random.seed(42)
for img in random.sample(train_imgs, max(1, len(train_imgs) // 5)):
    lbl = base / 'train' / 'labels' / f'{img.stem}.txt'
    shutil.move(str(img), str(val_img_dir / img.name))
    if lbl.exists():
        shutil.move(str(lbl), str(val_lbl_dir / lbl.name))

# Train
from ultralytics import YOLO
model = YOLO('/content/levelup/python/yolov12s_010826.pt')
model.train(
    data=str(base / 'data.yaml'),
    epochs=100,
    imgsz=640,
    batch=16,
    name='contacts_detector_hs_v2',
    patience=20,
    lr0=0.0005,
    augment=True,
    save=True,
    val=True,
    verbose=True,
    project='/content/levelup/python/runs/detect',
    exist_ok=True,
)

# Save if better than current best
best = Path('/content/levelup/python/runs/detect/contacts_detector_hs_v2/weights/best.pt')
if best.exists():
    val_model = YOLO(str(best))
    metrics = val_model.val(data=str(base / 'data.yaml'))
    mAP = float(metrics.box.map50)
    print(f'New model mAP50: {mAP:.4f}')

    if mAP > 0.976:  # Only replace if better than v3
        dst = Path('/content/levelup/python/runs/detect/contacts_detector_v1/weights/best.pt')
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(best), str(dst))
        from broken_contacts.auto_train import save_to_drive
        print(save_to_drive(val_acc=mAP))
        print('NEW BEST MODEL SAVED!')
    else:
        print(f'New model ({mAP:.4f}) did not beat v3 (0.9763). Keeping v3.')
```

### Step 3: Improve the Contact Classifier

The contact classifier (normal/open/unclear) is currently trained on synthetic data only. To improve it:

**Option A: Auto-generate crops from the improved detector**
```python
# After retraining the detector, generate new classifier training data
from broken_contacts.auto_train import start_training
start_training(
    num_synth_images=500,
    detector_epochs=0,   # skip detector training, keep v3
    classifier_epochs=30,
    batch_size=16,
    force=True,  # override protection
)
```

**Option B: Manual crop labeling**
1. Run the loop on patient images
2. The crops are saved to `data/classifier_dataset/`
3. Manually move misclassified crops to the correct folder:
   - `train/normal_contact/` — tight healthy contacts
   - `train/open_contact/` — visible gaps
   - `train/unclear_contact/` — ambiguous cases
4. Retrain the classifier

---

## Part 3: The Improvement Cycle

```
Label images on Roboflow (50-100 at a time)
    |
    v
Retrain detector -> Check mAP50 (target: beat current best)
    |
    v
Start loop on all images -> Check OMMS score
    |
    v
Review flagged images on Scoring Loop tab
    |
    v
Click Clinical Override on wrong diagnoses
    |
    v
Truth Engine purges similar bad data
    |
    v
Retrain with cleaner data -> Higher OMMS
    |
    v
Repeat until OMMS >= 92 for 3 consecutive runs
    |
    v
PRODUCTION READY
```

### What Each Step Improves

| Action | What improves | Expected impact |
|---|---|---|
| Label 50 more images | Detector accuracy (mAP) | +2-5% mAP per batch |
| Label frontal views | Rotation detection | Fewer false negatives |
| Label crowded cases | Open contact detection | Higher flag rate accuracy |
| Label restoration cases | Restoration failure detection | Better hardware suggestions |
| Clinical overrides | Training data quality | Removes poisonous data |
| SAM Factory iteration | IoU measurements | Real OMMS S_geo scores |
| More patient images | Generalization | Works on more patient types |

### Milestones

| OMMS Score | Status | What it means |
|---|---|---|
| < 85 | RED | Model needs more training data |
| 85-91 | YELLOW | Close — target specific weak areas |
| 92+ (1 run) | GREEN | Meets clinical threshold |
| 92+ (3 runs) | PRODUCTION | Safe for Level 3 Autopilot |

---

## Part 4: Model Protection Rules

### DO NOT:
- Run `start_training()` without `force=True` — it will skip if models exist
- Delete `detector_v3.pt` or `detector_best.pt` from Google Drive
- Delete `best_version.json` from Google Drive
- Train on synthetic data and overwrite the real-trained model

### SAFE TO DO:
- Train new versions — they save as v4, v5, etc. and only become "best" if they beat v3
- Add more images to Roboflow and retrain
- Run the loop (scoring doesn't modify models)
- Use Clinical Overrides (only affects training data, not the model)

### If Something Goes Wrong:
1. Check `best_version.json` on Drive — it says which version is best
2. The best model is always at `hs_models/detector_best.pt`
3. All versions are preserved: `detector_v1.pt`, `detector_v2.pt`, `detector_v3.pt`
4. To restore: copy `detector_best.pt` to `runs/detect/contacts_detector_v1/weights/best.pt`

---

## Part 5: Adding New Features

### To add a new tooth class:
1. Add the class to the YOLO training data (new label in Roboflow)
2. Update `NUMERIC_CLASS_MAP` in `code_updated.py`
3. Update `rotation_analyzer.py` class mapping
4. Retrain the detector

### To add a new analysis mode:
1. Write the analysis function in `python/broken_contacts/`
2. Add an endpoint to `python/server.py`
3. Add the mode to the endpoint map in `app/api/hs/route.ts`
4. Add the UI button and results display in `app/hs/page.tsx`

### To improve frontal view rotation:
The frontal detection uses 3 signals: aspect ratio, asymmetry, overlap. To improve:
1. Collect images where it gets rotation wrong
2. Adjust thresholds in `rotation_analyzer.py`:
   - `aspect < 0.45` — lower = stricter (fewer false positives)
   - `asymmetry > 0.25` — higher = stricter
   - `overlap > 0.3` — higher = stricter
3. Test on your patient images until accuracy is acceptable

### To improve the loop's clinical output:
1. Update `rules.py` — add new clinical rules
2. Update `clinical_auditor.py` — add new hard logic validations
3. Update `server.py` diagnose endpoint — add new hardware suggestions
4. Update `loop/page.tsx` — display new data on the dashboard

---

## Part 6: Key Commands Reference

### Colab Quick Commands

```python
# Pull latest code
!cd /content/levelup && git pull origin main

# Check model status
import requests
print(requests.get('http://localhost:8100/train/status').json())

# Start loop
requests.post('http://localhost:8100/loop/start', json={
    "source_dir": "data/raw/train/images",
    "interval_seconds": 120,
    "detector_confidence": 0.25,
    "auto_fetch_datasets": False
})

# Stop loop
requests.post('http://localhost:8100/loop/stop')

# Force retrain (CAREFUL — only if you have better data)
requests.post('http://localhost:8100/train/start', json={
    "num_synth_images": 500,
    "detector_epochs": 80,
    "classifier_epochs": 30,
    "batch_size": 16,
    "force": True
})

# Save models to Drive
requests.post('http://localhost:8100/train/save')

# Check OMMS progression
print(requests.get('http://localhost:8100/audit/progression').json())
```

### Local Commands

```bash
# Run standalone rotation analysis
python code_updated.py

# Start local Python server (if not using Colab)
cd python && python -m uvicorn server:app --host 0.0.0.0 --port 8100

# Deploy to Vercel
npm run build-deploy
```

---

## Part 7: Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| "fetch failed" on website | Colab/ngrok disconnected | Restart cells 4+5 on Colab |
| Only 4 teeth detected | Wrong model loaded or high confidence | Lower confidence to 25%, ensure v3 model is loaded |
| 0 rotations on crowded image | Frontal view not detecting | Check aspect ratio threshold, may need tuning |
| 100% flagged as open contact | Classifier imbalanced | Retrain classifier with balanced data |
| OMMS not updating | Loop not running with trained models | Check Loop Messages for "Full 3-stage pipeline loaded" |
| Training overwrote v3 | force=True was used | Restore from Drive: `detector_v3.pt` |
| mAP dropped after retrain | New data was worse | Keep v3 as best, the versioning system protects it |
| Colab runtime died | Inactivity timeout | Restart cells 1-5, models restore from Drive |
