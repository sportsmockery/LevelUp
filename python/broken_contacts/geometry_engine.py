"""Geometry Engine — mask-to-mask shortest distance, relational crops, drift logging.

Implements the Stage 2 Graph Builder with:
- Marriage rules: distal[i] ↔ mesial[i+1] only
- Shortest Euclidean distance between surface masks
- Relational centering for 512×512 crops
- Drift analysis: YOLO box center vs relational centroid
"""

import math
from dataclasses import dataclass, asdict
from typing import List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image
from scipy.spatial.distance import cdist


@dataclass
class ContactGeometry:
    """Full geometric measurement for one contact pair."""
    pair_index: int
    left_tooth_index: int
    right_tooth_index: int
    d_min_px: float                  # shortest distance between surfaces
    contact_midpoint: List[float]    # [x, y] center of shortest path
    surface_point_distal: List[float]
    surface_point_mesial: List[float]
    yolo_box_center: List[float]     # midpoint of the two YOLO tooth boxes
    relational_centroid: List[float] # the mask-derived true contact center
    centroid_drift_px: float         # distance between YOLO center and relational center
    rotation_angle_deg: float
    has_ortho_overlap: bool = False


@dataclass
class DriftLog:
    """Per-pair drift between YOLO proposals and mask-derived geometry."""
    pair_index: int
    yolo_center: List[float]
    relational_center: List[float]
    drift_px: float
    d_min_px: float
    iteration: int = 0


class GeometryEngine:
    """Computes relational geometry between adjacent dental surfaces.

    Marriage rule: Only pairs distal_surface of tooth[i] with
    mesial_surface of tooth[i+1]. Never cross-pairs.
    """

    def __init__(self, crop_size: int = 512, min_overlap_y: float = 0.3):
        self.crop_size = crop_size
        self.min_overlap_y = min_overlap_y
        self.drift_history: List[DriftLog] = []

    def compute_contacts(
        self,
        image: np.ndarray,
        tooth_boxes: List[np.ndarray],
        tooth_confs: List[float],
        distal_masks: List[Optional[np.ndarray]],
        mesial_masks: List[Optional[np.ndarray]],
        ortho_masks: Optional[List[np.ndarray]] = None,
        iteration: int = 0,
    ) -> Tuple[List[ContactGeometry], List[np.ndarray]]:
        """Compute contact geometry and crops for all adjacent tooth pairs.

        Args:
            image: Source image (BGR or RGB).
            tooth_boxes: Sorted L-to-R tooth bounding boxes [x1,y1,x2,y2].
            tooth_confs: Confidence scores.
            distal_masks: Per-tooth distal surface masks (or None).
            mesial_masks: Per-tooth mesial surface masks (or None).
            ortho_masks: Orthodontic hardware masks for exclusion.
            iteration: Current training iteration for drift tracking.

        Returns:
            (geometries, crops) — list of ContactGeometry and corresponding crop images.
        """
        n = len(tooth_boxes)
        if n < 2:
            return [], []

        img_h, img_w = image.shape[:2]
        geometries: List[ContactGeometry] = []
        crops: List[np.ndarray] = []

        for i in range(n - 1):
            left_box = tooth_boxes[i]
            right_box = tooth_boxes[i + 1]

            # Check vertical overlap (same arch)
            if not self._vertical_overlap(left_box, right_box):
                continue

            # Get masks or fall back to box edges
            mask_d = distal_masks[i] if i < len(distal_masks) and distal_masks[i] is not None else None
            mask_m = mesial_masks[i + 1] if (i + 1) < len(mesial_masks) and mesial_masks[i + 1] is not None else None

            if mask_d is not None and mask_m is not None:
                geo = self._geometry_from_masks(i, left_box, right_box, mask_d, mask_m, img_w, img_h)
            else:
                geo = self._geometry_from_boxes(i, left_box, right_box, img_w, img_h)

            # Check ortho hardware overlap
            if ortho_masks:
                geo.has_ortho_overlap = self._check_ortho_overlap(
                    geo.contact_midpoint, ortho_masks, radius=50.0
                )

            # Log drift
            drift = DriftLog(
                pair_index=i,
                yolo_center=geo.yolo_box_center,
                relational_center=geo.relational_centroid,
                drift_px=geo.centroid_drift_px,
                d_min_px=geo.d_min_px,
                iteration=iteration,
            )
            self.drift_history.append(drift)

            # Generate relational crop
            crop = self._extract_crop(
                image, geo.relational_centroid[0], geo.relational_centroid[1],
                geo.rotation_angle_deg, img_h, img_w,
            )

            geometries.append(geo)
            crops.append(crop)

        return geometries, crops

    def _geometry_from_masks(
        self, pair_idx: int,
        left_box: np.ndarray, right_box: np.ndarray,
        mask_d: np.ndarray, mask_m: np.ndarray,
        img_w: int, img_h: int,
    ) -> ContactGeometry:
        """Compute geometry using actual surface masks (shortest distance)."""
        coords_d = np.argwhere(mask_d > 0)  # [y, x]
        coords_m = np.argwhere(mask_m > 0)

        if len(coords_d) == 0 or len(coords_m) == 0:
            return self._geometry_from_boxes(pair_idx, left_box, right_box, img_w, img_h)

        distances = cdist(coords_d, coords_m)
        min_idx = np.unravel_index(np.argmin(distances), distances.shape)
        d_min = float(distances[min_idx])

        p_d = coords_d[min_idx[0]]  # [y, x]
        p_m = coords_m[min_idx[1]]

        # Relational centroid = midpoint of shortest path
        rel_cx = (p_d[1] + p_m[1]) / 2
        rel_cy = (p_d[0] + p_m[0]) / 2

        # YOLO box center = midpoint of two tooth box centers
        yolo_cx = ((left_box[0] + left_box[2]) / 2 + (right_box[0] + right_box[2]) / 2) / 2
        yolo_cy = ((left_box[1] + left_box[3]) / 2 + (right_box[1] + right_box[3]) / 2) / 2

        drift = float(np.sqrt((yolo_cx - rel_cx)**2 + (yolo_cy - rel_cy)**2))

        # Rotation angle
        dy = p_m[0] - p_d[0]
        dx = p_m[1] - p_d[1]
        angle = math.degrees(math.atan2(dy, dx))

        return ContactGeometry(
            pair_index=pair_idx,
            left_tooth_index=pair_idx,
            right_tooth_index=pair_idx + 1,
            d_min_px=round(d_min, 2),
            contact_midpoint=[round(rel_cx, 2), round(rel_cy, 2)],
            surface_point_distal=[round(float(p_d[1]), 2), round(float(p_d[0]), 2)],
            surface_point_mesial=[round(float(p_m[1]), 2), round(float(p_m[0]), 2)],
            yolo_box_center=[round(yolo_cx, 2), round(yolo_cy, 2)],
            relational_centroid=[round(rel_cx, 2), round(rel_cy, 2)],
            centroid_drift_px=round(drift, 2),
            rotation_angle_deg=round(angle, 2),
        )

    def _geometry_from_boxes(
        self, pair_idx: int,
        left_box: np.ndarray, right_box: np.ndarray,
        img_w: int, img_h: int,
    ) -> ContactGeometry:
        """Fallback: derive geometry from bounding box edges."""
        p_d_x = float(left_box[2])
        p_m_x = float(right_box[0])
        y_top = max(float(left_box[1]), float(right_box[1]))
        y_bot = min(float(left_box[3]), float(right_box[3]))
        if y_top >= y_bot:
            y_top = min(float(left_box[1]), float(right_box[1]))
            y_bot = max(float(left_box[3]), float(right_box[3]))

        rel_cx = (p_d_x + p_m_x) / 2
        rel_cy = (y_top + y_bot) / 2
        d_min = abs(p_m_x - p_d_x)

        yolo_cx = ((left_box[0] + left_box[2]) / 2 + (right_box[0] + right_box[2]) / 2) / 2
        yolo_cy = ((left_box[1] + left_box[3]) / 2 + (right_box[1] + right_box[3]) / 2) / 2
        drift = float(np.sqrt((yolo_cx - rel_cx)**2 + (yolo_cy - rel_cy)**2))

        return ContactGeometry(
            pair_index=pair_idx,
            left_tooth_index=pair_idx,
            right_tooth_index=pair_idx + 1,
            d_min_px=round(d_min, 2),
            contact_midpoint=[round(rel_cx, 2), round(rel_cy, 2)],
            surface_point_distal=[round(p_d_x, 2), round(rel_cy, 2)],
            surface_point_mesial=[round(p_m_x, 2), round(rel_cy, 2)],
            yolo_box_center=[round(yolo_cx, 2), round(yolo_cy, 2)],
            relational_centroid=[round(rel_cx, 2), round(rel_cy, 2)],
            centroid_drift_px=round(drift, 2),
            rotation_angle_deg=0.0,
        )

    def _extract_crop(
        self, img: np.ndarray, cx: float, cy: float,
        angle: float, img_h: int, img_w: int,
    ) -> np.ndarray:
        half = self.crop_size // 2
        x1 = max(0, int(cx - half))
        y1 = max(0, int(cy - half))
        x2 = min(img_w, int(cx + half))
        y2 = min(img_h, int(cy + half))
        crop = img[y1:y2, x1:x2]
        if crop.shape[0] < self.crop_size or crop.shape[1] < self.crop_size:
            padded = np.zeros((self.crop_size, self.crop_size, 3), dtype=np.uint8)
            h, w = min(crop.shape[0], self.crop_size), min(crop.shape[1], self.crop_size)
            padded[:h, :w] = crop[:h, :w]
            crop = padded
        return crop

    def _vertical_overlap(self, a: np.ndarray, b: np.ndarray) -> bool:
        y_top = max(a[1], b[1])
        y_bot = min(a[3], b[3])
        overlap = max(0, y_bot - y_top)
        min_h = min(a[3] - a[1], b[3] - b[1])
        if min_h <= 0:
            return False
        return (overlap / min_h) >= self.min_overlap_y

    @staticmethod
    def _check_ortho_overlap(
        midpoint: List[float], ortho_masks: List[np.ndarray], radius: float
    ) -> bool:
        mx, my = int(midpoint[0]), int(midpoint[1])
        for mask in ortho_masks:
            if mask is None:
                continue
            y1 = max(0, my - int(radius))
            y2 = min(mask.shape[0], my + int(radius))
            x1 = max(0, mx - int(radius))
            x2 = min(mask.shape[1], mx + int(radius))
            if mask[y1:y2, x1:x2].sum() > 0:
                return True
        return False

    def get_drift_summary(self) -> dict:
        """Summarize drift trends across all logged pairs."""
        if not self.drift_history:
            return {"total_pairs": 0}

        drifts = [d.drift_px for d in self.drift_history]
        d_mins = [d.d_min_px for d in self.drift_history]
        iterations = set(d.iteration for d in self.drift_history)

        per_iter = {}
        for it in sorted(iterations):
            iter_drifts = [d.drift_px for d in self.drift_history if d.iteration == it]
            per_iter[it] = {
                "mean_drift": round(np.mean(iter_drifts), 2),
                "pairs": len(iter_drifts),
            }

        return {
            "total_pairs": len(self.drift_history),
            "mean_drift_px": round(float(np.mean(drifts)), 2),
            "mean_d_min_px": round(float(np.mean(d_mins)), 2),
            "per_iteration": per_iter,
        }
