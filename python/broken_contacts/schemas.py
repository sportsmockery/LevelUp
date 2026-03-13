"""Data schemas for the relationship-aware dental contact pipeline.

Implements dual-layer labeling:
  - Morphology: what is physically observed (open_small, restoration_step)
  - Clinical: diagnostic interpretation (food_trap_risk, restoration_failure)
"""

from dataclasses import dataclass, asdict, field
from typing import List, Optional


@dataclass
class DetectorConfidences:
    left_tooth: float
    right_tooth: float
    interproximal_region: Optional[float] = None
    left_distal_surface: Optional[float] = None
    right_mesial_surface: Optional[float] = None
    contact_gap_candidate: Optional[float] = None
    restoration_margin: Optional[float] = None

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class ImageQuality:
    """Quality assessment for exclusion/weighting."""
    quality_score: float = 1.0  # 0.0 to 1.0
    exclusion_tags: List[str] = field(default_factory=list)
    is_assessable: bool = True

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class MorphologyLabel:
    """What is physically seen in the contact region."""
    label: str              # closed_contact, open_small, open_large, restoration_step, marginal_ridge_mismatch
    confidence: float
    gap_width_px: Optional[float] = None  # estimated gap width in pixels if open

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class ClinicalLabel:
    """Diagnostic interpretation of the contact."""
    label: str              # normal_contact, food_trap_risk, restoration_failure, monitor, not_assessable
    confidence: float
    reasoning: Optional[str] = None

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class GeometricData:
    """Geometric measurements from the pair graph builder."""
    contact_distance_px: float       # shortest distance between surfaces
    contact_midpoint: List[float]    # [x, y] midpoint of shortest path
    surface_point_left: List[float]  # [x, y] closest point on distal surface
    surface_point_right: List[float] # [x, y] closest point on mesial surface
    rotation_angle_deg: float = 0.0  # rotation applied to normalize the crop
    crown_context_left: float = 0.0  # fraction of left crown visible in crop
    crown_context_right: float = 0.0 # fraction of right crown visible in crop

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ContactPrediction:
    """Full relational contact prediction with dual-layer labels."""
    pair_index: int
    left_tooth_box: List[float]
    right_tooth_box: List[float]
    contact_box: List[float]

    # Dual-layer labels
    morphology: MorphologyLabel
    clinical: ClinicalLabel

    # Legacy simple label (for backward compat with UI)
    classifier_label: str
    classifier_confidence: float

    # Metadata
    detector_confidences: DetectorConfidences
    geometry: Optional[GeometricData] = None
    pair_type: str = "interproximal"  # interproximal or occlusal
    left_to_right_index: Optional[List[int]] = None  # [tooth_i, tooth_i+1]
    has_restoration: bool = False
    crop_path: Optional[str] = None

    def to_dict(self) -> dict:
        d = {
            "pair_index": self.pair_index,
            "pair_type": self.pair_type,
            "left_tooth_box": self.left_tooth_box,
            "right_tooth_box": self.right_tooth_box,
            "contact_box": self.contact_box,
            "morphology": self.morphology.to_dict(),
            "clinical": self.clinical.to_dict(),
            "classifier_label": self.classifier_label,
            "classifier_confidence": self.classifier_confidence,
            "detector_confidences": self.detector_confidences.to_dict(),
            "has_restoration": self.has_restoration,
        }
        if self.geometry:
            d["geometry"] = self.geometry.to_dict()
        if self.left_to_right_index:
            d["left_to_right_index"] = self.left_to_right_index
        if self.crop_path:
            d["crop_path"] = self.crop_path
        return d


@dataclass
class ImageMetadata:
    """Per-image metadata for modality-aware processing."""
    modality: str = "intraoral_photo"  # bitewing, intraoral_photo, periapical, other
    arch_view: str = "unknown"         # upper, lower, full, unknown
    quality: ImageQuality = field(default_factory=ImageQuality)

    def to_dict(self) -> dict:
        return {
            "modality": self.modality,
            "arch_view": self.arch_view,
            "quality": self.quality.to_dict(),
        }


@dataclass
class ImageResult:
    """Complete pipeline output for a single image."""
    image_path: str
    contacts: List[ContactPrediction]
    metadata: ImageMetadata = field(default_factory=ImageMetadata)

    def to_dict(self) -> dict:
        return {
            "image_path": self.image_path,
            "metadata": self.metadata.to_dict(),
            "contacts": [c.to_dict() for c in self.contacts],
        }
