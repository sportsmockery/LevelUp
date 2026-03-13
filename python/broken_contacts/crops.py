"""Crop generation for interproximal contact regions between adjacent teeth."""

from pathlib import Path
from typing import List, Optional, Tuple

import json
import numpy as np
from PIL import Image

from broken_contacts.config import Config
from broken_contacts.utils import sort_boxes_left_to_right, boxes_vertically_overlap, ensure_dir


def derive_contact_box(
    left_box: np.ndarray,
    right_box: np.ndarray,
    padding_frac: float,
    image_width: int,
    image_height: int,
) -> List[float]:
    """Derive the interproximal contact region between two adjacent tooth boxes.

    The contact zone spans from the right edge of the left tooth to the left edge
    of the right tooth, with vertical extent covering the overlap region, plus padding.

    Args:
        left_box: [x1, y1, x2, y2] of the left tooth.
        right_box: [x1, y1, x2, y2] of the right tooth.
        padding_frac: Fraction of region size to add as padding.
        image_width: Source image width for clamping.
        image_height: Source image height for clamping.

    Returns:
        [x1, y1, x2, y2] of the contact region.
    """
    # Horizontal: right edge of left tooth to left edge of right tooth
    cx1 = left_box[2]
    cx2 = right_box[0]

    # If teeth overlap horizontally, use the overlap midpoint with a fixed width
    if cx1 >= cx2:
        mid_x = (cx1 + cx2) / 2
        width = max(left_box[2] - left_box[0], right_box[2] - right_box[0]) * 0.3
        cx1 = mid_x - width / 2
        cx2 = mid_x + width / 2

    # Vertical: overlap region of the two teeth
    cy1 = max(left_box[1], right_box[1])
    cy2 = min(left_box[3], right_box[3])

    # If no vertical overlap, use the full vertical extent
    if cy1 >= cy2:
        cy1 = min(left_box[1], right_box[1])
        cy2 = max(left_box[3], right_box[3])

    # Apply padding
    w = cx2 - cx1
    h = cy2 - cy1
    pad_x = w * padding_frac
    pad_y = h * padding_frac
    cx1 = max(0, cx1 - pad_x)
    cy1 = max(0, cy1 - pad_y)
    cx2 = min(image_width, cx2 + pad_x)
    cy2 = min(image_height, cy2 + pad_y)

    return [round(cx1, 2), round(cy1, 2), round(cx2, 2), round(cy2, 2)]


def find_adjacent_pairs(
    tooth_boxes: List[np.ndarray],
    tooth_confs: List[float],
    min_overlap_y: float,
) -> List[Tuple[int, int]]:
    """Find pairs of adjacent teeth (sorted left-to-right, vertically overlapping).

    Returns:
        List of (left_index, right_index) pairs into the sorted arrays.
    """
    sorted_boxes, sorted_confs, _ = sort_boxes_left_to_right(tooth_boxes, tooth_confs)
    pairs = []
    for i in range(len(sorted_boxes) - 1):
        if boxes_vertically_overlap(sorted_boxes[i], sorted_boxes[i + 1], min_overlap_y):
            pairs.append((i, i + 1))
    return pairs


def generate_crops(
    image: Image.Image,
    tooth_boxes: List[np.ndarray],
    tooth_confs: List[float],
    ipr_boxes: Optional[List[np.ndarray]] = None,
    ipr_confs: Optional[List[float]] = None,
    config: Optional[Config] = None,
    output_dir: Optional[Path] = None,
    image_name: str = "image",
) -> List[dict]:
    """Generate interproximal contact crops from detected teeth.

    If interproximal_region detections are available, those are preferred.
    Otherwise, crops are derived from adjacent tooth bounding boxes.

    Args:
        image: Source PIL image.
        tooth_boxes: Detected tooth bounding boxes.
        tooth_confs: Tooth detection confidences.
        ipr_boxes: Optional interproximal region detections.
        ipr_confs: Optional interproximal region confidences.
        config: Pipeline config.
        output_dir: If provided, save crops to this directory.
        image_name: Base name for saved crop files.

    Returns:
        List of crop metadata dicts.
    """
    if config is None:
        config = Config()

    sorted_boxes, sorted_confs, _ = sort_boxes_left_to_right(tooth_boxes, tooth_confs)
    pairs = find_adjacent_pairs(sorted_boxes, sorted_confs, config.min_tooth_overlap_y)

    w, h = image.size
    crops_meta = []

    for pair_idx, (li, ri) in enumerate(pairs):
        left_box = sorted_boxes[li]
        right_box = sorted_boxes[ri]

        # Prefer detected interproximal region if one falls between this pair
        contact_box = None
        ipr_conf = None
        if ipr_boxes:
            for ib, ic in zip(ipr_boxes, ipr_confs or [0.0] * len(ipr_boxes)):
                ipr_cx = (ib[0] + ib[2]) / 2
                if left_box[0] < ipr_cx < right_box[2]:
                    contact_box = [round(float(c), 2) for c in ib]
                    ipr_conf = round(float(ic), 4)
                    break

        if contact_box is None:
            contact_box = derive_contact_box(left_box, right_box, config.interproximal_padding, w, h)

        # Crop the image
        crop_region = (
            int(contact_box[0]),
            int(contact_box[1]),
            int(contact_box[2]),
            int(contact_box[3]),
        )
        cropped = image.crop(crop_region)
        cropped = cropped.resize((config.crop_size, config.crop_size), Image.LANCZOS)

        crop_path = None
        if output_dir is not None:
            ensure_dir(output_dir)
            crop_filename = f"{image_name}_contact_{pair_idx}.jpg"
            crop_path = str(output_dir / crop_filename)
            cropped.save(crop_path, quality=95)

        meta = {
            "pair_index": pair_idx,
            "left_tooth_box": [round(float(c), 2) for c in left_box],
            "right_tooth_box": [round(float(c), 2) for c in right_box],
            "contact_box": contact_box,
            "left_tooth_conf": round(float(sorted_confs[li]), 4),
            "right_tooth_conf": round(float(sorted_confs[ri]), 4),
            "interproximal_region_conf": ipr_conf,
            "crop_path": crop_path,
            "crop_image": cropped,  # kept in memory for classifier
        }
        crops_meta.append(meta)

    return crops_meta


def generate_crops_from_labels(
    image_path: str,
    label_path: str,
    config: Optional[Config] = None,
    output_dir: Optional[Path] = None,
) -> List[dict]:
    """Generate crops from a YOLO label file (for building classifier training data).

    Args:
        image_path: Path to the source image.
        label_path: Path to the YOLO label .txt file.
        config: Pipeline config.
        output_dir: Directory to save crops.

    Returns:
        List of crop metadata dicts.
    """
    if config is None:
        config = Config()

    image = Image.open(image_path).convert("RGB")
    w, h = image.size
    image_name = Path(image_path).stem

    tooth_boxes = []
    tooth_confs = []
    ipr_boxes = []
    ipr_confs = []

    with open(label_path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            cls_id = int(parts[0])
            xc, yc, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])

            # Convert YOLO normalized to pixel coords
            x1 = (xc - bw / 2) * w
            y1 = (yc - bh / 2) * h
            x2 = (xc + bw / 2) * w
            y2 = (yc + bh / 2) * h
            box = np.array([x1, y1, x2, y2])

            if cls_id == 0:  # tooth
                tooth_boxes.append(box)
                tooth_confs.append(1.0)  # ground truth, full confidence
            elif cls_id == 1:  # interproximal_region
                ipr_boxes.append(box)
                ipr_confs.append(1.0)

    return generate_crops(
        image=image,
        tooth_boxes=tooth_boxes,
        tooth_confs=tooth_confs,
        ipr_boxes=ipr_boxes if ipr_boxes else None,
        ipr_confs=ipr_confs if ipr_confs else None,
        config=config,
        output_dir=output_dir,
        image_name=image_name,
    )
