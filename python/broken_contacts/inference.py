"""End-to-end 3-stage broken contacts inference pipeline.

Stage 1: Multi-class YOLO detection/segmentation
Stage 2: Geometric pair graph building (distance-minimized surface centroids)
Stage 3: Pair-level classifier + rules adjudication
"""

import json
from pathlib import Path
from typing import List, Optional

import numpy as np
from PIL import Image

from broken_contacts.config import Config
from broken_contacts.detector import ContactDetector
from broken_contacts.classifier import ContactClassifier
from broken_contacts.pair_graph import PairGraphBuilder
from broken_contacts.rules import RulesLayer
from broken_contacts.schemas import (
    ContactPrediction,
    DetectorConfidences,
    MorphologyLabel,
    ClinicalLabel,
    GeometricData,
    ImageResult,
    ImageMetadata,
    ImageQuality,
)
from broken_contacts.visualize import save_annotated
from broken_contacts.utils import ensure_dir


class BrokenContactsPipeline:
    """3-stage pipeline: Detection -> Pair Graph -> Classification + Rules."""

    def __init__(
        self,
        config: Optional[Config] = None,
        mm_per_pixel: Optional[float] = None,
    ):
        self.config = config or Config()
        self.detector = ContactDetector(self.config)
        self.classifier = ContactClassifier(self.config)
        self.pair_builder = PairGraphBuilder(self.config)
        self.rules = RulesLayer(self.config, mm_per_pixel=mm_per_pixel)

    def run(
        self,
        image_path: str,
        output_dir: Optional[str] = None,
        save_crops: bool = True,
        save_visualization: bool = True,
        save_json: bool = True,
        modality: str = "intraoral_photo",
        arch_view: str = "unknown",
    ) -> ImageResult:
        """Run the full 3-stage pipeline on a single image.

        Args:
            image_path: Path to the input image.
            output_dir: Directory for outputs.
            save_crops: Whether to save individual contact crops.
            save_visualization: Whether to save the annotated image.
            save_json: Whether to save JSON results.
            modality: Image modality (bitewing, intraoral_photo, periapical, other).
            arch_view: Arch view (upper, lower, full, unknown).

        Returns:
            ImageResult with per-contact predictions including dual-layer labels.
        """
        if output_dir is None:
            output_dir = self.config.output_dir
        out_path = ensure_dir(Path(output_dir))

        image = Image.open(image_path).convert("RGB")
        image_name = Path(image_path).stem

        metadata = ImageMetadata(modality=modality, arch_view=arch_view)

        # --- Stage 1: Multi-class detection ---
        stage1 = self.detector.detect(image)

        if not stage1.tooth_boxes:
            result = ImageResult(image_path=image_path, contacts=[], metadata=metadata)
            if save_json:
                self._save_json(result, out_path / f"{image_name}.json")
            return result

        # --- Stage 2: Geometric pair graph ---
        pairs = self.pair_builder.build_pairs_from_masks(
            image=image,
            tooth_boxes=stage1.tooth_boxes,
            tooth_confs=stage1.tooth_confs,
            distal_masks=stage1.distal_masks,
            mesial_masks=stage1.mesial_masks,
            gap_candidates=stage1.gap_boxes if stage1.gap_boxes else None,
            gap_confs=stage1.gap_confs if stage1.gap_confs else None,
            restoration_boxes=stage1.restoration_boxes if stage1.restoration_boxes else None,
        )

        if not pairs:
            result = ImageResult(image_path=image_path, contacts=[], metadata=metadata)
            if save_json:
                self._save_json(result, out_path / f"{image_name}.json")
            return result

        # Save crops if requested
        if save_crops:
            crop_dir = ensure_dir(out_path / "crops")
            for p in pairs:
                if p["crop_image"] is not None:
                    crop_path = str(crop_dir / f"{image_name}_contact_{p['pair_index']}.jpg")
                    p["crop_image"].save(crop_path, quality=95)
                    p["crop_path"] = crop_path

        # --- Stage 3: Classification + Rules adjudication ---
        crop_images = [p["crop_image"] for p in pairs if p["crop_image"] is not None]
        predictions = self.classifier.predict_batch(crop_images) if crop_images else []

        contacts: List[ContactPrediction] = []
        pred_idx = 0
        for pair in pairs:
            if pair["crop_image"] is None:
                continue

            raw_label, raw_conf = predictions[pred_idx]
            pred_idx += 1

            # Build raw morphology and clinical from classifier output
            raw_morphology = self._classifier_to_morphology(raw_label, raw_conf)
            raw_clinical = ClinicalLabel(label=raw_label, confidence=raw_conf)

            geo: Optional[GeometricData] = pair.get("geometry")

            # Apply rules adjudication
            adjudicated = self.rules.adjudicate(
                morphology=raw_morphology,
                raw_clinical=raw_clinical,
                has_restoration=pair.get("has_restoration", False),
                gap_candidate_conf=pair.get("contact_gap_conf"),
                contact_distance_px=geo.contact_distance_px if geo else None,
                image_quality=metadata.quality,
                modality=modality,
            )

            # Map to simple label for backward compat UI
            simple_label, simple_conf = self.rules.map_to_simple_label(adjudicated)

            contact = ContactPrediction(
                pair_index=pair["pair_index"],
                left_tooth_box=pair["left_tooth_box"],
                right_tooth_box=pair["right_tooth_box"],
                contact_box=pair["contact_box"],
                morphology=raw_morphology,
                clinical=adjudicated,
                classifier_label=simple_label,
                classifier_confidence=simple_conf,
                detector_confidences=DetectorConfidences(
                    left_tooth=pair["left_tooth_conf"],
                    right_tooth=pair["right_tooth_conf"],
                    contact_gap_candidate=pair.get("contact_gap_conf"),
                ),
                geometry=geo,
                pair_type="interproximal",
                left_to_right_index=pair.get("left_to_right_index"),
                has_restoration=pair.get("has_restoration", False),
                crop_path=pair.get("crop_path"),
            )
            contacts.append(contact)

        result = ImageResult(image_path=image_path, contacts=contacts, metadata=metadata)

        if save_visualization:
            vis_path = str(out_path / f"{image_name}_annotated.jpg")
            save_annotated(image, contacts, vis_path, tooth_boxes=stage1.tooth_boxes)

        if save_json:
            self._save_json(result, out_path / f"{image_name}.json")

        return result

    def run_batch(
        self,
        image_dir: str,
        output_dir: Optional[str] = None,
        modality: str = "intraoral_photo",
        extensions: tuple = (".jpg", ".jpeg", ".png", ".webp"),
    ) -> List[ImageResult]:
        """Run the pipeline on all images in a directory."""
        image_dir_path = Path(image_dir)
        if not image_dir_path.is_dir():
            raise NotADirectoryError(f"Image directory not found: {image_dir_path}")

        image_files = sorted(
            f for f in image_dir_path.iterdir()
            if f.suffix.lower() in extensions
        )

        if not image_files:
            raise FileNotFoundError(f"No images found in {image_dir_path}")

        results = []
        for img_path in image_files:
            print(f"Processing: {img_path.name}")
            result = self.run(
                str(img_path), output_dir=output_dir, modality=modality,
            )
            results.append(result)

            open_count = sum(
                1 for c in result.contacts
                if c.clinical.label in ("food_trap_risk", "restoration_failure")
            )
            print(f"  -> {len(result.contacts)} contacts, {open_count} flagged")

        if output_dir:
            summary_path = Path(output_dir) / "batch_results.json"
            with open(summary_path, "w") as f:
                json.dump([r.to_dict() for r in results], f, indent=2)
            print(f"\nBatch summary saved to: {summary_path}")

        return results

    @staticmethod
    def _classifier_to_morphology(label: str, confidence: float) -> MorphologyLabel:
        """Map simple classifier output to a morphology label."""
        mapping = {
            "normal_contact": "closed_contact",
            "open_contact": "open_small",
            "unclear_contact": "marginal_ridge_mismatch",
        }
        morph_label = mapping.get(label, "closed_contact")
        return MorphologyLabel(label=morph_label, confidence=confidence)

    @staticmethod
    def _save_json(result: ImageResult, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(result.to_dict(), f, indent=2)
