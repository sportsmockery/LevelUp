"""Promote high-confidence predictions to ground truth, flag the rest for review.

Splits the batch into two sets:
1. Images where ALL detections are high confidence (≥0.50) and no cross-class
   flags → re-uploaded as ground truth annotations (is_prediction=False)
2. Images with ANY low-confidence detection or cross-class overlap
   → left as draft predictions for manual review

Usage:
    python -m src.promote_high_confidence \
        --batch-id rf_batch_2026_03_16_a \
        --image-dir /path/to/images \
        --api-key YOUR_KEY \
        --project hs-teeth
"""

import argparse
import json
import sys
import time
from pathlib import Path

try:
    from roboflow import Roboflow
except ImportError:
    print("ERROR: roboflow required. Install with: pip install roboflow")
    sys.exit(1)

from src.batch_manifest import BatchManifest
from src.class_map import HIGH_CONFIDENCE_THRESHOLD


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_RETRIES = 3
RETRY_BACKOFF = [2, 5, 15]


def run(batch_id: str, image_dir: Path, api_key: str, project_name: str) -> None:
    manifest = BatchManifest(batch_id=batch_id)

    cleaned = manifest.load_json(manifest.cleaned_predictions_path)
    if not cleaned:
        print("ERROR: No cleaned predictions found.")
        sys.exit(1)

    flagged = manifest.load_json(manifest.flagged_path) or []
    flagged_images = {f["source_image"] for f in flagged}

    # Split into auto-approve vs needs-review
    auto_approve = []
    needs_review = []

    for pred in cleaned:
        filename = pred["filename"]
        dets = pred["detections"]

        if not dets:
            continue

        all_high = all(d["confidence"] >= HIGH_CONFIDENCE_THRESHOLD for d in dets)
        has_flags = filename in flagged_images

        if all_high and not has_flags:
            auto_approve.append(pred)
        else:
            needs_review.append(pred)

    print(f"Batch: {batch_id}")
    print(f"  Total images with detections: {len(auto_approve) + len(needs_review)}")
    print(f"  Auto-approve (all high conf, no flags): {len(auto_approve)}")
    print(f"  Needs manual review: {len(needs_review)}")
    print()

    # List the review images so user knows which to check
    if needs_review:
        print("Images requiring manual review:")
        for pred in needs_review:
            low_count = sum(1 for d in pred["detections"] if d["confidence"] < HIGH_CONFIDENCE_THRESHOLD)
            in_flagged = pred["filename"] in flagged_images
            reason = []
            if low_count > 0:
                reason.append(f"{low_count} low-conf")
            if in_flagged:
                reason.append("cross-class overlap")
            print(f"  {pred['filename']} — {', '.join(reason)}")
        print()

    # Save review list
    review_path = manifest.base / "needs_review.json"
    manifest.save_json(review_path, [
        {"filename": p["filename"],
         "detection_count": p["detection_count"],
         "low_conf_count": sum(1 for d in p["detections"] if d["confidence"] < HIGH_CONFIDENCE_THRESHOLD),
         "flagged": p["filename"] in flagged_images}
        for p in needs_review
    ])
    print(f"Review list saved: {review_path}")

    # Upload auto-approved as ground truth
    print(f"\nUploading {len(auto_approve)} images as ground truth...")
    rf = Roboflow(api_key=api_key)
    workspace = rf.workspace()
    project = workspace.project(project_name)

    label_dir = manifest.label_export_dir
    success = 0
    failed = 0

    for i, pred in enumerate(auto_approve):
        img_path = image_dir / pred["filename"]
        stem = Path(pred["filename"]).stem
        label_path = label_dir / f"{stem}.txt"

        if not img_path.exists() or not label_path.exists():
            failed += 1
            continue

        uploaded = False
        for attempt in range(MAX_RETRIES):
            try:
                project.upload(
                    image_path=str(img_path),
                    annotation_path=str(label_path),
                    is_prediction=False,  # Ground truth
                    split="train",
                )
                success += 1
                uploaded = True
                break
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_BACKOFF[attempt])
                else:
                    failed += 1
                    if failed <= 5:
                        print(f"  FAILED {pred['filename']}: {e}")

        if (i + 1) % 50 == 0:
            print(f"  [{i+1}/{len(auto_approve)}] uploaded={success} failed={failed}")
            time.sleep(1)

    print(f"\n{'=' * 60}")
    print(f"DONE")
    print(f"{'=' * 60}")
    print(f"  Auto-approved as ground truth: {success}")
    print(f"  Failed: {failed}")
    print(f"  Still need your review: {len(needs_review)}")
    print(f"\n  Review those {len(needs_review)} images in Roboflow Annotate.")


def main():
    parser = argparse.ArgumentParser(description="Promote high-confidence predictions to ground truth")
    parser.add_argument("--batch-id", type=str, required=True)
    parser.add_argument("--image-dir", type=Path, required=True)
    parser.add_argument("--api-key", type=str, required=True)
    parser.add_argument("--project", type=str, default="hs-teeth")
    args = parser.parse_args()
    run(args.batch_id, args.image_dir, args.api_key, args.project)


if __name__ == "__main__":
    main()
