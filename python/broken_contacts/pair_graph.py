"""Stage 2: Geometric Graph Builder for relational dental contact analysis.

Builds a contact graph from Stage 1 detections by:
1. Ordering teeth left-to-right within arch-specific lanes
2. Pairing distal_surface of tooth[i] with mesial_surface of tooth[i+1]
3. Computing distance-minimized surface centroids for crop centering
4. Optionally rotating crops to normalize the contact vector
"""

import math
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image
from scipy.spatial.distance import cdist

from broken_contacts.config import Config
from broken_contacts.schemas import GeometricData
from broken_contacts.utils import ensure_dir


class PairGraphBuilder:
    """Builds relational pairs from tooth and surface detections.

    Moves beyond isolated tooth detection to pair-level relational analysis.
    Contact crops are centered on the shortest distance between surface masks,
    not on bounding box centers.
    """

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()

    def build_pairs_from_masks(
        self,
        image: Image.Image,
        tooth_boxes: List[np.ndarray],
        tooth_confs: List[float],
        distal_masks: Optional[List[Optional[np.ndarray]]] = None,
        mesial_masks: Optional[List[Optional[np.ndarray]]] = None,
        gap_candidates: Optional[List[np.ndarray]] = None,
        gap_confs: Optional[List[float]] = None,
        restoration_boxes: Optional[List[np.ndarray]] = None,
    ) -> List[dict]:
        """Build contact pairs using surface masks when available, falling back to boxes.

        Args:
            image: Source image.
            tooth_boxes: Detected tooth_crown bounding boxes [x1,y1,x2,y2], sorted L-to-R.
            tooth_confs: Confidence scores for each tooth.
            distal_masks: Per-tooth distal surface binary masks (same order as tooth_boxes).
                         None entries mean no mask detected for that tooth.
            mesial_masks: Per-tooth mesial surface binary masks.
            gap_candidates: Detected contact_gap_candidate bounding boxes.
            gap_confs: Confidence scores for gap candidates.
            restoration_boxes: Detected restoration_margin bounding boxes.

        Returns:
            List of pair metadata dicts with crops and geometric data.
        """
        n_teeth = len(tooth_boxes)
        if n_teeth < 2:
            return []

        img_np = np.array(image)
        h, w = img_np.shape[:2]
        pairs = []

        for i in range(n_teeth - 1):
            left_box = tooth_boxes[i]
            right_box = tooth_boxes[i + 1]

            # Check vertical overlap — skip if teeth aren't in same arch lane
            if not self._vertical_overlap(left_box, right_box):
                continue

            # --- Geometric crop centering ---
            has_masks = (
                distal_masks is not None
                and mesial_masks is not None
                and i < len(distal_masks)
                and (i + 1) < len(mesial_masks)
                and distal_masks[i] is not None
                and mesial_masks[i + 1] is not None
            )

            if has_masks:
                geo, crop = self._crop_from_masks(
                    img_np, distal_masks[i], mesial_masks[i + 1],
                    left_box, right_box, h, w,
                )
            else:
                geo, crop = self._crop_from_boxes(
                    img_np, left_box, right_box, h, w,
                )

            # Check for contact_gap_candidate verification
            gap_conf = self._find_gap_in_region(
                geo.contact_midpoint, gap_candidates, gap_confs
            )

            # Check for restoration near this contact
            has_restoration = self._restoration_near_contact(
                geo.contact_midpoint, left_box, right_box, restoration_boxes
            )

            crop_pil = Image.fromarray(crop) if crop.size > 0 else None

            pairs.append({
                "pair_index": len(pairs),
                "left_tooth_box": [round(float(c), 2) for c in left_box],
                "right_tooth_box": [round(float(c), 2) for c in right_box],
                "contact_box": [
                    round(geo.surface_point_left[0], 2),
                    round(min(geo.surface_point_left[1], geo.surface_point_right[1]), 2),
                    round(geo.surface_point_right[0], 2),
                    round(max(geo.surface_point_left[1], geo.surface_point_right[1]), 2),
                ],
                "left_tooth_conf": round(float(tooth_confs[i]), 4),
                "right_tooth_conf": round(float(tooth_confs[i + 1]), 4),
                "left_to_right_index": [i, i + 1],
                "contact_gap_conf": round(float(gap_conf), 4) if gap_conf else None,
                "has_restoration": has_restoration,
                "geometry": geo,
                "crop_image": crop_pil,
            })

        return pairs

    def _crop_from_masks(
        self,
        img: np.ndarray,
        mask_distal: np.ndarray,
        mask_mesial: np.ndarray,
        left_box: np.ndarray,
        right_box: np.ndarray,
        img_h: int,
        img_w: int,
    ) -> Tuple[GeometricData, np.ndarray]:
        """Distance-minimized surface centroid cropping from segmentation masks."""
        coords_d = np.argwhere(mask_distal > 0)  # [row, col] = [y, x]
        coords_m = np.argwhere(mask_mesial > 0)

        if len(coords_d) == 0 or len(coords_m) == 0:
            return self._crop_from_boxes(img, left_box, right_box, img_h, img_w)

        # Find shortest distance between the two surface masks
        distances = cdist(coords_d, coords_m)
        min_idx = np.unravel_index(np.argmin(distances), distances.shape)
        contact_dist = float(distances[min_idx])

        p_d = coords_d[min_idx[0]]  # [y, x] on distal
        p_m = coords_m[min_idx[1]]  # [y, x] on mesial

        # Midpoint = crop center
        center_y = (p_d[0] + p_m[0]) / 2
        center_x = (p_d[1] + p_m[1]) / 2

        # Rotation angle to make contact vector horizontal
        dy = p_m[0] - p_d[0]
        dx = p_m[1] - p_d[1]
        angle_rad = math.atan2(dy, dx)
        angle_deg = math.degrees(angle_rad)

        # Extract crop
        crop, actual_center = self._extract_crop(
            img, center_x, center_y, img_h, img_w,
            angle_deg if self.config.rotation_normalize else 0.0,
        )

        # Crown context fractions
        crown_ctx_l = self._crown_context_fraction(left_box, actual_center, self.config.crop_size, img_w)
        crown_ctx_r = self._crown_context_fraction(right_box, actual_center, self.config.crop_size, img_w)

        geo = GeometricData(
            contact_distance_px=round(contact_dist, 2),
            contact_midpoint=[round(center_x, 2), round(center_y, 2)],
            surface_point_left=[round(float(p_d[1]), 2), round(float(p_d[0]), 2)],  # [x, y]
            surface_point_right=[round(float(p_m[1]), 2), round(float(p_m[0]), 2)],
            rotation_angle_deg=round(angle_deg, 2) if self.config.rotation_normalize else 0.0,
            crown_context_left=round(crown_ctx_l, 3),
            crown_context_right=round(crown_ctx_r, 3),
        )

        return geo, crop

    def _crop_from_boxes(
        self,
        img: np.ndarray,
        left_box: np.ndarray,
        right_box: np.ndarray,
        img_h: int,
        img_w: int,
    ) -> Tuple[GeometricData, np.ndarray]:
        """Fallback: derive interproximal crop from bounding box edges."""
        # Contact point: right edge of left box <-> left edge of right box
        p_d_x = float(left_box[2])   # right edge of left tooth
        p_m_x = float(right_box[0])  # left edge of right tooth

        # Vertical overlap region
        y_top = max(float(left_box[1]), float(right_box[1]))
        y_bot = min(float(left_box[3]), float(right_box[3]))
        if y_top >= y_bot:
            y_top = min(float(left_box[1]), float(right_box[1]))
            y_bot = max(float(left_box[3]), float(right_box[3]))

        center_y = (y_top + y_bot) / 2
        center_x = (p_d_x + p_m_x) / 2
        contact_dist = abs(p_m_x - p_d_x)

        crop, actual_center = self._extract_crop(img, center_x, center_y, img_h, img_w, 0.0)

        crown_ctx_l = self._crown_context_fraction(left_box, actual_center, self.config.crop_size, img_w)
        crown_ctx_r = self._crown_context_fraction(right_box, actual_center, self.config.crop_size, img_w)

        geo = GeometricData(
            contact_distance_px=round(contact_dist, 2),
            contact_midpoint=[round(center_x, 2), round(center_y, 2)],
            surface_point_left=[round(p_d_x, 2), round(center_y, 2)],
            surface_point_right=[round(p_m_x, 2), round(center_y, 2)],
            rotation_angle_deg=0.0,
            crown_context_left=round(crown_ctx_l, 3),
            crown_context_right=round(crown_ctx_r, 3),
        )

        return geo, crop

    def _extract_crop(
        self,
        img: np.ndarray,
        cx: float,
        cy: float,
        img_h: int,
        img_w: int,
        angle_deg: float,
    ) -> Tuple[np.ndarray, Tuple[float, float]]:
        """Extract a square crop, optionally rotated, with boundary clamping."""
        half = self.config.crop_size // 2

        if abs(angle_deg) > 1.0 and self.config.rotation_normalize:
            # Rotate image around the contact center, then crop
            from PIL import Image as PILImage
            pil_img = PILImage.fromarray(img)
            rotated = pil_img.rotate(-angle_deg, center=(cx, cy), expand=False, fillcolor=(0, 0, 0))
            img_rot = np.array(rotated)
        else:
            img_rot = img

        x1 = max(0, int(cx - half))
        y1 = max(0, int(cy - half))
        x2 = min(img_w, int(cx + half))
        y2 = min(img_h, int(cy + half))

        crop = img_rot[y1:y2, x1:x2]

        # Pad if crop is smaller than expected (near edges)
        if crop.shape[0] < self.config.crop_size or crop.shape[1] < self.config.crop_size:
            padded = np.zeros((self.config.crop_size, self.config.crop_size, 3), dtype=np.uint8)
            ph = min(crop.shape[0], self.config.crop_size)
            pw = min(crop.shape[1], self.config.crop_size)
            padded[:ph, :pw] = crop[:ph, :pw]
            crop = padded

        return crop, (cx, cy)

    def _vertical_overlap(self, box_a: np.ndarray, box_b: np.ndarray) -> bool:
        """Check if two boxes share sufficient vertical overlap (same arch)."""
        y_top = max(box_a[1], box_b[1])
        y_bot = min(box_a[3], box_b[3])
        overlap = max(0, y_bot - y_top)
        min_h = min(box_a[3] - box_a[1], box_b[3] - box_b[1])
        if min_h <= 0:
            return False
        return (overlap / min_h) >= self.config.min_tooth_overlap_y

    def _crown_context_fraction(
        self,
        tooth_box: np.ndarray,
        crop_center: Tuple[float, float],
        crop_size: int,
        img_w: int,
    ) -> float:
        """Calculate what fraction of a tooth crown is visible in the crop."""
        half = crop_size // 2
        cx, _ = crop_center
        crop_x1 = max(0, cx - half)
        crop_x2 = min(img_w, cx + half)

        tooth_x1 = float(tooth_box[0])
        tooth_x2 = float(tooth_box[2])
        tooth_w = tooth_x2 - tooth_x1
        if tooth_w <= 0:
            return 0.0

        overlap_x1 = max(crop_x1, tooth_x1)
        overlap_x2 = min(crop_x2, tooth_x2)
        visible = max(0, overlap_x2 - overlap_x1)

        return visible / tooth_w

    @staticmethod
    def _find_gap_in_region(
        midpoint: List[float],
        gap_boxes: Optional[List[np.ndarray]],
        gap_confs: Optional[List[float]],
        radius: float = 50.0,
    ) -> Optional[float]:
        """Check if a contact_gap_candidate detection exists near the contact midpoint."""
        if not gap_boxes or not gap_confs:
            return None

        mx, my = midpoint
        for box, conf in zip(gap_boxes, gap_confs):
            gcx = (box[0] + box[2]) / 2
            gcy = (box[1] + box[3]) / 2
            dist = math.sqrt((gcx - mx) ** 2 + (gcy - my) ** 2)
            if dist <= radius:
                return conf
        return None

    @staticmethod
    def _restoration_near_contact(
        midpoint: List[float],
        left_box: np.ndarray,
        right_box: np.ndarray,
        restoration_boxes: Optional[List[np.ndarray]],
        margin: float = 30.0,
    ) -> bool:
        """Check if a restoration_margin detection is near this contact."""
        if not restoration_boxes:
            return False

        mx, my = midpoint
        for rbox in restoration_boxes:
            rcx = (rbox[0] + rbox[2]) / 2
            rcy = (rbox[1] + rbox[3]) / 2
            dist = math.sqrt((rcx - mx) ** 2 + (rcy - my) ** 2)
            if dist <= margin:
                return True
        return False
