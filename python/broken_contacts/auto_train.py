"""Auto-training pipeline with Google Drive persistence.

Called automatically when the loop starts and detector/classifier
models don't exist. Generates synthetic data, trains both models,
and makes the full 3-stage pipeline available.

Models are saved to Google Drive after training so they persist
across Colab restarts. On startup, models are restored from Drive
if available — skipping retraining entirely.
"""

import shutil
import threading
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

# Google Drive model storage
# Saves to /content/drive/MyDrive/hs_models/ on mounted Colab Drive
GDRIVE_MODEL_DIR = Path("/content/drive/MyDrive/hs_models")
DETECTOR_LOCAL = Path("runs/detect/contacts_detector_v1/weights/best.pt")
CLASSIFIER_LOCAL = Path("runs/classify/contacts_classifier_v1/best.pt")
DETECTOR_GDRIVE = GDRIVE_MODEL_DIR / "detector_best.pt"
CLASSIFIER_GDRIVE = GDRIVE_MODEL_DIR / "classifier_best.pt"
TRAIN_VERSION_FILE = GDRIVE_MODEL_DIR / "version.txt"


@dataclass
class TrainStatus:
    running: bool = False
    phase: str = "idle"           # idle, synth_gen, detector_train, crop_gen, classifier_train, done, error
    progress_pct: float = 0.0
    message: str = ""
    detector_ready: bool = False
    classifier_ready: bool = False
    error: Optional[str] = None
    started_at: float = 0.0
    finished_at: float = 0.0


_status = TrainStatus()
_lock = threading.Lock()
_thread: Optional[threading.Thread] = None


def get_status() -> dict:
    with _lock:
        s = asdict(_status)
    # Also check if models exist right now
    s["detector_exists"] = Path("runs/detect/contacts_detector_v1/weights/best.pt").exists()
    s["classifier_exists"] = Path("runs/classify/contacts_classifier_v1/best.pt").exists()
    return s


def _drive_mounted() -> bool:
    """Check if Google Drive is mounted (Colab-specific)."""
    return Path("/content/drive/MyDrive").exists()


def _next_version() -> int:
    """Find the next version number from existing versioned models on Drive."""
    if not _drive_mounted() or not GDRIVE_MODEL_DIR.exists():
        return 1
    versions = []
    for f in GDRIVE_MODEL_DIR.glob("detector_v*.pt"):
        try:
            v = int(f.stem.split("_v")[1])
            versions.append(v)
        except (IndexError, ValueError):
            continue
    return max(versions, default=0) + 1


def _read_best_version() -> dict:
    """Read the best version info from Drive."""
    best_file = GDRIVE_MODEL_DIR / "best_version.json"
    if best_file.exists():
        try:
            import json
            return json.loads(best_file.read_text())
        except Exception:
            pass
    return {"version": 0, "val_acc": 0.0}


def save_to_drive(val_acc: float = 0.0) -> dict:
    """Save trained models to Google Drive with versioning.

    Each training run saves as detector_vN.pt / classifier_vN.pt.
    Also maintains 'best' copies (detector_best.pt) if this run
    has higher val_acc than the previous best.
    """
    if not _drive_mounted():
        return {"saved": False, "reason": "Google Drive not mounted"}

    GDRIVE_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    saved = []
    version = _next_version()

    # Save versioned copies
    if DETECTOR_LOCAL.exists():
        versioned = GDRIVE_MODEL_DIR / f"detector_v{version}.pt"
        shutil.copy2(str(DETECTOR_LOCAL), str(versioned))
        saved.append(f"detector_v{version} ({DETECTOR_LOCAL.stat().st_size / 1e6:.1f} MB)")

    if CLASSIFIER_LOCAL.exists():
        versioned = GDRIVE_MODEL_DIR / f"classifier_v{version}.pt"
        shutil.copy2(str(CLASSIFIER_LOCAL), str(versioned))
        saved.append(f"classifier_v{version} ({CLASSIFIER_LOCAL.stat().st_size / 1e6:.1f} MB)")

    # Check if this is the best version
    best_info = _read_best_version()
    is_new_best = val_acc > best_info.get("val_acc", 0.0)

    if is_new_best or best_info.get("version", 0) == 0:
        # Save as 'best' (used for restore)
        if DETECTOR_LOCAL.exists():
            shutil.copy2(str(DETECTOR_LOCAL), str(DETECTOR_GDRIVE))
        if CLASSIFIER_LOCAL.exists():
            shutil.copy2(str(CLASSIFIER_LOCAL), str(CLASSIFIER_GDRIVE))

        # Write best version info
        import json
        best_file = GDRIVE_MODEL_DIR / "best_version.json"
        best_file.write_text(json.dumps({
            "version": version,
            "val_acc": val_acc,
            "saved_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }, indent=2))
        saved.append(f"NEW BEST (v{version}, acc={val_acc:.4f})")
    else:
        saved.append(f"v{version} saved but v{best_info['version']} is still best (acc={best_info['val_acc']:.4f})")

    # Write version log
    TRAIN_VERSION_FILE.write_text(
        f"latest_version={version}\n"
        f"val_acc={val_acc}\n"
        f"is_best={is_new_best}\n"
        f"saved_at={time.strftime('%Y-%m-%dT%H:%M:%S')}\n"
        f"detector={'yes' if DETECTOR_GDRIVE.exists() else 'no'}\n"
        f"classifier={'yes' if CLASSIFIER_GDRIVE.exists() else 'no'}\n"
    )

    return {"saved": True, "version": version, "is_best": is_new_best, "models": saved}


def restore_from_drive() -> dict:
    """Restore trained models from Google Drive if available."""
    if not _drive_mounted():
        return {"restored": False, "reason": "Google Drive not mounted"}

    restored = []

    if DETECTOR_GDRIVE.exists() and not DETECTOR_LOCAL.exists():
        DETECTOR_LOCAL.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(DETECTOR_GDRIVE), str(DETECTOR_LOCAL))
        restored.append(f"detector ({DETECTOR_GDRIVE.stat().st_size / 1e6:.1f} MB)")

    if CLASSIFIER_GDRIVE.exists() and not CLASSIFIER_LOCAL.exists():
        CLASSIFIER_LOCAL.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(CLASSIFIER_GDRIVE), str(CLASSIFIER_LOCAL))
        restored.append(f"classifier ({CLASSIFIER_GDRIVE.stat().st_size / 1e6:.1f} MB)")

    return {"restored": len(restored) > 0, "models": restored}


def models_exist() -> bool:
    """Check if trained models exist locally. Try restoring from Drive first."""
    if DETECTOR_LOCAL.exists() and CLASSIFIER_LOCAL.exists():
        return True

    # Try restoring from Google Drive
    result = restore_from_drive()
    if result.get("restored"):
        return DETECTOR_LOCAL.exists() and CLASSIFIER_LOCAL.exists()

    return False


def start_training(
    num_synth_images: int = 300,
    detector_epochs: int = 50,
    classifier_epochs: int = 20,
    batch_size: int = 16,
) -> dict:
    """Start the auto-training pipeline in a background thread."""
    global _thread

    with _lock:
        if _status.running:
            return {"status": "already_running", "phase": _status.phase}

        _status.running = True
        _status.phase = "starting"
        _status.progress_pct = 0.0
        _status.message = "Initializing training pipeline..."
        _status.error = None
        _status.started_at = time.time()
        _status.finished_at = 0.0

    _thread = threading.Thread(
        target=_run_pipeline,
        args=(num_synth_images, detector_epochs, classifier_epochs, batch_size),
        daemon=True,
    )
    _thread.start()
    return {"status": "started"}


def _update(phase: str, pct: float, msg: str) -> None:
    with _lock:
        _status.phase = phase
        _status.progress_pct = pct
        _status.message = msg


def _run_pipeline(
    num_synth: int,
    det_epochs: int,
    cls_epochs: int,
    batch_size: int,
) -> None:
    """Full training pipeline — runs in background thread."""
    try:
        import os

        # Resolve the python/ directory as our base for all paths
        base_dir = Path(__file__).parent.parent.resolve()
        os.chdir(str(base_dir))
        _update("synth_gen", 2.0, f"Working directory: {base_dir}")

        # ── Phase 1: Generate synthetic data ────────────────────────
        _update("synth_gen", 5.0, f"Generating {num_synth} synthetic dental images...")

        from broken_contacts.synth_generator import generate_dataset
        synth_out = base_dir / "data" / "synth_detector"

        # Generate balanced dataset: 40% with gaps, 20% with restorations
        # Balanced to produce ~40% normal, ~40% open, ~20% unclear
        summary = generate_dataset(
            output_dir=str(synth_out),
            num_images=num_synth,
            train_split=0.8,
            img_w=640,
            img_h=480,
            gap_probability=0.4,
            restoration_probability=0.2,
        )
        _update("synth_gen", 15.0, f"Generated {summary['total_images']} images ({summary['total_gaps']} gaps)")

        # Verify data.yaml exists and fix path to be absolute
        data_yaml = synth_out / "data.yaml"
        if not data_yaml.exists():
            raise FileNotFoundError(f"data.yaml not found at {data_yaml}")

        # Rewrite data.yaml with absolute paths to ensure YOLO finds the images
        yaml_content = f"""# Synthetic Dental Dataset — Auto-Generated
path: {synth_out}
train: train/images
val: val/images

nc: 9
names:
  0: tooth_crown
  1: mesial_surface
  2: distal_surface
  3: occlusal_surface
  4: restoration_margin
  5: contact_gap_candidate
  6: articulating_mark
  7: ortho_hardware
  8: gingival_margin
"""
        data_yaml.write_text(yaml_content)

        # Verify images actually exist
        train_imgs = list((synth_out / "train" / "images").glob("*.jpg"))
        val_imgs = list((synth_out / "val" / "images").glob("*.jpg"))
        _update("synth_gen", 18.0, f"Verified: {len(train_imgs)} train, {len(val_imgs)} val images")

        if len(train_imgs) == 0:
            raise FileNotFoundError(f"No training images found in {synth_out / 'train' / 'images'}")

        # ── Phase 2: Train YOLO detector ────────────────────────────
        _update("detector_train", 20.0, f"Training 9-class YOLO detector ({det_epochs} epochs)...")

        from ultralytics import YOLO
        base_model = base_dir / "yolov12s_010826.pt"
        if not base_model.exists():
            raise FileNotFoundError(f"Base YOLO model not found at {base_model}")

        det_project = base_dir / "runs" / "detect"
        det_project.mkdir(parents=True, exist_ok=True)

        model = YOLO(str(base_model))
        model.train(
            data=str(data_yaml),
            epochs=det_epochs,
            imgsz=640,
            batch=batch_size,
            name="contacts_detector_v1",
            patience=15,
            lr0=0.0005,
            augment=True,
            save=True,
            val=True,
            verbose=True,
            project=str(det_project),
            exist_ok=True,
        )

        # YOLO may save to contacts_detector_v1 or contacts_detector_v12 etc.
        # Find the actual output directory
        det_best = det_project / "contacts_detector_v1" / "weights" / "best.pt"
        if not det_best.exists():
            # Search for any best.pt under the project dir
            candidates = list(det_project.glob("contacts_detector_v1*/weights/best.pt"))
            if candidates:
                det_best = candidates[-1]  # Use most recent
                # Copy to expected location
                expected = det_project / "contacts_detector_v1" / "weights" / "best.pt"
                expected.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(det_best), str(expected))
                det_best = expected

        if not det_best.exists():
            # List what was actually created for debugging
            all_files = list(det_project.rglob("*.pt"))
            raise FileNotFoundError(
                f"Detector best.pt not found. Project dir: {det_project}. "
                f"Found .pt files: {[str(f) for f in all_files[:10]]}"
            )

        with _lock:
            _status.detector_ready = True
        _update("detector_train", 60.0, f"Detector trained: {det_best}")

        # ── Phase 3: Generate classifier crops ──────────────────────
        _update("crop_gen", 65.0, "Generating contact crops from synthetic data...")

        import json
        import random
        from PIL import Image
        from broken_contacts.config import Config
        from broken_contacts.crops import generate_crops_from_labels

        config = Config()
        config.crop_size = 224

        synth_dir = base_dir / "data" / "synth_detector"
        cls_dir = base_dir / "data" / "classifier_dataset"
        for split in ["train", "val"]:
            for cls in ["normal_contact", "open_contact", "unclear_contact"]:
                (cls_dir / split / cls).mkdir(parents=True, exist_ok=True)

        crop_count = {"normal_contact": 0, "open_contact": 0, "unclear_contact": 0}

        for split in ["train", "val"]:
            img_dir = synth_dir / split / "images"
            lbl_dir = synth_dir / split / "labels"
            rel_dir = synth_dir / "relational"
            if not img_dir.exists():
                continue

            for img_path in sorted(img_dir.glob("*.jpg")):
                label_path = lbl_dir / f"{img_path.stem}.txt"
                rel_path = rel_dir / f"{img_path.stem}.json"
                if not label_path.exists():
                    continue

                gap_pairs = set()
                if rel_path.exists():
                    with open(rel_path) as f:
                        rel = json.load(f)
                    for pair in rel.get("contact_pairs", []):
                        if pair.get("has_gap", False):
                            gap_pairs.add(pair["pair_index"])

                try:
                    crops = generate_crops_from_labels(
                        image_path=str(img_path),
                        label_path=str(label_path),
                        config=config,
                        output_dir=None,
                    )
                except Exception:
                    continue

                for ci, crop_data in enumerate(crops):
                    crop_img = crop_data.get("crop_image")
                    if crop_img is None:
                        continue
                    if ci in gap_pairs:
                        label = "open_contact"
                    elif random.random() < 0.10:
                        label = "unclear_contact"
                    else:
                        label = "normal_contact"
                    out = cls_dir / split / label / f"{img_path.stem}_p{ci}.jpg"
                    crop_img.save(str(out))
                    crop_count[label] += 1

        total_crops = sum(crop_count.values())
        _update("crop_gen", 70.0, f"Generated {total_crops} crops: {crop_count}")

        if total_crops < 10:
            raise ValueError(f"Too few crops ({total_crops}) — classifier training would fail")

        # ── Phase 4: Train ResNet18 classifier ──────────────────────
        _update("classifier_train", 75.0, f"Training contact classifier ({cls_epochs} epochs)...")

        import torch
        import torch.nn as nn
        from torch.utils.data import DataLoader
        from torchvision import datasets, transforms
        from broken_contacts.classifier import build_classifier_model

        device = torch.device(
            "cuda" if torch.cuda.is_available()
            else "mps" if hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
            else "cpu"
        )

        train_tf = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        val_tf = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        train_ds = datasets.ImageFolder(str(cls_dir / "train"), transform=train_tf)
        val_ds = datasets.ImageFolder(str(cls_dir / "val"), transform=val_tf)

        train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=2)
        val_loader = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=2)

        cls_model = build_classifier_model(num_classes=len(train_ds.classes), pretrained=True)
        cls_model.to(device)

        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(cls_model.parameters(), lr=0.001)
        scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)

        cls_run_dir = base_dir / "runs" / "classify" / "contacts_classifier_v1"
        cls_run_dir.mkdir(parents=True, exist_ok=True)
        best_acc = 0.0

        for epoch in range(cls_epochs):
            cls_model.train()
            for images, labels in train_loader:
                images, labels = images.to(device), labels.to(device)
                optimizer.zero_grad()
                loss = criterion(cls_model(images), labels)
                loss.backward()
                optimizer.step()
            scheduler.step()

            cls_model.eval()
            correct, total = 0, 0
            with torch.no_grad():
                for images, labels in val_loader:
                    images, labels = images.to(device), labels.to(device)
                    _, pred = torch.max(cls_model(images), 1)
                    correct += (pred == labels).sum().item()
                    total += labels.size(0)

            acc = correct / max(total, 1)
            pct = 75.0 + (epoch / cls_epochs) * 20.0
            _update("classifier_train", pct, f"Epoch {epoch+1}/{cls_epochs} — val acc: {acc:.4f}")

            if acc > best_acc:
                best_acc = acc
                torch.save({
                    "epoch": epoch + 1,
                    "model_state_dict": cls_model.state_dict(),
                    "val_acc": acc,
                    "classes": train_ds.classes,
                }, str(cls_run_dir / "best.pt"))

        cls_best = cls_run_dir / "best.pt"
        if not cls_best.exists():
            raise FileNotFoundError("Classifier training failed — best.pt not created")

        with _lock:
            _status.classifier_ready = True

        # ── Phase 5: Save to Google Drive ───────────────────────────
        drive_result = save_to_drive(val_acc=best_acc)
        drive_msg = ""
        if drive_result.get("saved"):
            drive_msg = f" Saved to Google Drive: {', '.join(drive_result['models'])}."
        else:
            drive_msg = " (Google Drive not mounted — models will be lost on restart)"

        _update("done", 100.0, f"Training complete! Best val acc: {best_acc:.4f}.{drive_msg}")

    except Exception as e:
        with _lock:
            _status.phase = "error"
            _status.error = str(e)
            _status.message = f"Training failed: {e}"

    finally:
        with _lock:
            _status.running = False
            _status.finished_at = time.time()
