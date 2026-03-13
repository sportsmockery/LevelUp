"""Shared utilities for the broken contacts pipeline."""

from pathlib import Path
from typing import List, Tuple

import numpy as np


def sort_boxes_left_to_right(
    boxes: List[np.ndarray],
    confidences: List[float],
) -> Tuple[List[np.ndarray], List[float], List[int]]:
    """Sort bounding boxes left-to-right by x-center.

    Args:
        boxes: List of [x1, y1, x2, y2] arrays.
        confidences: Corresponding confidence scores.

    Returns:
        Tuple of (sorted_boxes, sorted_confidences, original_indices).
    """
    if not boxes:
        return [], [], []

    x_centers = [(b[0] + b[2]) / 2 for b in boxes]
    order = np.argsort(x_centers).tolist()

    sorted_boxes = [boxes[i] for i in order]
    sorted_confs = [confidences[i] for i in order]
    return sorted_boxes, sorted_confs, order


def boxes_vertically_overlap(
    box_a: np.ndarray, box_b: np.ndarray, min_overlap: float = 0.3
) -> bool:
    """Check if two boxes have sufficient vertical overlap to be considered adjacent.

    Args:
        box_a: [x1, y1, x2, y2]
        box_b: [x1, y1, x2, y2]
        min_overlap: Minimum fraction of the smaller box's height that must overlap.

    Returns:
        True if boxes overlap vertically above the threshold.
    """
    y_top = max(box_a[1], box_b[1])
    y_bot = min(box_a[3], box_b[3])
    overlap = max(0, y_bot - y_top)

    height_a = box_a[3] - box_a[1]
    height_b = box_b[3] - box_b[1]
    min_height = min(height_a, height_b)

    if min_height <= 0:
        return False

    return (overlap / min_height) >= min_overlap


def ensure_dir(path: Path) -> Path:
    """Create directory if it doesn't exist, return the path."""
    path.mkdir(parents=True, exist_ok=True)
    return path
