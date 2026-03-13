"""Rules Layer: Adjudicates final diagnosis from morphology + clinical labels.

Implements clinical guardrails:
- Geometric gap override: physical gap > 1mm cannot be 'normal'
- Occlusal contact rejection: heavy_occlusal_contact requires T-Scan or clinician consensus
- Exclusion enforcement: not_assessable for degraded images
- Modality-specific weighting: bitewing priority for overlap confirmation
- Calibrated mm-per-pixel measurements when available
"""

from typing import Optional

import numpy as np

from broken_contacts.config import Config
from broken_contacts.schemas import (
    MorphologyLabel,
    ClinicalLabel,
    ContactPrediction,
    ImageQuality,
)


class RulesLayer:
    """Clinical rules engine that converts raw model outputs to adjudicated diagnoses.

    Separates what the model *sees* (morphology) from what it *means* (clinical).
    Applies domain constraints that a pure classifier cannot learn from data alone.
    """

    def __init__(self, config: Optional[Config] = None, mm_per_pixel: Optional[float] = None):
        self.config = config or Config()
        self.mm_per_pixel = mm_per_pixel  # calibration ratio, None if uncalibrated

    def adjudicate(
        self,
        morphology: MorphologyLabel,
        raw_clinical: ClinicalLabel,
        has_restoration: bool = False,
        gap_candidate_conf: Optional[float] = None,
        contact_distance_px: Optional[float] = None,
        image_quality: Optional[ImageQuality] = None,
        modality: str = "intraoral_photo",
    ) -> ClinicalLabel:
        """Apply clinical rules to produce the final diagnosis.

        Args:
            morphology: What the model physically observes.
            raw_clinical: The classifier's raw clinical prediction.
            has_restoration: Whether a restoration_margin was detected nearby.
            gap_candidate_conf: Confidence of a contact_gap_candidate detection.
            contact_distance_px: Geometric distance between surfaces in pixels.
            image_quality: Quality assessment of the source image.
            modality: Image modality (bitewing, intraoral_photo, periapical, other).

        Returns:
            Adjudicated ClinicalLabel with rules-based reasoning.
        """
        # --- Rule 1: Image quality exclusion ---
        if image_quality and not image_quality.is_assessable:
            return ClinicalLabel(
                label="not_assessable",
                confidence=1.0,
                reasoning=f"Image excluded: {', '.join(image_quality.exclusion_tags)}",
            )

        if image_quality and image_quality.quality_score < 0.3:
            return ClinicalLabel(
                label="not_assessable",
                confidence=0.9,
                reasoning=f"Low image quality score: {image_quality.quality_score:.2f}",
            )

        # --- Rule 2: Geometric gap override (mm-calibrated) ---
        if contact_distance_px is not None and self.mm_per_pixel is not None:
            d_mm = contact_distance_px * self.mm_per_pixel
            result = self._apply_geometric_override(
                d_mm, morphology, raw_clinical, modality
            )
            if result is not None:
                return result

        # --- Rule 3: Bitewing overlap confirmation ---
        if modality == "bitewing" and contact_distance_px is not None:
            if self.mm_per_pixel is not None:
                d_mm = contact_distance_px * self.mm_per_pixel
                if d_mm < 0.1:
                    return ClinicalLabel(
                        label="normal_contact",
                        confidence=0.92,
                        reasoning=f"Bitewing X-ray confirms overlap (gap={d_mm:.2f}mm < 0.1mm).",
                    )

        # --- Rule 4: Restoration-adjacent defects ---
        if has_restoration and morphology.label in ("open_small", "open_large", "restoration_step"):
            return ClinicalLabel(
                label="restoration_failure",
                confidence=min(morphology.confidence, 0.95),
                reasoning=(
                    f"Morphology '{morphology.label}' detected adjacent to restoration margin. "
                    "Classified as restoration failure per clinical protocol."
                ),
            )

        # --- Rule 5: Gap candidate verification ---
        if gap_candidate_conf is not None and gap_candidate_conf > 0.5:
            if morphology.label in ("open_small", "open_large"):
                boosted_conf = min(morphology.confidence * 1.15, 0.99)
                return ClinicalLabel(
                    label="food_trap_risk",
                    confidence=round(boosted_conf, 4),
                    reasoning=(
                        f"Open contact ({morphology.label}) verified by gap candidate "
                        f"detection (conf={gap_candidate_conf:.2f}). Elevated to food_trap_risk."
                    ),
                )

        # --- Rule 6: Morphology-to-clinical mapping ---
        if morphology.label == "closed_contact":
            return ClinicalLabel(
                label="normal_contact",
                confidence=morphology.confidence,
                reasoning="Closed contact morphology observed.",
            )

        if morphology.label == "open_large":
            return ClinicalLabel(
                label="food_trap_risk",
                confidence=morphology.confidence,
                reasoning="Large open contact detected — food trap risk.",
            )

        if morphology.label == "open_small":
            if morphology.confidence > 0.8:
                return ClinicalLabel(
                    label="food_trap_risk",
                    confidence=round(morphology.confidence * 0.85, 4),
                    reasoning="Small open contact with high confidence — potential food trap.",
                )
            return ClinicalLabel(
                label="monitor",
                confidence=round(morphology.confidence * 0.7, 4),
                reasoning="Small open contact with moderate confidence — recommend monitoring.",
            )

        if morphology.label == "marginal_ridge_mismatch":
            return ClinicalLabel(
                label="monitor",
                confidence=round(morphology.confidence * 0.8, 4),
                reasoning="Marginal ridge height mismatch — may affect contact quality.",
            )

        # --- Rule 7: Low confidence fallback ---
        if raw_clinical.confidence < self.config.classifier_confidence_threshold:
            return ClinicalLabel(
                label="monitor",
                confidence=raw_clinical.confidence,
                reasoning=(
                    f"Classifier confidence ({raw_clinical.confidence:.2f}) below threshold "
                    f"({self.config.classifier_confidence_threshold}). Defaulting to monitor."
                ),
            )

        # --- Default: trust the classifier ---
        return ClinicalLabel(
            label=raw_clinical.label,
            confidence=raw_clinical.confidence,
            reasoning=f"Classifier prediction accepted (conf={raw_clinical.confidence:.2f}).",
        )

    def _apply_geometric_override(
        self,
        d_mm: float,
        morphology: MorphologyLabel,
        raw_clinical: ClinicalLabel,
        modality: str,
    ) -> Optional[ClinicalLabel]:
        """Geometric gap override: physical gap measurements trump classifier when unambiguous.

        - Gap > 1.0mm: cannot be 'normal', override to open
        - Gap < 0.1mm on bitewing: confirmed normal (overlap)
        """
        if d_mm > 1.0 and raw_clinical.label == "normal_contact":
            return ClinicalLabel(
                label="food_trap_risk",
                confidence=0.88,
                reasoning=(
                    f"Geometric override: measured gap {d_mm:.2f}mm > 1.0mm threshold. "
                    f"Classifier predicted 'normal_contact' but physical gap too large."
                ),
            )

        if d_mm > 0.5 and raw_clinical.label == "normal_contact":
            return ClinicalLabel(
                label="monitor",
                confidence=0.75,
                reasoning=(
                    f"Geometric flag: measured gap {d_mm:.2f}mm (0.5-1.0mm range). "
                    f"Classifier predicted 'normal_contact' — recommend monitoring."
                ),
            )

        return None

    def reject_occlusal_overreach(
        self,
        label: str,
        has_tscan_data: bool = False,
        has_clinician_consensus: bool = False,
    ) -> bool:
        """Occlusal guardrail: reject heavy_occlusal_contact unless grounded.

        Articulating paper mark size != force. This label requires either
        T-Scan data or explicit clinician consensus.

        Returns:
            True if the label should be rejected (not grounded).
        """
        if label != "heavy_occlusal_contact":
            return False
        return not (has_tscan_data or has_clinician_consensus)

    def map_to_simple_label(self, clinical: ClinicalLabel) -> tuple[str, float]:
        """Map dual-layer clinical label back to simple 3-class for backward compat.

        Returns:
            (simple_label, confidence) tuple.
        """
        mapping = {
            "normal_contact": "normal_contact",
            "food_trap_risk": "open_contact",
            "restoration_failure": "open_contact",
            "monitor": "unclear_contact",
            "not_assessable": "unclear_contact",
        }
        simple = mapping.get(clinical.label, "unclear_contact")
        return simple, clinical.confidence
