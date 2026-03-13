"""Stage 1: Multi-class YOLO detector for teeth, surfaces, and contact features.

Detects 7 classes: tooth_crown, mesial_surface, distal_surface, occlusal_surface,
restoration_margin, contact_gap_candidate, articulating_mark.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image
from ultralytics import YOLO

from broken_contacts.config import Config


class StageOneDetections:
    """Structured output from Stage 1 detector."""

    def __init__(self):
        self.tooth_boxes: List[np.ndarray] = []
        self.tooth_confs: List[float] = []
        self.mesial_masks: List[Optional[np.ndarray]] = []
        self.mesial_confs: List[Optional[float]] = []
        self.distal_masks: List[Optional[np.ndarray]] = []
        self.distal_confs: List[Optional[float]] = []
        self.occlusal_boxes: List[np.ndarray] = []
        self.occlusal_confs: List[float] = []
        self.restoration_boxes: List[np.ndarray] = []
        self.restoration_confs: List[float] = []
        self.gap_boxes: List[np.ndarray] = []
        self.gap_confs: List[float] = []
        self.artic_boxes: List[np.ndarray] = []
        self.artic_confs: List[float] = []


class ContactDetector:
    """Runs multi-class YOLO detection/segmentation for dental surfaces."""

    def __init__(self, config: Config):
        self.config = config
        model_path = config.detector_model_path
        if not Path(model_path).exists():
            raise FileNotFoundError(
                f"Detector model not found: {model_path}. "
                "Train the detector first with train_contacts_detector.py"
            )
        self.model = YOLO(model_path)

    def detect(self, image: Image.Image) -> StageOneDetections:
        """Run multi-class detection on an image.

        Returns a StageOneDetections object with all 7 class outputs organized.
        """
        results = self.model.predict(
            source=image,
            conf=self.config.detector_confidence,
            iou=self.config.detector_iou_threshold,
            imgsz=self.config.detector_imgsz,
            verbose=False,
        )

        result = results[0]
        det = StageOneDetections()
        img_h, img_w = image.height, image.width

        has_masks = result.masks is not None

        for idx, box in enumerate(result.boxes):
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].cpu().numpy()

            if cls_id == 0:  # tooth_crown
                det.tooth_boxes.append(xyxy)
                det.tooth_confs.append(conf)
                # Initialize surface slots (filled below by matching)
                det.distal_masks.append(None)
                det.distal_confs.append(None)
                det.mesial_masks.append(None)
                det.mesial_confs.append(None)
            elif cls_id == 1:  # mesial_surface
                mask = self._extract_mask(result, idx, img_h, img_w) if has_masks else None
                self._assign_surface_to_nearest_tooth(
                    xyxy, conf, mask, det, "mesial"
                )
            elif cls_id == 2:  # distal_surface
                mask = self._extract_mask(result, idx, img_h, img_w) if has_masks else None
                self._assign_surface_to_nearest_tooth(
                    xyxy, conf, mask, det, "distal"
                )
            elif cls_id == 3:  # occlusal_surface
                det.occlusal_boxes.append(xyxy)
                det.occlusal_confs.append(conf)
            elif cls_id == 4:  # restoration_margin
                det.restoration_boxes.append(xyxy)
                det.restoration_confs.append(conf)
            elif cls_id == 5:  # contact_gap_candidate
                det.gap_boxes.append(xyxy)
                det.gap_confs.append(conf)
            elif cls_id == 6:  # articulating_mark
                det.artic_boxes.append(xyxy)
                det.artic_confs.append(conf)

        # Sort teeth left-to-right and reorder surface assignments
        if det.tooth_boxes:
            self._sort_teeth_lr(det)

        return det

    def detect_simple(
        self, image: Image.Image
    ) -> Tuple[List[np.ndarray], List[float], List[np.ndarray], List[float]]:
        """Backward-compatible simple detection returning only tooth and gap boxes."""
        stage1 = self.detect(image)
        return (
            stage1.tooth_boxes,
            stage1.tooth_confs,
            stage1.gap_boxes,
            stage1.gap_confs,
        )

    def _extract_mask(
        self, result, box_idx: int, img_h: int, img_w: int
    ) -> Optional[np.ndarray]:
        """Extract a binary mask for a specific detection."""
        if result.masks is None or box_idx >= len(result.masks):
            return None
        mask_data = result.masks[box_idx].data.cpu().numpy()
        if mask_data.ndim == 3:
            mask_data = mask_data[0]
        # Resize mask to image dimensions if needed
        if mask_data.shape != (img_h, img_w):
            from PIL import Image as PILImage
            mask_pil = PILImage.fromarray((mask_data * 255).astype(np.uint8))
            mask_pil = mask_pil.resize((img_w, img_h), PILImage.NEAREST)
            mask_data = np.array(mask_pil) / 255.0
        return (mask_data > 0.5).astype(np.uint8)

    def _assign_surface_to_nearest_tooth(
        self,
        surface_box: np.ndarray,
        surface_conf: float,
        surface_mask: Optional[np.ndarray],
        det: StageOneDetections,
        surface_type: str,
    ) -> None:
        """Assign a detected surface to the nearest tooth_crown by center distance."""
        if not det.tooth_boxes:
            return

        scx = (surface_box[0] + surface_box[2]) / 2
        scy = (surface_box[1] + surface_box[3]) / 2

        min_dist = float("inf")
        best_idx = 0
        for i, tb in enumerate(det.tooth_boxes):
            tcx = (tb[0] + tb[2]) / 2
            tcy = (tb[1] + tb[3]) / 2
            dist = (scx - tcx) ** 2 + (scy - tcy) ** 2
            if dist < min_dist:
                min_dist = dist
                best_idx = i

        if surface_type == "mesial":
            det.mesial_masks[best_idx] = surface_mask
            det.mesial_confs[best_idx] = surface_conf
        else:
            det.distal_masks[best_idx] = surface_mask
            det.distal_confs[best_idx] = surface_conf

    @staticmethod
    def _sort_teeth_lr(det: StageOneDetections) -> None:
        """Sort tooth detections left-to-right, preserving surface assignments."""
        x_centers = [(b[0] + b[2]) / 2 for b in det.tooth_boxes]
        order = np.argsort(x_centers).tolist()

        det.tooth_boxes = [det.tooth_boxes[i] for i in order]
        det.tooth_confs = [det.tooth_confs[i] for i in order]
        det.distal_masks = [det.distal_masks[i] for i in order]
        det.distal_confs = [det.distal_confs[i] for i in order]
        det.mesial_masks = [det.mesial_masks[i] for i in order]
        det.mesial_confs = [det.mesial_confs[i] for i in order]
