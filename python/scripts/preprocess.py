"""Preprocessing script for the relational dental contact pipeline.

Loads Stage 1 segmentation masks, computes distance-minimized contact centroids,
extracts 512x512 relational crops, and organizes them by clinical label for
Stage 3 classifier training.

Usage:
    python scripts/preprocess.py \
        --images data/processed/images/train \
        --labels-stage1 data/processed/labels_stage1 \
        --labels-relational data/processed/labels_relational \
        --output data/processed/crops \
        --crop-size 512

    # With a trained detector model (generates masks from raw images):
    python scripts/preprocess.py \
        --images data/raw \
        --detector runs/detect/contacts_detector_v1/weights/best.pt \
        --labels-relational data/processed/labels_relational \
        --output data/processed/crops \
        --crop-size 512
"""

import argparse
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image
from scipy.spatial.distance import cdist

from broken_contacts.config import Config
from broken_contacts.utils import ensure_dir


def load_yolo_labels(label_path: str, img_w: int, img_h: int) -> Dict[int, List[np.ndarray]]:
    """Load YOLO format labels and group by class_id.

    Returns:
        Dict mapping class_id -> list of [x1, y1, x2, y2] boxes.
    """
    boxes_by_class: Dict[int, List[np.ndarray]] = {}

    with open(label_path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            cls_id = int(parts[0])
            xc, yc, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])

            x1 = (xc - bw / 2) * img_w
            y1 = (yc - bh / 2) * img_h
            x2 = (xc + bw / 2) * img_w
            y2 = (yc + bh / 2) * img_h

            if cls_id not in boxes_by_class:
                boxes_by_class[cls_id] = []
            boxes_by_class[cls_id].append(np.array([x1, y1, x2, y2]))

    return boxes_by_class


def load_relational_labels(json_path: str) -> Optional[dict]:
    """Load the relational pair annotation JSON for an image."""
    if not Path(json_path).exists():
        return None
    with open(json_path, "r") as f:
        return json.load(f)


def box_to_mask(box: np.ndarray, img_h: int, img_w: int) -> np.ndarray:
    """Convert a bounding box to a binary mask (fallback when no segmentation mask)."""
    mask = np.zeros((img_h, img_w), dtype=np.uint8)
    x1, y1, x2, y2 = [int(c) for c in box]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(img_w, x2), min(img_h, y2)
    mask[y1:y2, x1:x2] = 1
    return mask


def find_shortest_distance_centroid(
    mask_a: np.ndarray, mask_b: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, float, Tuple[float, float]]:
    """Find the shortest distance between two masks and the crop centroid.

    Returns:
        (point_a, point_b, distance, midpoint) where points are [y, x].
    """
    coords_a = np.argwhere(mask_a > 0)  # [y, x]
    coords_b = np.argwhere(mask_b > 0)

    if len(coords_a) == 0 or len(coords_b) == 0:
        raise ValueError("One or both masks are empty")

    distances = cdist(coords_a, coords_b)
    min_idx = np.unravel_index(np.argmin(distances), distances.shape)
    min_dist = float(distances[min_idx])

    p_a = coords_a[min_idx[0]]
    p_b = coords_b[min_idx[1]]

    midpoint = ((p_a[1] + p_b[1]) / 2, (p_a[0] + p_b[0]) / 2)  # (x, y)

    return p_a, p_b, min_dist, midpoint


def extract_relational_crop(
    img: np.ndarray,
    center_x: float,
    center_y: float,
    crop_size: int = 512,
    rotation_deg: float = 0.0,
) -> np.ndarray:
    """Extract a square crop centered on the contact centroid."""
    h, w = img.shape[:2]
    half = crop_size // 2

    if abs(rotation_deg) > 1.0:
        from PIL import Image as PILImage
        pil_img = PILImage.fromarray(img)
        rotated = pil_img.rotate(-rotation_deg, center=(center_x, center_y), expand=False, fillcolor=(0, 0, 0))
        img = np.array(rotated)

    y1 = max(0, int(center_y - half))
    x1 = max(0, int(center_x - half))
    y2 = min(h, int(center_y + half))
    x2 = min(w, int(center_x + half))

    crop = img[y1:y2, x1:x2]

    # Pad if needed
    if crop.shape[0] < crop_size or crop.shape[1] < crop_size:
        padded = np.zeros((crop_size, crop_size, 3), dtype=np.uint8)
        ph, pw = min(crop.shape[0], crop_size), min(crop.shape[1], crop_size)
        padded[:ph, :pw] = crop[:ph, :pw]
        crop = padded

    return crop


def assign_surfaces_to_teeth(
    tooth_boxes: List[np.ndarray],
    distal_boxes: List[np.ndarray],
    mesial_boxes: List[np.ndarray],
) -> Tuple[List[Optional[np.ndarray]], List[Optional[np.ndarray]]]:
    """Assign detected surface boxes to their nearest tooth.

    Returns:
        (per_tooth_distal, per_tooth_mesial) lists aligned with tooth_boxes.
    """
    per_tooth_distal: List[Optional[np.ndarray]] = [None] * len(tooth_boxes)
    per_tooth_mesial: List[Optional[np.ndarray]] = [None] * len(tooth_boxes)

    tooth_centers = [((b[0] + b[2]) / 2, (b[1] + b[3]) / 2) for b in tooth_boxes]

    for sb in distal_boxes:
        scx, scy = (sb[0] + sb[2]) / 2, (sb[1] + sb[3]) / 2
        best_i = min(range(len(tooth_centers)),
                     key=lambda i: (scx - tooth_centers[i][0])**2 + (scy - tooth_centers[i][1])**2)
        per_tooth_distal[best_i] = sb

    for sb in mesial_boxes:
        scx, scy = (sb[0] + sb[2]) / 2, (sb[1] + sb[3]) / 2
        best_i = min(range(len(tooth_centers)),
                     key=lambda i: (scx - tooth_centers[i][0])**2 + (scy - tooth_centers[i][1])**2)
        per_tooth_mesial[best_i] = sb

    return per_tooth_distal, per_tooth_mesial


def process_image(
    image_path: Path,
    label_path: Optional[Path],
    relational_path: Optional[Path],
    output_dir: Path,
    crop_size: int,
    config: Config,
    detector=None,
) -> List[dict]:
    """Process a single image: detect surfaces, build pairs, extract crops.

    If relational labels exist, uses them for clinical label assignment.
    Otherwise, saves crops to 'unsorted/' for manual labeling.
    """
    image = Image.open(str(image_path)).convert("RGB")
    img_np = np.array(image)
    img_h, img_w = img_np.shape[:2]

    # Load Stage 1 detections
    if detector is not None:
        from broken_contacts.detector import ContactDetector
        stage1 = detector.detect(image)
        tooth_boxes = stage1.tooth_boxes
        distal_boxes_for_mask = stage1.distal_masks  # may be actual masks
        mesial_boxes_for_mask = stage1.mesial_masks
    elif label_path and label_path.exists():
        boxes_by_class = load_yolo_labels(str(label_path), img_w, img_h)
        tooth_boxes = boxes_by_class.get(0, [])
        distal_boxes = boxes_by_class.get(2, [])
        mesial_boxes = boxes_by_class.get(1, [])
        gap_boxes = boxes_by_class.get(5, [])
        restoration_boxes = boxes_by_class.get(4, [])

        if not tooth_boxes:
            return []

        # Sort teeth left-to-right
        x_centers = [(b[0] + b[2]) / 2 for b in tooth_boxes]
        order = np.argsort(x_centers).tolist()
        tooth_boxes = [tooth_boxes[i] for i in order]

        # Assign surfaces to teeth
        per_tooth_distal, per_tooth_mesial = assign_surfaces_to_teeth(
            tooth_boxes, distal_boxes, mesial_boxes
        )
        distal_boxes_for_mask = per_tooth_distal
        mesial_boxes_for_mask = per_tooth_mesial
    else:
        return []

    # Load relational labels
    relational = load_relational_labels(str(relational_path)) if relational_path else None
    pair_labels = {}
    if relational and "contact_pairs" in relational:
        for cp in relational["contact_pairs"]:
            pair_key = tuple(cp["member_ids"])
            pair_labels[pair_key] = cp["labels"].get("clinical", "unsorted")

    # Build pairs and extract crops
    crops_metadata = []
    image_name = image_path.stem

    for i in range(len(tooth_boxes) - 1):
        left_box = tooth_boxes[i]
        right_box = tooth_boxes[i + 1]

        # Get surface representations
        left_distal = distal_boxes_for_mask[i] if i < len(distal_boxes_for_mask) else None
        right_mesial = mesial_boxes_for_mask[i + 1] if (i + 1) < len(mesial_boxes_for_mask) else None

        # Build masks from boxes if we have boxes, not masks
        if left_distal is not None and isinstance(left_distal, np.ndarray):
            if left_distal.ndim == 1:  # it's a box [x1,y1,x2,y2]
                mask_d = box_to_mask(left_distal, img_h, img_w)
            else:  # it's already a mask
                mask_d = left_distal
        else:
            # Fallback: use right edge of left tooth box
            fake_box = np.array([left_box[2] - 5, left_box[1], left_box[2], left_box[3]])
            mask_d = box_to_mask(fake_box, img_h, img_w)

        if right_mesial is not None and isinstance(right_mesial, np.ndarray):
            if right_mesial.ndim == 1:
                mask_m = box_to_mask(right_mesial, img_h, img_w)
            else:
                mask_m = right_mesial
        else:
            fake_box = np.array([right_box[0], right_box[1], right_box[0] + 5, right_box[3]])
            mask_m = box_to_mask(fake_box, img_h, img_w)

        # Find shortest distance centroid
        try:
            p_d, p_m, dist, (cx, cy) = find_shortest_distance_centroid(mask_d, mask_m)
        except ValueError:
            continue

        # Compute rotation angle
        dy = p_m[0] - p_d[0]
        dx = p_m[1] - p_d[1]
        import math
        angle_deg = math.degrees(math.atan2(dy, dx))

        # Extract crop
        crop = extract_relational_crop(
            img_np, cx, cy,
            crop_size=crop_size,
            rotation_deg=angle_deg if config.rotation_normalize else 0.0,
        )

        # Determine clinical label from relational annotations
        pair_key = (i, i + 1)
        clinical_label = pair_labels.get(pair_key, "unsorted")

        # Save crop
        label_dir = ensure_dir(output_dir / clinical_label)
        crop_filename = f"{image_name}_pair_{i}_{i+1}.jpg"
        crop_path = label_dir / crop_filename
        Image.fromarray(crop).save(str(crop_path), quality=95)

        crops_metadata.append({
            "source_image": str(image_path),
            "pair_index": [i, i + 1],
            "contact_distance_px": round(dist, 2),
            "contact_centroid": [round(cx, 2), round(cy, 2)],
            "rotation_deg": round(angle_deg, 2),
            "clinical_label": clinical_label,
            "crop_path": str(crop_path),
        })

    return crops_metadata


def main():
    parser = argparse.ArgumentParser(description="Preprocess dental images for relational pipeline")
    parser.add_argument("--images", type=str, required=True, help="Directory of source images")
    parser.add_argument("--labels-stage1", type=str, default=None,
                        help="Directory of YOLO label files (labels_stage1)")
    parser.add_argument("--labels-relational", type=str, default=None,
                        help="Directory of relational JSON annotations")
    parser.add_argument("--detector", type=str, default=None,
                        help="Trained detector model path (alternative to labels-stage1)")
    parser.add_argument("--output", type=str, required=True, help="Output directory for crops")
    parser.add_argument("--crop-size", type=int, default=512, help="Crop size (default: 512)")
    args = parser.parse_args()

    images_dir = Path(args.images)
    output_dir = Path(args.output)
    labels_dir = Path(args.labels_stage1) if args.labels_stage1 else None
    rel_dir = Path(args.labels_relational) if args.labels_relational else None

    if not images_dir.is_dir():
        raise NotADirectoryError(f"Images directory not found: {images_dir}")

    config = Config()
    config.crop_size = args.crop_size

    # Optionally load detector
    detector = None
    if args.detector:
        from broken_contacts.detector import ContactDetector
        config.detector_model_path = args.detector
        detector = ContactDetector(config)
        print(f"Using detector model: {args.detector}")

    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    image_files = sorted(f for f in images_dir.rglob("*") if f.suffix.lower() in image_extensions)

    if not image_files:
        raise FileNotFoundError(f"No images found in {images_dir}")

    print(f"Processing {len(image_files)} images...")
    all_metadata = []

    for img_path in image_files:
        label_path = (labels_dir / f"{img_path.stem}.txt") if labels_dir else None
        rel_path = (rel_dir / f"{img_path.stem}.json") if rel_dir else None

        crops = process_image(
            image_path=img_path,
            label_path=label_path,
            relational_path=rel_path,
            output_dir=output_dir,
            crop_size=args.crop_size,
            config=config,
            detector=detector,
        )

        all_metadata.extend(crops)
        if crops:
            print(f"  {img_path.name}: {len(crops)} crops")

    # Save metadata
    meta_path = output_dir / "preprocessing_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(all_metadata, f, indent=2)

    # Summary
    label_counts: Dict[str, int] = {}
    for m in all_metadata:
        lbl = m["clinical_label"]
        label_counts[lbl] = label_counts.get(lbl, 0) + 1

    print(f"\nTotal crops: {len(all_metadata)}")
    print("By label:")
    for lbl, cnt in sorted(label_counts.items()):
        print(f"  {lbl}: {cnt}")
    print(f"\nMetadata: {meta_path}")

    if "unsorted" in label_counts:
        print(f"\n{label_counts['unsorted']} crops need manual labeling in {output_dir}/unsorted/")
        print("Move them into the appropriate clinical label folders.")


if __name__ == "__main__":
    main()
