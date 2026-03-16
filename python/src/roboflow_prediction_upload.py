"""Upload YOLO auto-labels to Roboflow as draft predictions.

Predictions appear as Label Assist suggestions in the Roboflow
annotation UI. Reviewers accept, reject, or adjust each box.
Nothing is promoted to ground truth without human approval.

Usage:
    python -m src.roboflow_prediction_upload \
        --batch-id rf_batch_2026_03_16_a \
        --image-dir /path/to/images \
        --api-key YOUR_KEY \
        --project hs-teeth \
        [--dry-run] [--resume]

    # Resume interrupted upload:
    python -m src.roboflow_prediction_upload \
        --batch-id rf_batch_2026_03_16_a \
        --image-dir /path/to/images \
        --api-key YOUR_KEY \
        --project hs-teeth \
        --resume
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Optional

try:
    from roboflow import Roboflow
except ImportError:
    print("ERROR: roboflow required. Install with: pip install roboflow")
    sys.exit(1)

from src.batch_manifest import BatchManifest


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_RETRIES = 3
RETRY_BACKOFF = [2, 5, 15]  # Seconds to wait between retries


def load_upload_state(manifest: BatchManifest) -> dict:
    """Load existing upload manifest for resume mode."""
    data = manifest.load_json(manifest.upload_manifest_path)
    if data and isinstance(data, dict):
        return data
    return {"uploaded": {}, "failed": {}, "skipped": []}


def run_upload(
    batch_id: str,
    image_dir: Path,
    api_key: str,
    project_name: str,
    dry_run: bool,
    resume: bool,
) -> None:
    """Upload predictions as Roboflow Label Assist suggestions."""

    manifest = BatchManifest(batch_id=batch_id)
    label_dir = manifest.label_export_dir

    if not label_dir.exists():
        print(f"ERROR: Label directory not found: {label_dir}")
        print(f"  Run auto_label_batch.py first to generate labels.")
        sys.exit(1)

    # Load cleaned predictions for metadata
    cleaned = manifest.load_json(manifest.cleaned_predictions_path)
    if not cleaned:
        print("ERROR: No cleaned predictions found. Run auto_label_batch.py first.")
        sys.exit(1)

    # Build image→label pairs
    pairs = []
    no_label = 0
    for pred in cleaned:
        filename = pred["filename"]
        img_path = image_dir / filename
        stem = Path(filename).stem
        label_path = label_dir / f"{stem}.txt"

        if not img_path.exists():
            continue
        if not label_path.exists() or label_path.stat().st_size == 0:
            no_label += 1
            continue
        pairs.append((img_path, label_path, pred))

    print(f"Batch: {batch_id}")
    print(f"  Images with labels: {len(pairs)}")
    print(f"  Images without labels (0 detections): {no_label}")
    print(f"  Project: {project_name}")
    print(f"  Dry run: {dry_run}")
    print()

    # Resume: load previous state
    state = load_upload_state(manifest) if resume else {"uploaded": {}, "failed": {}, "skipped": []}
    already_uploaded = set(state["uploaded"].keys())
    if already_uploaded:
        print(f"  Resuming: {len(already_uploaded)} already uploaded, skipping")
        pairs = [(ip, lp, p) for ip, lp, p in pairs if ip.name not in already_uploaded]
        print(f"  Remaining: {len(pairs)}")
    print()

    if dry_run:
        print("DRY RUN — would upload these:")
        for img_path, label_path, pred in pairs[:10]:
            det_count = pred["detection_count"]
            print(f"  {img_path.name} → {label_path.name} ({det_count} dets)")
        if len(pairs) > 10:
            print(f"  ... and {len(pairs) - 10} more")
        return

    # Connect to Roboflow
    print("Connecting to Roboflow...")
    rf = Roboflow(api_key=api_key)
    workspace = rf.workspace()
    project = workspace.project(project_name)
    print(f"  Connected: {workspace.name} / {project_name}")
    print()

    # Upload with retry
    success = 0
    failed = 0

    for i, (img_path, label_path, pred) in enumerate(pairs):
        uploaded = False

        for attempt in range(MAX_RETRIES):
            try:
                project.upload(
                    image_path=str(img_path),
                    annotation_path=str(label_path),
                    is_prediction=True,
                    split="train",
                )
                state["uploaded"][img_path.name] = {
                    "label_file": label_path.name,
                    "detection_count": pred["detection_count"],
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                }
                success += 1
                uploaded = True
                break

            except Exception as e:
                err_str = str(e)
                if attempt < MAX_RETRIES - 1:
                    wait = RETRY_BACKOFF[attempt]
                    if failed <= 3:
                        print(f"  RETRY {img_path.name} (attempt {attempt+2}): {err_str[:100]}")
                    time.sleep(wait)
                else:
                    state["failed"][img_path.name] = {
                        "error": err_str[:500],
                        "attempts": MAX_RETRIES,
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    }
                    failed += 1
                    if failed <= 5:
                        print(f"  FAILED {img_path.name}: {err_str[:200]}")
                    elif failed == 6:
                        print("  (suppressing further error messages...)")

        # Progress update and incremental save
        if (i + 1) % 25 == 0:
            print(f"  [{i+1}/{len(pairs)}] uploaded={success} failed={failed}")
            manifest.save_json(manifest.upload_manifest_path, state)
            time.sleep(1)  # Rate limit courtesy

    # Save final state
    manifest.save_json(manifest.upload_manifest_path, state)

    # Save failures separately for easy retry
    if state["failed"]:
        manifest.save_json(manifest.upload_failures_path, state["failed"])

    # Report
    print("\n" + "=" * 60)
    print(f"UPLOAD COMPLETE: {batch_id}")
    print("=" * 60)
    print(f"  Uploaded:     {success}")
    print(f"  Failed:       {failed}")
    print(f"  Previously:   {len(already_uploaded)}")
    print(f"  Total in RF:  {success + len(already_uploaded)}")
    print(f"\n  Manifest: {manifest.upload_manifest_path}")
    if failed > 0:
        print(f"  Failures: {manifest.upload_failures_path}")
    print(f"\n  REMINDER: All annotations are DRAFT predictions.")
    print(f"  Review at https://app.roboflow.com before promoting to ground truth.")


def main():
    parser = argparse.ArgumentParser(
        description="Upload auto-labels to Roboflow as draft predictions"
    )
    parser.add_argument(
        "--batch-id", type=str, required=True,
        help="Batch ID from auto_label_batch.py"
    )
    parser.add_argument(
        "--image-dir", type=Path, required=True,
        help="Directory containing the original images"
    )
    parser.add_argument(
        "--api-key", type=str, required=True,
        help="Roboflow API key"
    )
    parser.add_argument(
        "--project", type=str, default="hs-teeth",
        help="Roboflow project ID (default: hs-teeth)"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview what would be uploaded without uploading"
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="Resume an interrupted upload (skips already-uploaded images)"
    )

    args = parser.parse_args()

    if not args.image_dir.is_dir():
        print(f"ERROR: Image directory not found: {args.image_dir}")
        sys.exit(1)

    run_upload(
        batch_id=args.batch_id,
        image_dir=args.image_dir,
        api_key=args.api_key,
        project_name=args.project,
        dry_run=args.dry_run,
        resume=args.resume,
    )


if __name__ == "__main__":
    main()
