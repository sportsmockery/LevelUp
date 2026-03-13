"""YOLO -> SAM2 Auto-Labeling Factory.

Production-grade pipeline that:
1. Runs YOLO detector on enhanced dental images
2. Generates multi-point prompts from YOLO boxes
3. Refines masks using SAM2 with dual-gate scoring
4. Exports GOLD labels (auto-approved) and SILVER labels (review queue)
5. Computes relational contact centroids between adjacent teeth
"""

import json
import math
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
from PIL import Image
from scipy.spatial.distance import cdist
from ultralytics import YOLO
from segment_anything import sam_model_registry, SamPredictor

from broken_contacts.enhance import enhance_dental_image, compute_quality_score


# --- Score tier thresholds ---
GOLD_SCORE_MIN = 0.85
GOLD_IOU_MIN = 0.70
SILVER_SCORE_MIN = 0.65

# --- SAM2 weights ---
WEIGHT_YOLO = 0.4
WEIGHT_SAM = 0.6

# --- Polygon simplification ---
POLY_EPSILON_FACTOR = 0.001  # fraction of arc length for approxPolyDP

# --- 9-class detector schema ---
CLASS_NAMES = {
    0: "tooth_crown",
    1: "mesial_surface",
    2: "distal_surface",
    3: "occlusal_surface",
    4: "restoration_margin",
    5: "contact_gap_candidate",
    6: "articulating_mark",
    7: "ortho_hardware",
    8: "gingival_margin",
}

# Classes that participate in relational pair logic
RELATIONAL_CLASSES = {1, 2}  # mesial_surface, distal_surface
EXCLUSION_CLASSES = {7}       # ortho_hardware — mask out from distance calcs


@dataclass
class MaskResult:
    """Result of SAM2 mask refinement for a single detection."""
    class_id: int
    class_name: str
    yolo_box: List[float]        # [x1, y1, x2, y2]
    yolo_confidence: float
    sam_score: float              # SAM2 stability score
    geometric_iou: float         # IoU between YOLO box and SAM mask bbox
    final_score: float           # S_final = C_yolo*0.4 + C_sam*0.6
    tier: str                    # GOLD, SILVER, REJECT
    mask: Optional[np.ndarray] = field(default=None, repr=False)
    polygon_normalized: Optional[List[List[float]]] = field(default=None, repr=False)

    def to_dict(self) -> dict:
        d = asdict(self)
        d.pop("mask", None)
        return d


@dataclass
class FactoryResult:
    """Aggregate results for a single image."""
    image_path: str
    image_size: Tuple[int, int]  # (width, height)
    quality_metrics: dict
    quality_score: float
    detections: int
    gold_count: int
    silver_count: int
    reject_count: int
    masks: List[MaskResult] = field(default_factory=list)
    contact_pairs: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "image_path": self.image_path,
            "image_size": list(self.image_size),
            "quality_metrics": self.quality_metrics,
            "quality_score": self.quality_score,
            "detections": self.detections,
            "gold_count": self.gold_count,
            "silver_count": self.silver_count,
            "reject_count": self.reject_count,
            "masks": [m.to_dict() for m in self.masks],
            "contact_pairs": self.contact_pairs,
        }


def get_multi_point_prompts(
    box: np.ndarray, num_quadrant_points: int = 4
) -> Tuple[np.ndarray, np.ndarray]:
    """Sample multi-point foreground prompts from inside a YOLO bounding box.

    Generates center + 4 quadrant midpoints for robust SAM2 prompting.

    Args:
        box: [x1, y1, x2, y2] bounding box.
        num_quadrant_points: Number of quadrant points (default 4).

    Returns:
        Tuple of (point_coords [N, 2], point_labels [N]) where labels=1 for foreground.
    """
    x1, y1, x2, y2 = box
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    qx, qy = (x2 - x1) / 4, (y2 - y1) / 4

    points = [[cx, cy]]  # center
    if num_quadrant_points >= 4:
        points.extend([
            [cx - qx, cy - qy],  # top-left quadrant midpoint
            [cx + qx, cy - qy],  # top-right
            [cx - qx, cy + qy],  # bottom-left
            [cx + qx, cy + qy],  # bottom-right
        ])

    coords = np.array(points, dtype=np.float32)
    labels = np.ones(len(points), dtype=np.int32)  # all foreground
    return coords, labels


def compute_mask_box_iou(mask: np.ndarray, box: np.ndarray) -> float:
    """Compute IoU between a binary mask's bounding box and a reference box.

    Args:
        mask: Binary mask (H, W).
        box: Reference [x1, y1, x2, y2].

    Returns:
        IoU score (0-1).
    """
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return 0.0

    mask_box = [xs.min(), ys.min(), xs.max(), ys.max()]
    # Intersection
    ix1 = max(mask_box[0], box[0])
    iy1 = max(mask_box[1], box[1])
    ix2 = min(mask_box[2], box[2])
    iy2 = min(mask_box[3], box[3])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)

    # Union
    area_mask = (mask_box[2] - mask_box[0]) * (mask_box[3] - mask_box[1])
    area_box = (box[2] - box[0]) * (box[3] - box[1])
    union = area_mask + area_box - inter

    return float(inter / union) if union > 0 else 0.0


def mask_to_yolo_polygon(
    mask: np.ndarray, img_w: int, img_h: int, epsilon_factor: float = POLY_EPSILON_FACTOR
) -> Optional[List[List[float]]]:
    """Convert a binary mask to YOLO-format normalized polygon coordinates.

    Uses cv2.approxPolyDP for smooth dental curves without excessive vertices.

    Args:
        mask: Binary mask (H, W), uint8.
        img_w: Image width for normalization.
        img_h: Image height for normalization.
        epsilon_factor: Fraction of arc length for polygon simplification.

    Returns:
        List of [x_norm, y_norm] pairs, or None if no contour found.
    """
    mask_uint8 = (mask * 255).astype(np.uint8) if mask.max() <= 1 else mask
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None

    # Use the largest contour
    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) < 10:
        return None

    # Simplify with approxPolyDP
    epsilon = epsilon_factor * cv2.arcLength(contour, closed=True)
    approx = cv2.approxPolyDP(contour, epsilon, closed=True)

    # Normalize to [0, 1]
    polygon = []
    for point in approx.reshape(-1, 2):
        polygon.append([
            round(float(point[0]) / img_w, 6),
            round(float(point[1]) / img_h, 6),
        ])

    return polygon if len(polygon) >= 3 else None


def classify_tier(final_score: float, geometric_iou: float) -> str:
    """Classify a mask into GOLD, SILVER, or REJECT tier.

    Args:
        final_score: S_final = C_yolo*0.4 + C_sam*0.6.
        geometric_iou: IoU between YOLO box and SAM mask.

    Returns:
        Tier string: "GOLD", "SILVER", or "REJECT".
    """
    if final_score > GOLD_SCORE_MIN and geometric_iou > GOLD_IOU_MIN:
        return "GOLD"
    elif final_score > SILVER_SCORE_MIN:
        return "SILVER"
    return "REJECT"


class SAMFactory:
    """YOLO -> SAM2 auto-labeling engine.

    Processes dental images through:
    1. Image enhancement (CLAHE + adaptive sharpening)
    2. YOLO detection (9-class dental schema)
    3. Multi-point SAM2 prompting and mask refinement
    4. Dual-gate scoring and tier classification
    5. Polygon export and relational pair computation
    """

    def __init__(
        self,
        yolo_model_path: str,
        sam_checkpoint_path: str,
        sam_model_type: str = "vit_b",
        device: str = "auto",
        yolo_confidence: float = 0.25,
        yolo_imgsz: int = 640,
    ):
        # Device selection
        if device == "auto":
            if torch.backends.mps.is_available():
                self.device = torch.device("mps")
            elif torch.cuda.is_available():
                self.device = torch.device("cuda")
            else:
                self.device = torch.device("cpu")
        else:
            self.device = torch.device(device)

        # Load YOLO
        self.yolo = YOLO(yolo_model_path)
        self.yolo_confidence = yolo_confidence
        self.yolo_imgsz = yolo_imgsz

        # Load SAM2
        sam = sam_model_registry[sam_model_type](checkpoint=sam_checkpoint_path)
        sam.to(self.device)
        self.sam_predictor = SamPredictor(sam)

        print(f"SAMFactory initialized on {self.device}")
        print(f"  YOLO: {yolo_model_path}")
        print(f"  SAM:  {sam_checkpoint_path} ({sam_model_type})")

    def process_image(
        self,
        image_path: str,
        enhance: bool = True,
    ) -> FactoryResult:
        """Process a single image through the full YOLO->SAM2 pipeline.

        Args:
            image_path: Path to input image.
            enhance: Whether to apply CLAHE/sharpening preprocessing.

        Returns:
            FactoryResult with scored masks and contact pairs.
        """
        # Load image
        bgr = cv2.imread(image_path)
        if bgr is None:
            raise FileNotFoundError(f"Cannot read image: {image_path}")

        img_h, img_w = bgr.shape[:2]

        # Enhancement gate
        if enhance:
            bgr, quality_metrics = enhance_dental_image(bgr)
            quality_score = compute_quality_score(quality_metrics)
        else:
            quality_metrics = {}
            quality_score = 1.0

        # Convert for models
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb)

        # --- Stage 1: YOLO detection ---
        yolo_results = self.yolo.predict(
            source=pil_image,
            conf=self.yolo_confidence,
            imgsz=self.yolo_imgsz,
            verbose=False,
        )
        result = yolo_results[0]

        # --- Set SAM2 image embedding (once per image) ---
        self.sam_predictor.set_image(rgb)

        # --- Process each detection through SAM2 ---
        mask_results: List[MaskResult] = []

        for box_tensor in result.boxes:
            cls_id = int(box_tensor.cls[0])
            yolo_conf = float(box_tensor.conf[0])
            xyxy = box_tensor.xyxy[0].cpu().numpy()

            # Skip exclusion classes from SAM refinement
            if cls_id in EXCLUSION_CLASSES:
                mask_results.append(MaskResult(
                    class_id=cls_id,
                    class_name=CLASS_NAMES.get(cls_id, f"class_{cls_id}"),
                    yolo_box=[round(float(c), 2) for c in xyxy],
                    yolo_confidence=round(yolo_conf, 4),
                    sam_score=0.0,
                    geometric_iou=0.0,
                    final_score=0.0,
                    tier="REJECT",
                ))
                continue

            # Multi-point prompting
            point_coords, point_labels = get_multi_point_prompts(xyxy)

            # SAM2 prediction with both box and point prompts
            masks, scores, _ = self.sam_predictor.predict(
                point_coords=point_coords,
                point_labels=point_labels,
                box=xyxy,
                multimask_output=True,
            )

            # Select best mask by SAM stability score
            best_idx = np.argmax(scores)
            best_mask = masks[best_idx]
            sam_score = float(scores[best_idx])

            # Dual-gate scoring
            g_iou = compute_mask_box_iou(best_mask, xyxy)
            s_final = (yolo_conf * WEIGHT_YOLO) + (sam_score * WEIGHT_SAM)
            tier = classify_tier(s_final, g_iou)

            # Polygon simplification
            polygon = mask_to_yolo_polygon(best_mask, img_w, img_h)

            mask_results.append(MaskResult(
                class_id=cls_id,
                class_name=CLASS_NAMES.get(cls_id, f"class_{cls_id}"),
                yolo_box=[round(float(c), 2) for c in xyxy],
                yolo_confidence=round(yolo_conf, 4),
                sam_score=round(sam_score, 4),
                geometric_iou=round(g_iou, 4),
                final_score=round(s_final, 4),
                tier=tier,
                mask=best_mask,
                polygon_normalized=polygon,
            ))

        # --- Compute contact pairs from refined masks ---
        contact_pairs = self._compute_contact_pairs(mask_results, img_w, img_h)

        # --- Build result ---
        gold = sum(1 for m in mask_results if m.tier == "GOLD")
        silver = sum(1 for m in mask_results if m.tier == "SILVER")
        reject = sum(1 for m in mask_results if m.tier == "REJECT")

        return FactoryResult(
            image_path=image_path,
            image_size=(img_w, img_h),
            quality_metrics=quality_metrics,
            quality_score=quality_score,
            detections=len(mask_results),
            gold_count=gold,
            silver_count=silver,
            reject_count=reject,
            masks=mask_results,
            contact_pairs=contact_pairs,
        )

    def _compute_contact_pairs(
        self,
        masks: List[MaskResult],
        img_w: int,
        img_h: int,
    ) -> List[dict]:
        """Find contact pairs by matching distal_surface[i] to mesial_surface[i+1].

        Teeth are sorted left-to-right. For each adjacent pair, the shortest
        Euclidean distance between their proximal surface masks is computed.
        """
        # Collect tooth crowns sorted L-to-R
        teeth = [m for m in masks if m.class_id == 0 and m.tier != "REJECT"]
        teeth.sort(key=lambda m: (m.yolo_box[0] + m.yolo_box[2]) / 2)

        if len(teeth) < 2:
            return []

        # Collect surface masks indexed by approximate x-position
        distal_masks = [m for m in masks if m.class_id == 2 and m.mask is not None]
        mesial_masks = [m for m in masks if m.class_id == 1 and m.mask is not None]

        pairs = []
        for i in range(len(teeth) - 1):
            left_tooth = teeth[i]
            right_tooth = teeth[i + 1]

            # Find the distal surface closest to left tooth
            left_cx = (left_tooth.yolo_box[0] + left_tooth.yolo_box[2]) / 2
            right_cx = (right_tooth.yolo_box[0] + right_tooth.yolo_box[2]) / 2

            best_distal = self._find_nearest_surface(distal_masks, left_cx)
            best_mesial = self._find_nearest_surface(mesial_masks, right_cx)

            if best_distal is None or best_mesial is None:
                continue

            # Shortest distance between surface masks
            coords_d = np.argwhere(best_distal.mask > 0)
            coords_m = np.argwhere(best_mesial.mask > 0)

            if len(coords_d) == 0 or len(coords_m) == 0:
                continue

            distances = cdist(coords_d, coords_m)
            min_idx = np.unravel_index(np.argmin(distances), distances.shape)
            contact_dist = float(distances[min_idx])

            p_d = coords_d[min_idx[0]]  # [y, x]
            p_m = coords_m[min_idx[1]]
            midpoint = [(p_d[1] + p_m[1]) / 2, (p_d[0] + p_m[0]) / 2]  # [x, y]

            pairs.append({
                "pair_index": i,
                "left_tooth_index": i,
                "right_tooth_index": i + 1,
                "contact_distance_px": round(contact_dist, 2),
                "contact_midpoint": [round(c, 2) for c in midpoint],
                "surface_point_distal": [round(float(p_d[1]), 2), round(float(p_d[0]), 2)],
                "surface_point_mesial": [round(float(p_m[1]), 2), round(float(p_m[0]), 2)],
                "distal_score": best_distal.final_score,
                "mesial_score": best_mesial.final_score,
            })

        return pairs

    @staticmethod
    def _find_nearest_surface(
        surfaces: List[MaskResult], target_cx: float
    ) -> Optional[MaskResult]:
        """Find the surface mask closest to a target x-center."""
        if not surfaces:
            return None
        return min(
            surfaces,
            key=lambda s: abs((s.yolo_box[0] + s.yolo_box[2]) / 2 - target_cx),
        )

    def cleanup(self):
        """Free GPU memory."""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


def export_yolo_segments(
    result: FactoryResult,
    gold_dir: Path,
    silver_dir: Path,
    reject_log_path: Path,
) -> dict:
    """Export scored masks to YOLO segment format (GOLD) and review manifest (SILVER).

    Args:
        result: FactoryResult from process_image.
        gold_dir: Directory for auto-approved YOLO label files.
        silver_dir: Directory for review-required JSON manifests.
        reject_log_path: Path to append rejected/hard samples.

    Returns:
        Summary dict with counts and paths.
    """
    image_name = Path(result.image_path).stem
    img_w, img_h = result.image_size

    gold_dir.mkdir(parents=True, exist_ok=True)
    silver_dir.mkdir(parents=True, exist_ok=True)
    reject_log_path.parent.mkdir(parents=True, exist_ok=True)

    gold_lines = []
    silver_entries = []
    reject_entries = []

    for m in result.masks:
        if m.tier == "GOLD" and m.polygon_normalized:
            # YOLO segment format: class_id x1 y1 x2 y2 ...
            flat_coords = " ".join(
                f"{pt[0]} {pt[1]}" for pt in m.polygon_normalized
            )
            gold_lines.append(f"{m.class_id} {flat_coords}")

        elif m.tier == "SILVER":
            silver_entries.append(m.to_dict())

        else:
            reject_entries.append({
                "image": result.image_path,
                "class_id": m.class_id,
                "class_name": m.class_name,
                "yolo_confidence": m.yolo_confidence,
                "sam_score": m.sam_score,
                "final_score": m.final_score,
                "geometric_iou": m.geometric_iou,
            })

    # Write GOLD labels
    gold_path = None
    if gold_lines:
        gold_path = gold_dir / f"{image_name}.txt"
        with open(gold_path, "w") as f:
            f.write("\n".join(gold_lines) + "\n")

    # Write SILVER manifest
    silver_path = None
    if silver_entries:
        silver_path = silver_dir / f"{image_name}.json"
        with open(silver_path, "w") as f:
            json.dump({
                "image_path": result.image_path,
                "quality_score": result.quality_score,
                "review_masks": silver_entries,
                "contact_pairs": result.contact_pairs,
            }, f, indent=2)

    # Append REJECT log
    if reject_entries:
        with open(reject_log_path, "a") as f:
            for entry in reject_entries:
                f.write(json.dumps(entry) + "\n")

    return {
        "gold_labels": str(gold_path) if gold_path else None,
        "gold_count": len(gold_lines),
        "silver_manifest": str(silver_path) if silver_path else None,
        "silver_count": len(silver_entries),
        "reject_count": len(reject_entries),
    }


def process_directory(
    image_dir: str,
    yolo_model_path: str,
    sam_checkpoint_path: str,
    output_dir: str,
    sam_model_type: str = "vit_b",
    yolo_confidence: float = 0.25,
    enhance: bool = True,
    batch_size: int = 1,
    extensions: tuple = (".jpg", ".jpeg", ".png", ".webp"),
) -> List[dict]:
    """Process an entire directory of dental images through the YOLO->SAM2 factory.

    Handles GPU memory management and batch processing.

    Args:
        image_dir: Directory of input images.
        yolo_model_path: Path to trained YOLO model.
        sam_checkpoint_path: Path to SAM2 checkpoint.
        output_dir: Root output directory.
        sam_model_type: SAM model type (vit_b, vit_l, vit_h).
        yolo_confidence: YOLO detection threshold.
        enhance: Whether to apply image enhancement.
        batch_size: Images per GPU memory flush.
        extensions: Image file extensions to process.

    Returns:
        List of per-image summary dicts.
    """
    image_dir = Path(image_dir)
    output_path = Path(output_dir)

    if not image_dir.is_dir():
        raise NotADirectoryError(f"Image directory not found: {image_dir}")

    image_files = sorted(
        f for f in image_dir.rglob("*")
        if f.suffix.lower() in extensions
    )

    if not image_files:
        raise FileNotFoundError(f"No images found in {image_dir}")

    gold_dir = output_path / "train" / "labels"
    silver_dir = output_path / "review_required"
    reject_log = output_path / "reject_log.jsonl"

    factory = SAMFactory(
        yolo_model_path=yolo_model_path,
        sam_checkpoint_path=sam_checkpoint_path,
        sam_model_type=sam_model_type,
        yolo_confidence=yolo_confidence,
    )

    summaries = []
    total_gold = 0
    total_silver = 0
    total_reject = 0

    for idx, img_path in enumerate(image_files):
        print(f"[{idx + 1}/{len(image_files)}] {img_path.name}")

        try:
            result = factory.process_image(str(img_path), enhance=enhance)
            export_summary = export_yolo_segments(
                result, gold_dir, silver_dir, reject_log,
            )

            total_gold += export_summary["gold_count"]
            total_silver += export_summary["silver_count"]
            total_reject += export_summary["reject_count"]

            summary = {
                "image": str(img_path),
                "quality_score": result.quality_score,
                **export_summary,
                "contact_pairs": len(result.contact_pairs),
            }
            summaries.append(summary)

            tier_str = (
                f"GOLD:{export_summary['gold_count']} "
                f"SILVER:{export_summary['silver_count']} "
                f"REJECT:{export_summary['reject_count']}"
            )
            print(f"  Q={result.quality_score:.2f} | {tier_str} | Pairs={len(result.contact_pairs)}")

        except Exception as e:
            print(f"  ERROR: {e}")
            summaries.append({"image": str(img_path), "error": str(e)})

        # GPU memory management
        if (idx + 1) % batch_size == 0:
            factory.cleanup()

    factory.cleanup()

    # Final summary
    print(f"\n{'='*60}")
    print(f"Processed: {len(image_files)} images")
    print(f"GOLD labels:  {total_gold} -> {gold_dir}")
    print(f"SILVER review: {total_silver} -> {silver_dir}")
    print(f"REJECTED:     {total_reject} -> {reject_log}")

    # Save batch manifest
    manifest_path = output_path / "factory_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump({
            "total_images": len(image_files),
            "total_gold": total_gold,
            "total_silver": total_silver,
            "total_reject": total_reject,
            "images": summaries,
        }, f, indent=2)
    print(f"Manifest: {manifest_path}")

    return summaries
