"""Post-inference duplicate cleanup for YOLO predictions.

YOLO inference already applies NMS internally. This module handles
residual issues that NMS doesn't catch:

1. Near-exact duplicates: Same class, IoU > 0.85 → keep higher confidence
2. Same-class severe overlap: Same class, IoU > 0.60 → keep higher confidence
3. Cross-class overlap: Different classes, IoU > 0.70 → flag for review (keep both)

All removed/flagged detections are logged for audit.
"""

from typing import List, Dict, Tuple


# Default thresholds (configurable via args)
NEAR_EXACT_IOU = 0.85     # Same class, nearly identical boxes
SAME_CLASS_IOU = 0.60     # Same class, significant overlap
CROSS_CLASS_IOU = 0.70    # Different classes, flag for review


def compute_iou(box_a: List[float], box_b: List[float]) -> float:
    """Compute IoU between two [x1, y1, x2, y2] boxes."""
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - inter
    if union <= 0:
        return 0.0
    return inter / union


def cleanup_predictions(
    detections: List[Dict],
    near_exact_iou: float = NEAR_EXACT_IOU,
    same_class_iou: float = SAME_CLASS_IOU,
    cross_class_iou: float = CROSS_CLASS_IOU,
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """Clean up post-YOLO predictions.

    Args:
        detections: List of dicts with keys: class_id, class_name, confidence, bbox [x1,y1,x2,y2]
        near_exact_iou: IoU threshold for near-exact duplicate removal
        same_class_iou: IoU threshold for same-class overlap removal
        cross_class_iou: IoU threshold for cross-class overlap flagging

    Returns:
        (kept, removed, flagged):
        - kept: Clean detections to export as labels
        - removed: Detections removed with reason
        - flagged: Cross-class overlaps flagged for human review
    """
    if not detections:
        return [], [], []

    # Sort by confidence descending
    dets = sorted(detections, key=lambda d: d["confidence"], reverse=True)

    kept = []
    removed = []
    flagged_pairs = set()  # Track (i, j) pairs already flagged

    for i, det in enumerate(dets):
        should_remove = False
        remove_reason = ""

        for j, kept_det in enumerate(kept):
            iou = compute_iou(det["bbox"], kept_det["bbox"])

            same_class = det["class_id"] == kept_det["class_id"]

            if same_class and iou > near_exact_iou:
                # Near-exact duplicate — remove lower confidence
                should_remove = True
                remove_reason = (
                    f"near_exact_duplicate: IoU={iou:.3f} with "
                    f"{kept_det['class_name']} (conf={kept_det['confidence']:.3f})"
                )
                break

            if same_class and iou > same_class_iou:
                # Same class severe overlap — remove lower confidence
                should_remove = True
                remove_reason = (
                    f"same_class_overlap: IoU={iou:.3f} with "
                    f"{kept_det['class_name']} (conf={kept_det['confidence']:.3f})"
                )
                break

            if not same_class and iou > cross_class_iou:
                # Cross-class overlap — flag for review but keep both
                pair_key = (min(i, j), max(i, j))
                if pair_key not in flagged_pairs:
                    flagged_pairs.add(pair_key)

        if should_remove:
            det_copy = dict(det)
            det_copy["removal_reason"] = remove_reason
            removed.append(det_copy)
        else:
            kept.append(det)

    # Build flagged list from pairs
    flagged = []
    all_dets_by_idx = {id(d): d for d in kept}
    # Re-check kept detections for cross-class flags
    for i in range(len(kept)):
        for j in range(i + 1, len(kept)):
            iou = compute_iou(kept[i]["bbox"], kept[j]["bbox"])
            if kept[i]["class_id"] != kept[j]["class_id"] and iou > cross_class_iou:
                flagged.append({
                    "det_a": {
                        "class_name": kept[i]["class_name"],
                        "class_id": kept[i]["class_id"],
                        "confidence": kept[i]["confidence"],
                    },
                    "det_b": {
                        "class_name": kept[j]["class_name"],
                        "class_id": kept[j]["class_id"],
                        "confidence": kept[j]["confidence"],
                    },
                    "iou": round(iou, 4),
                    "reason": "cross_class_overlap",
                })

    return kept, removed, flagged
