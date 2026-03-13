"""Centralized configuration for the relationship-aware dental contact pipeline."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


# --- Exclusion classes for data quality ---
EXCLUSION_TAGS = ["motion_blur", "saliva_glare", "orthodontic_hardware"]


@dataclass
class Config:
    # --- Model paths ---
    detector_model_path: str = "runs/detect/contacts_detector_v1/weights/best.pt"
    classifier_model_path: str = "runs/classify/contacts_classifier_v1/best.pt"
    base_yolo_model: str = "yolov12s_010826.pt"
    sam_checkpoint_path: str = "sam_vit_b_01ec64.pth"

    # --- Stage 1: Detector settings ---
    detector_confidence: float = 0.3
    detector_iou_threshold: float = 0.5
    detector_imgsz: int = 640
    use_segmentation: bool = True  # prefer segment masks over boxes

    # --- Stage 2: Pair graph builder ---
    interproximal_padding: float = 0.15
    crop_size: int = 512  # larger crop for relational context
    min_tooth_overlap_y: float = 0.3
    min_crown_context: float = 0.20  # at least 20% of adjacent crown visible in crop
    rotation_normalize: bool = True  # rotate crop so contact vector is horizontal

    # --- Stage 3: Classifier settings ---
    classifier_imgsz: int = 224
    classifier_confidence_threshold: float = 0.5

    # --- SAM Factory settings ---
    sam_model_type: str = "vit_b"
    sam_yolo_weight: float = 0.4
    sam_sam_weight: float = 0.6
    gold_score_min: float = 0.85
    gold_iou_min: float = 0.70
    silver_score_min: float = 0.65
    enhance_images: bool = True

    # --- Output ---
    output_dir: str = "runs/broken_contacts_inference"

    # =========================================================================
    # Stage 1: Detector & Segmentation Classes (9 classes)
    # Used for YOLO detection and SAM2 mask refinement
    # =========================================================================
    detector_classes: Dict[int, str] = field(default_factory=lambda: {
        0: "tooth_crown",            # Main body; primary anchor for all pairs
        1: "mesial_surface",          # Anterior-facing proximal wall
        2: "distal_surface",          # Posterior-facing proximal wall; shortest-distance logic
        3: "occlusal_surface",        # Biting surface; articulating marks and wear facets
        4: "restoration_margin",      # Interface between tooth and filling/crown
        5: "contact_gap_candidate",   # Visual space/void between teeth
        6: "articulating_mark",       # Ink marks on occlusal surface
        7: "ortho_hardware",          # EXCLUSION: brackets/wires — masked from distance calcs
        8: "gingival_margin",         # Gum line; vertical food impaction depth
    })

    # =========================================================================
    # Stage 3: Relational Classification Classes (8 classes)
    # Final output after Rules Layer adjudicates pair crops
    # =========================================================================
    relational_classes: Dict[int, str] = field(default_factory=lambda: {
        0: "normal_interproximal",    # Tight, healthy contact — no gap or food trap
        1: "open_contact_small",      # Gap < 0.5mm — high risk for food impaction
        2: "open_contact_large",      # Diastema > 1.0mm — non-contacting, may self-cleanse
        3: "restoration_failure",     # Contact issue from overhang or deficient margin
        4: "normal_occlusal",         # Standard biting contact verified by mark presence
        5: "heavy_occlusal",          # Excessive force — requires T-Scan or clinician GT
        6: "missing_contact",         # Missing tooth or bite does not meet
        7: "non_diagnostic",          # Kill switch — blur, overlap, or obscured
    })

    # --- Stage 3 morphology labels (what is physically seen) ---
    morphology_classes: List[str] = field(default_factory=lambda: [
        "closed_contact",
        "open_small",               # < 0.5mm visible gap
        "open_large",               # >= 0.5mm visible gap
        "restoration_step",         # step/overhang at restoration margin
        "marginal_ridge_mismatch",
    ])

    # --- Stage 3 clinical interpretation labels ---
    clinical_classes: List[str] = field(default_factory=lambda: [
        "normal_contact",
        "food_trap_risk",
        "restoration_failure",
        "monitor",
        "not_assessable",
    ])

    # --- Legacy classifier classes (backward compat for simple mode) ---
    classifier_classes: List[str] = field(default_factory=lambda: [
        "normal_contact",
        "open_contact",
        "unclear_contact",
    ])

    # --- Modality weighting for training ---
    modality_weights: Dict[str, float] = field(default_factory=lambda: {
        "bitewing": 0.40,
        "intraoral_photo": 0.30,
        "periapical": 0.20,
        "other": 0.10,
    })

    # --- Pair types ---
    pair_types: List[str] = field(default_factory=lambda: [
        "interproximal",
        "occlusal",
    ])

    # --- Exclusion class IDs (masked from distance calcs) ---
    exclusion_class_ids: List[int] = field(default_factory=lambda: [7])

    # --- Relational class IDs (participate in pair logic) ---
    relational_surface_ids: List[int] = field(default_factory=lambda: [1, 2])

    @property
    def num_detector_classes(self) -> int:
        return len(self.detector_classes)

    @property
    def num_relational_classes(self) -> int:
        return len(self.relational_classes)

    @property
    def num_classifier_classes(self) -> int:
        return len(self.classifier_classes)

    @property
    def num_morphology_classes(self) -> int:
        return len(self.morphology_classes)

    @property
    def num_clinical_classes(self) -> int:
        return len(self.clinical_classes)

    @property
    def detector_class_names(self) -> List[str]:
        return list(self.detector_classes.values())

    @property
    def relational_class_names(self) -> List[str]:
        return list(self.relational_classes.values())
