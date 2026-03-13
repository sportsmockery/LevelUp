"""Factory Loop — CLAHE → YOLO → SAM2 → Scoring → Auto-Label.

The main execution loop that self-evolves the detector by:
1. Enhancing images (CLAHE + adaptive sharpening)
2. Running YOLO detection (9-class dental schema)
3. Refining masks via SAM2 with 5-point prompts
4. Scoring with Platinum/Gold/Silver/Reject tiers
5. Injecting high-confidence labels back into training data
6. Tracking boundary drift between YOLO proposals and SAM2 refinements
"""

import json
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO
from segment_anything import sam_model_registry, SamPredictor

from broken_contacts.enhance import enhance_dental_image, compute_quality_score
from broken_contacts.sam_factory import (
    get_multi_point_prompts, compute_mask_box_iou,
    mask_to_yolo_polygon, CLASS_NAMES, EXCLUSION_CLASSES,
)

# --- Tier thresholds (4-tier system) ---
PLATINUM_SCORE_MIN = 0.92
GOLD_SCORE_MIN = 0.85
SILVER_SCORE_MIN = 0.65

WEIGHT_YOLO = 0.4
WEIGHT_SAM = 0.6

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass
class DriftRecord:
    """Tracks how far YOLO's proposal drifted from SAM2's refinement."""
    class_id: int
    class_name: str
    yolo_box: List[float]
    sam_box: List[float]       # bounding box of SAM mask
    iou: float                 # IoU between YOLO box and SAM mask bbox
    rmse: float                # RMSE of box corners
    yolo_center: List[float]   # [x, y]
    sam_center: List[float]    # [x, y]
    center_drift_px: float     # Euclidean distance between centers
    yolo_confidence: float
    sam_score: float
    final_score: float
    tier: str
    modality: str = "unknown"


@dataclass
class IterationResult:
    """Results from one full pass of the factory loop."""
    iteration: int
    timestamp: str
    images_processed: int
    total_detections: int
    platinum_count: int
    gold_count: int
    silver_count: int
    reject_count: int
    mean_final_score: float
    mean_iou: float
    mean_drift_px: float
    mean_yolo_conf: float
    mean_sam_score: float
    modality_breakdown: Dict[str, dict]  # per-modality stats
    hard_samples: List[dict]             # top rejected images
    drift_records: List[dict] = field(default_factory=list)
    duration_seconds: float = 0.0


def _classify_tier(score: float, iou: float) -> str:
    if score > PLATINUM_SCORE_MIN and iou > 0.75:
        return "PLATINUM"
    elif score > GOLD_SCORE_MIN and iou > 0.70:
        return "GOLD"
    elif score > SILVER_SCORE_MIN:
        return "SILVER"
    return "REJECT"


def _compute_rmse(box_a: np.ndarray, box_b: np.ndarray) -> float:
    """RMSE between two bounding boxes [x1,y1,x2,y2]."""
    diff = box_a - box_b
    return float(np.sqrt(np.mean(diff ** 2)))


def _sam_mask_bbox(mask: np.ndarray) -> Optional[np.ndarray]:
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return None
    return np.array([xs.min(), ys.min(), xs.max(), ys.max()], dtype=float)


def _detect_modality(image: np.ndarray) -> str:
    """Heuristic modality detection from image properties."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    mean_val = gray.mean()
    std_val = gray.std()
    # Bitewings: typically darker, lower contrast
    if mean_val < 100 and std_val < 50:
        return "bitewing"
    # Periapical: medium brightness
    elif mean_val < 140 and std_val < 60:
        return "periapical"
    # Intraoral photos: brighter, more color variance
    return "intraoral_photo"


class ContinuousTrainer:
    """Self-evolving YOLO trainer driven by SAM2 refinement.

    Each iteration:
    1. CLAHE → YOLO → SAM2 → Score
    2. Platinum/Gold labels auto-injected into training set
    3. After N new labels, triggers YOLO fine-tuning
    4. Tracks boundary drift to measure improvement
    """

    def __init__(
        self,
        yolo_model_path: str,
        sam_checkpoint_path: str,
        sam_model_type: str = "vit_b",
        yolo_confidence: float = 0.25,
        retrain_threshold: int = 100,
        device: str = "auto",
    ):
        if device == "auto":
            if torch.backends.mps.is_available():
                self.device = torch.device("mps")
            elif torch.cuda.is_available():
                self.device = torch.device("cuda")
            else:
                self.device = torch.device("cpu")
        else:
            self.device = torch.device(device)

        self.yolo_model_path = yolo_model_path
        self.yolo = YOLO(yolo_model_path)
        self.yolo_confidence = yolo_confidence
        self.retrain_threshold = retrain_threshold

        sam = sam_model_registry[sam_model_type](checkpoint=sam_checkpoint_path)
        sam.to(self.device)
        self.sam_predictor = SamPredictor(sam)

        self.iteration = 0
        self.new_label_count = 0
        self.history: List[IterationResult] = []

        # Load existing history
        self._history_path = Path("runs/factory_history.json")
        self._load_history()

        print(f"ContinuousTrainer initialized on {self.device}")
        print(f"  YOLO: {yolo_model_path}")
        print(f"  Retrain threshold: {retrain_threshold} new labels")

    def run_iteration(
        self,
        image_dir: str,
        output_dir: str = "runs/factory",
        data_yaml: str = "config/data.yaml",
        enhance: bool = True,
    ) -> IterationResult:
        """Run one full iteration of the factory loop.

        Args:
            image_dir: Directory of source images.
            output_dir: Root output for labels, reviews, reports.
            data_yaml: YOLO data.yaml for retraining.
            enhance: Apply CLAHE preprocessing.

        Returns:
            IterationResult with full metrics.
        """
        self.iteration += 1
        start_time = time.time()
        out = Path(output_dir)

        platinum_dir = out / "train" / "labels"
        gold_dir = out / "labels" / "gold"
        silver_dir = out / "review_required"
        reject_log = out / "reject_log.jsonl"

        for d in [platinum_dir, gold_dir, silver_dir]:
            d.mkdir(parents=True, exist_ok=True)

        image_files = sorted(
            f for f in Path(image_dir).rglob("*")
            if f.suffix.lower() in IMAGE_EXTENSIONS
        )

        if not image_files:
            raise FileNotFoundError(f"No images in {image_dir}")

        # Accumulators
        all_drifts: List[DriftRecord] = []
        tier_counts = {"PLATINUM": 0, "GOLD": 0, "SILVER": 0, "REJECT": 0}
        modality_stats: Dict[str, dict] = {}
        hard_samples: List[dict] = []
        total_detections = 0

        for idx, img_path in enumerate(image_files):
            bgr = cv2.imread(str(img_path))
            if bgr is None:
                continue

            img_h, img_w = bgr.shape[:2]
            modality = _detect_modality(bgr)

            if modality not in modality_stats:
                modality_stats[modality] = {
                    "images": 0, "detections": 0,
                    "mean_iou": 0.0, "mean_drift": 0.0, "mean_score": 0.0,
                    "iou_sum": 0.0, "drift_sum": 0.0, "score_sum": 0.0,
                    "platinum": 0, "gold": 0, "silver": 0, "reject": 0,
                }
            modality_stats[modality]["images"] += 1

            # Enhancement gate
            if enhance:
                bgr, _ = enhance_dental_image(bgr)

            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            self.sam_predictor.set_image(rgb)

            # YOLO detection
            results = self.yolo.predict(
                source=Image.fromarray(rgb),
                conf=self.yolo_confidence,
                imgsz=640, verbose=False,
            )
            result = results[0]

            image_label_lines = []
            image_reject_count = 0
            image_worst_score = 1.0

            for box_tensor in result.boxes:
                cls_id = int(box_tensor.cls[0])
                yolo_conf = float(box_tensor.conf[0])
                xyxy = box_tensor.xyxy[0].cpu().numpy()
                total_detections += 1

                if cls_id in EXCLUSION_CLASSES:
                    continue

                # 5-point SAM2 prompting
                coords, labels = get_multi_point_prompts(xyxy)
                masks, scores, _ = self.sam_predictor.predict(
                    point_coords=coords, point_labels=labels,
                    box=xyxy, multimask_output=True,
                )
                best_idx = np.argmax(scores)
                mask = masks[best_idx]
                sam_score = float(scores[best_idx])

                # Scoring
                g_iou = compute_mask_box_iou(mask, xyxy)
                s_final = (yolo_conf * WEIGHT_YOLO) + (sam_score * WEIGHT_SAM)
                tier = _classify_tier(s_final, g_iou)
                tier_counts[tier] += 1
                modality_stats[modality][tier.lower()] += 1

                # Drift calculation
                sam_box = _sam_mask_bbox(mask)
                if sam_box is not None:
                    rmse = _compute_rmse(xyxy, sam_box)
                    yolo_cx = (xyxy[0] + xyxy[2]) / 2
                    yolo_cy = (xyxy[1] + xyxy[3]) / 2
                    sam_cx = (sam_box[0] + sam_box[2]) / 2
                    sam_cy = (sam_box[1] + sam_box[3]) / 2
                    drift_px = float(np.sqrt((yolo_cx - sam_cx)**2 + (yolo_cy - sam_cy)**2))

                    dr = DriftRecord(
                        class_id=cls_id,
                        class_name=CLASS_NAMES.get(cls_id, f"cls_{cls_id}"),
                        yolo_box=[round(float(c), 2) for c in xyxy],
                        sam_box=[round(float(c), 2) for c in sam_box],
                        iou=round(g_iou, 4),
                        rmse=round(rmse, 2),
                        yolo_center=[round(yolo_cx, 2), round(yolo_cy, 2)],
                        sam_center=[round(sam_cx, 2), round(sam_cy, 2)],
                        center_drift_px=round(drift_px, 2),
                        yolo_confidence=round(yolo_conf, 4),
                        sam_score=round(sam_score, 4),
                        final_score=round(s_final, 4),
                        tier=tier,
                        modality=modality,
                    )
                    all_drifts.append(dr)

                    modality_stats[modality]["detections"] += 1
                    modality_stats[modality]["iou_sum"] += g_iou
                    modality_stats[modality]["drift_sum"] += drift_px
                    modality_stats[modality]["score_sum"] += s_final

                # Polygon export for Platinum/Gold
                polygon = mask_to_yolo_polygon(mask, img_w, img_h)
                if polygon and tier in ("PLATINUM", "GOLD"):
                    flat = " ".join(f"{pt[0]} {pt[1]}" for pt in polygon)
                    image_label_lines.append(f"{cls_id} {flat}")

                if tier == "REJECT":
                    image_reject_count += 1
                    image_worst_score = min(image_worst_score, s_final)

            # Save labels
            stem = img_path.stem
            if image_label_lines:
                plat_lines = [l for l, d in zip(image_label_lines, all_drifts[-len(image_label_lines):]) if d.tier == "PLATINUM"]
                gold_lines = [l for l, d in zip(image_label_lines, all_drifts[-len(image_label_lines):]) if d.tier == "GOLD"]

                if plat_lines:
                    with open(platinum_dir / f"{stem}.txt", "w") as f:
                        f.write("\n".join(plat_lines) + "\n")
                    self.new_label_count += len(plat_lines)

                if gold_lines:
                    with open(gold_dir / f"{stem}.txt", "w") as f:
                        f.write("\n".join(gold_lines) + "\n")
                    self.new_label_count += len(gold_lines)

                # Copy image to training images
                if plat_lines:
                    train_img_dir = out / "train" / "images"
                    train_img_dir.mkdir(parents=True, exist_ok=True)
                    import shutil
                    dest = train_img_dir / img_path.name
                    if not dest.exists():
                        shutil.copy2(str(img_path), str(dest))

            # Track hard samples
            if image_reject_count > 0:
                quality_metrics = {}
                gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY) if len(bgr.shape) == 3 else bgr
                quality_metrics["blur_score"] = round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 2)
                hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
                nonzero = np.where(hist > 0)[0]
                quality_metrics["contrast_score"] = round(float(nonzero[-1] - nonzero[0]) / 255, 3) if len(nonzero) > 1 else 0.0
                quality_metrics["occlusion_density"] = round(
                    sum(1 for b in result.boxes if int(b.cls[0]) == 7) / max(1, len(result.boxes)), 3
                )

                hard_samples.append({
                    "image": str(img_path),
                    "filename": img_path.name,
                    "modality": modality,
                    "reject_count": image_reject_count,
                    "worst_score": round(image_worst_score, 4),
                    "quality": quality_metrics,
                })

            # GPU memory management
            if (idx + 1) % 5 == 0:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

        # Finalize modality stats
        for mod, stats in modality_stats.items():
            n = stats["detections"]
            if n > 0:
                stats["mean_iou"] = round(stats["iou_sum"] / n, 4)
                stats["mean_drift"] = round(stats["drift_sum"] / n, 2)
                stats["mean_score"] = round(stats["score_sum"] / n, 4)
            del stats["iou_sum"], stats["drift_sum"], stats["score_sum"]

        # Sort hard samples by worst score
        hard_samples.sort(key=lambda x: x["worst_score"])
        hard_samples = hard_samples[:20]  # keep top 20

        # Build iteration result
        n_drifts = len(all_drifts)
        iter_result = IterationResult(
            iteration=self.iteration,
            timestamp=datetime.now().isoformat(),
            images_processed=len(image_files),
            total_detections=total_detections,
            platinum_count=tier_counts["PLATINUM"],
            gold_count=tier_counts["GOLD"],
            silver_count=tier_counts["SILVER"],
            reject_count=tier_counts["REJECT"],
            mean_final_score=round(np.mean([d.final_score for d in all_drifts]), 4) if all_drifts else 0.0,
            mean_iou=round(np.mean([d.iou for d in all_drifts]), 4) if all_drifts else 0.0,
            mean_drift_px=round(np.mean([d.center_drift_px for d in all_drifts]), 2) if all_drifts else 0.0,
            mean_yolo_conf=round(np.mean([d.yolo_confidence for d in all_drifts]), 4) if all_drifts else 0.0,
            mean_sam_score=round(np.mean([d.sam_score for d in all_drifts]), 4) if all_drifts else 0.0,
            modality_breakdown=modality_stats,
            hard_samples=hard_samples,
            drift_records=[asdict(d) for d in all_drifts[:500]],  # cap at 500
            duration_seconds=round(time.time() - start_time, 2),
        )

        self.history.append(iter_result)
        self._save_history()

        # Check retrain trigger
        if self.new_label_count >= self.retrain_threshold:
            print(f"\n>>> RETRAIN TRIGGER: {self.new_label_count} new labels >= threshold {self.retrain_threshold}")
            self._trigger_retrain(data_yaml, output_dir)

        self._print_summary(iter_result)
        return iter_result

    def _trigger_retrain(self, data_yaml: str, output_dir: str) -> None:
        """Trigger YOLO fine-tuning with accumulated Platinum/Gold labels."""
        from broken_contacts.train_trigger import auto_retrain
        auto_retrain(
            current_model=self.yolo_model_path,
            data_yaml=data_yaml,
            epochs=10,
            name=f"auto_retrain_iter_{self.iteration}",
        )
        self.new_label_count = 0

        # Reload improved model
        best = Path("runs/detect") / f"auto_retrain_iter_{self.iteration}" / "weights" / "best.pt"
        if best.exists():
            self.yolo = YOLO(str(best))
            self.yolo_model_path = str(best)
            print(f">>> Model upgraded to: {best}")

    def get_command_center_data(self) -> dict:
        """Return all data needed for the Command Center dashboard."""
        return {
            "iteration": self.iteration,
            "new_labels_pending": self.new_label_count,
            "retrain_threshold": self.retrain_threshold,
            "history": [asdict(h) for h in self.history[-50:]],
            "trend": self._compute_trend(),
        }

    def _compute_trend(self) -> dict:
        """Compute trend metrics across iterations."""
        if len(self.history) < 2:
            return {"improving": None, "iou_delta": 0, "drift_delta": 0, "score_delta": 0}

        recent = self.history[-1]
        prev = self.history[-2]
        return {
            "improving": recent.mean_iou > prev.mean_iou,
            "iou_delta": round(recent.mean_iou - prev.mean_iou, 4),
            "drift_delta": round(recent.mean_drift_px - prev.mean_drift_px, 2),
            "score_delta": round(recent.mean_final_score - prev.mean_final_score, 4),
        }

    def _print_summary(self, r: IterationResult) -> None:
        print(f"\n{'='*60}")
        print(f"Iteration #{r.iteration} Complete ({r.duration_seconds}s)")
        print(f"  Images: {r.images_processed} | Detections: {r.total_detections}")
        print(f"  PLATINUM: {r.platinum_count} | GOLD: {r.gold_count} | SILVER: {r.silver_count} | REJECT: {r.reject_count}")
        print(f"  Mean Score: {r.mean_final_score:.4f} | Mean IoU: {r.mean_iou:.4f} | Mean Drift: {r.mean_drift_px:.1f}px")
        print(f"  New labels accumulated: {self.new_label_count}/{self.retrain_threshold}")
        for mod, stats in r.modality_breakdown.items():
            gap_pct = round((1 - stats["mean_iou"]) * 100, 1) if stats["mean_iou"] > 0 else 0
            print(f"  [{mod}] {stats['images']} imgs, IoU gap: {gap_pct}%, drift: {stats['mean_drift']:.1f}px")
        if r.hard_samples:
            print(f"  Hard samples: {len(r.hard_samples)} (worst: {r.hard_samples[0]['worst_score']:.3f})")

    def _save_history(self) -> None:
        self._history_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._history_path, "w") as f:
            json.dump([asdict(h) for h in self.history], f, indent=2)

    def _load_history(self) -> None:
        if self._history_path.exists():
            try:
                with open(self._history_path) as f:
                    data = json.load(f)
                self.iteration = len(data)
            except Exception:
                pass

    def cleanup(self) -> None:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
