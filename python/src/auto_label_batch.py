"""Main auto-labeling pipeline: inference → cleanup → YOLO export.

Sends images to the Colab YOLO /detect endpoint, cleans up predictions,
and writes YOLO-format .txt label files ready for Roboflow upload.

All predictions are DRAFTS requiring human review before promotion
into training-ready ground truth.

Usage:
    python -m src.auto_label_batch \
        --image-dir /path/to/images \
        --colab-url https://xxx.ngrok-free.dev \
        --confidence 0.10 \
        [--batch-id rf_batch_2026_03_16_a] \
        [--dry-run]

    # Resume an interrupted run:
    python -m src.auto_label_batch \
        --image-dir /path/to/images \
        --colab-url https://xxx.ngrok-free.dev \
        --resume rf_batch_2026_03_16_a
"""

import argparse
import io
import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow required. Install with: pip install Pillow")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: requests required. Install with: pip install requests")
    sys.exit(1)

from src.class_map import (
    TOOTH_CLASSES,
    NUM_CLASSES,
    LOW_CONFIDENCE_THRESHOLD,
    HIGH_CONFIDENCE_THRESHOLD,
    validate_class_id,
    confidence_tier,
)
from src.batch_manifest import BatchManifest
from src.prediction_cleanup import cleanup_predictions


# ── Defaults ───────────────────────────────────────────────────────────
MAX_IMG_DIM = 1280
JPEG_QUALITY = 75
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def compress_image(img_path: Path) -> Tuple[io.BytesIO, int, int]:
    """Resize and compress image for upload through ngrok.

    Returns (buffer, width, height) where width/height are the
    dimensions AFTER resize (matching the detection coordinates).
    """
    img = Image.open(img_path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    if max(img.size) > MAX_IMG_DIM:
        ratio = MAX_IMG_DIM / max(img.size)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY)
    buf.seek(0)
    return buf, img.size[0], img.size[1]


def detect_single(
    img_path: Path, colab_url: str, confidence: float
) -> Dict:
    """Send one image to Colab /detect and return raw result."""
    buf, img_w, img_h = compress_image(img_path)
    files = {"file": (img_path.name, buf, "image/jpeg")}
    resp = requests.post(
        f"{colab_url}/detect?confidence={confidence}",
        files=files,
        timeout=120,
        headers={"ngrok-skip-browser-warning": "true"},
    )
    if not resp.ok:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    detections = []
    for d in data.get("detections", []):
        if not validate_class_id(d["class_id"]):
            continue
        detections.append({
            "class_id": d["class_id"],
            "class_name": d["class_name"],
            "confidence": round(d["confidence"], 6),
            "bbox": [round(v, 2) for v in d["bbox"]],  # [x1, y1, x2, y2]
            "confidence_tier": confidence_tier(d["confidence"]),
        })

    return {
        "filename": img_path.name,
        "image_width": data.get("image_width", img_w),
        "image_height": data.get("image_height", img_h),
        "detections": detections,
        "detection_count": len(detections),
    }


def detections_to_yolo(
    detections: List[Dict], img_w: int, img_h: int
) -> str:
    """Convert detections to YOLO label format (normalized center x,y,w,h)."""
    lines = []
    for det in detections:
        cls_id = det["class_id"]
        x1, y1, x2, y2 = det["bbox"]
        cx = max(0.0, min(1.0, ((x1 + x2) / 2.0) / img_w))
        cy = max(0.0, min(1.0, ((y1 + y2) / 2.0) / img_h))
        w = max(0.001, min(1.0, (x2 - x1) / img_w))
        h = max(0.001, min(1.0, (y2 - y1) / img_h))
        lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
    return "\n".join(lines)


def gather_images(image_dir: Path) -> List[Path]:
    """Collect all valid image files from the directory."""
    images = sorted(
        p for p in image_dir.iterdir()
        if p.suffix.lower() in IMAGE_EXTENSIONS and not p.name.startswith(".")
    )
    return images


def load_completed(manifest: BatchManifest) -> set:
    """Load filenames already processed (for resume mode)."""
    raw = manifest.load_json(manifest.raw_predictions_path)
    if raw and isinstance(raw, list):
        return {r["filename"] for r in raw}
    return set()


def run_batch(
    image_dir: Path,
    colab_url: str,
    confidence: float,
    batch_id: Optional[str],
    dry_run: bool,
    resume: Optional[str],
    near_exact_iou: float,
    same_class_iou: float,
    cross_class_iou: float,
) -> None:
    """Run the full auto-label batch pipeline."""

    # ── Setup ──────────────────────────────────────────────────────────
    if resume:
        manifest = BatchManifest(batch_id=resume)
        print(f"RESUMING batch: {manifest.batch_id}")
        print(f"  Path: {manifest.base}")
    else:
        manifest = BatchManifest(batch_id=batch_id)
        print(f"NEW batch: {manifest.batch_id}")
        print(f"  Path: {manifest.base}")

    images = gather_images(image_dir)
    print(f"  Images found: {len(images)}")
    print(f"  Colab URL: {colab_url}")
    print(f"  Confidence: {confidence}")
    print(f"  Dry run: {dry_run}")

    # Save config
    config = {
        "image_dir": str(image_dir),
        "colab_url": colab_url,
        "confidence": confidence,
        "max_img_dim": MAX_IMG_DIM,
        "jpeg_quality": JPEG_QUALITY,
        "near_exact_iou": near_exact_iou,
        "same_class_iou": same_class_iou,
        "cross_class_iou": cross_class_iou,
        "dry_run": dry_run,
        "num_classes": NUM_CLASSES,
        "class_map": TOOTH_CLASSES,
        "annotation_status": "draft_prediction",
        "requires_human_review": True,
    }
    manifest.save_config(config)

    # Resume: skip already-processed images
    completed = load_completed(manifest) if resume else set()
    if completed:
        print(f"  Already processed: {len(completed)} (skipping)")
    pending = [img for img in images if img.name not in completed]
    print(f"  To process: {len(pending)}")
    print()

    if dry_run:
        print("DRY RUN — would process these images:")
        for img in pending[:10]:
            print(f"  {img.name}")
        if len(pending) > 10:
            print(f"  ... and {len(pending) - 10} more")
        return

    # ── Phase 1: Inference ─────────────────────────────────────────────
    print("Phase 1: Running inference...")
    raw_predictions = []

    # Load existing predictions if resuming
    if resume:
        existing = manifest.load_json(manifest.raw_predictions_path)
        if existing:
            raw_predictions = existing

    stats = {
        "total_images": len(images),
        "processed": len(completed),
        "failed": 0,
        "total_raw_detections": 0,
        "total_cleaned_detections": 0,
        "zero_detection_images": 0,
        "high_confidence_count": 0,
        "low_confidence_count": 0,
        "class_counts": {name: 0 for name in TOOTH_CLASSES.values()},
    }
    failures = []

    for i, img_path in enumerate(pending):
        try:
            result = detect_single(img_path, colab_url, confidence)
            raw_predictions.append(result)
            stats["processed"] += 1
            stats["total_raw_detections"] += result["detection_count"]

            if result["detection_count"] == 0:
                stats["zero_detection_images"] += 1

            if (i + 1) % 25 == 0:
                avg = stats["total_raw_detections"] / max(stats["processed"] - len(completed), 1)
                print(f"  [{i+1}/{len(pending)}] processed={stats['processed']} "
                      f"failed={stats['failed']} avg_dets={avg:.1f}")
                # Incremental save every 25 images
                manifest.save_json(manifest.raw_predictions_path, raw_predictions)

        except Exception as e:
            stats["failed"] += 1
            failure = {"filename": img_path.name, "error": str(e)}
            failures.append(failure)
            if stats["failed"] <= 5:
                print(f"  FAILED {img_path.name}: {e}")
            elif stats["failed"] == 6:
                print("  (suppressing further error messages...)")

        # Throttle to avoid overwhelming the server
        if (i + 1) % 10 == 0:
            time.sleep(0.3)

    # Save raw predictions
    manifest.save_json(manifest.raw_predictions_path, raw_predictions)
    print(f"\n  Raw predictions saved: {len(raw_predictions)} images")

    # ── Phase 2: Cleanup ───────────────────────────────────────────────
    print("\nPhase 2: Post-inference cleanup...")
    cleaned_predictions = []
    all_removed = []
    all_flagged = []

    for pred in raw_predictions:
        kept, removed, flagged = cleanup_predictions(
            pred["detections"],
            near_exact_iou=near_exact_iou,
            same_class_iou=same_class_iou,
            cross_class_iou=cross_class_iou,
        )

        cleaned_pred = dict(pred)
        cleaned_pred["detections"] = kept
        cleaned_pred["detection_count"] = len(kept)
        cleaned_pred["removed_count"] = len(removed)
        cleaned_pred["flagged_count"] = len(flagged)
        cleaned_predictions.append(cleaned_pred)

        stats["total_cleaned_detections"] += len(kept)
        for det in kept:
            cls_name = det.get("class_name", "")
            if cls_name in stats["class_counts"]:
                stats["class_counts"][cls_name] += 1
            if det["confidence_tier"] == "high":
                stats["high_confidence_count"] += 1
            else:
                stats["low_confidence_count"] += 1

        if removed:
            for r in removed:
                r["source_image"] = pred["filename"]
            all_removed.extend(removed)

        if flagged:
            for f in flagged:
                f["source_image"] = pred["filename"]
            all_flagged.extend(flagged)

    manifest.save_json(manifest.cleaned_predictions_path, cleaned_predictions)
    manifest.save_json(manifest.flagged_path, all_flagged)
    print(f"  Cleaned: {stats['total_cleaned_detections']} detections "
          f"({stats['total_raw_detections'] - stats['total_cleaned_detections']} removed)")
    print(f"  Flagged for review: {len(all_flagged)} cross-class overlaps")

    # ── Phase 3: YOLO export ───────────────────────────────────────────
    print("\nPhase 3: Exporting YOLO labels...")
    exported = 0
    for pred in cleaned_predictions:
        if pred["detection_count"] == 0:
            continue
        yolo_text = detections_to_yolo(
            pred["detections"], pred["image_width"], pred["image_height"]
        )
        stem = Path(pred["filename"]).stem
        label_path = manifest.label_export_dir / f"{stem}.txt"
        label_path.write_text(yolo_text)
        exported += 1

    print(f"  Exported: {exported} label files to {manifest.label_export_dir}")

    # ── Save summary ───────────────────────────────────────────────────
    if stats["processed"] > 0:
        stats["avg_detections_per_image"] = round(
            stats["total_cleaned_detections"] / stats["processed"], 2
        )
    stats["removed_count"] = len(all_removed)
    stats["flagged_count"] = len(all_flagged)
    stats["exported_labels"] = exported
    stats["failures"] = failures[:50]
    manifest.save_summary(stats)

    # ── Final report ───────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"BATCH COMPLETE: {manifest.batch_id}")
    print("=" * 60)
    print(f"  Images processed:  {stats['processed']}")
    print(f"  Failed:            {stats['failed']}")
    print(f"  Zero detections:   {stats['zero_detection_images']}")
    print(f"  Raw detections:    {stats['total_raw_detections']}")
    print(f"  After cleanup:     {stats['total_cleaned_detections']}")
    print(f"  High confidence:   {stats['high_confidence_count']}")
    print(f"  Low confidence:    {stats['low_confidence_count']}")
    print(f"  Labels exported:   {exported}")
    print(f"\n  Class distribution:")
    for name, count in sorted(stats["class_counts"].items(), key=lambda x: -x[1]):
        print(f"    {name:10s}: {count}")
    print(f"\n  Outputs: {manifest.base}")
    print(f"\n  REMINDER: All labels are DRAFTS. Review in Roboflow before training.")


def main():
    parser = argparse.ArgumentParser(
        description="Auto-label dental images via Colab YOLO inference"
    )
    parser.add_argument(
        "--image-dir", type=Path, required=True,
        help="Directory containing images to label"
    )
    parser.add_argument(
        "--colab-url", type=str, required=True,
        help="Colab ngrok URL (e.g. https://xxx.ngrok-free.dev)"
    )
    parser.add_argument(
        "--confidence", type=float, default=0.10,
        help="YOLO detection confidence threshold (default: 0.10)"
    )
    parser.add_argument(
        "--batch-id", type=str, default=None,
        help="Custom batch ID (default: auto-generated)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would be processed without running inference"
    )
    parser.add_argument(
        "--resume", type=str, default=None,
        help="Resume a previous batch by its ID"
    )
    parser.add_argument(
        "--near-exact-iou", type=float, default=0.85,
        help="IoU threshold for near-exact duplicate removal (default: 0.85)"
    )
    parser.add_argument(
        "--same-class-iou", type=float, default=0.60,
        help="IoU threshold for same-class overlap removal (default: 0.60)"
    )
    parser.add_argument(
        "--cross-class-iou", type=float, default=0.70,
        help="IoU threshold for cross-class overlap flagging (default: 0.70)"
    )

    args = parser.parse_args()

    if not args.image_dir.is_dir():
        print(f"ERROR: Image directory not found: {args.image_dir}")
        sys.exit(1)

    run_batch(
        image_dir=args.image_dir,
        colab_url=args.colab_url,
        confidence=args.confidence,
        batch_id=args.batch_id,
        dry_run=args.dry_run,
        resume=args.resume,
        near_exact_iou=args.near_exact_iou,
        same_class_iou=args.same_class_iou,
        cross_class_iou=args.cross_class_iou,
    )


if __name__ == "__main__":
    main()
