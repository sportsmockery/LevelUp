"""Truth Engine — Recursive loop logic for clinical override back-propagation.

When an orthodontist clicks "Clinical Override" in the adjudication UI:
1. Coordinate Capture — captures the pixel region where human-AI drift occurred
2. Vector Search — queries dataset for images with similar geometric signature
3. Mass Flagging — demotes matching images from Silver to Scrap/Reject
4. Labeling Refinement — generates labeling hints for that cluster

This creates a self-correcting feedback loop where expert corrections
propagate backward through the training data.
"""

import json
import math
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class DriftRegion:
    """The specific region where human-AI disagreement occurred."""
    tooth_id: str = ""              # e.g. "FDI_31"
    surface: str = ""               # e.g. "distal"
    pixel_bbox: List[float] = field(default_factory=list)  # [x1, y1, x2, y2]
    d_min_mm: float = 0.0           # measured interproximal distance
    ai_prediction: str = ""         # what the AI said
    expert_label: str = ""          # what the expert corrected to
    confidence_delta: float = 0.0   # AI confidence minus expert confidence


@dataclass
class GeometricSignature:
    """Searchable signature for finding similar images."""
    d_min_range: Tuple[float, float] = (0.0, 0.0)  # mm range
    image_angle: str = ""            # occlusal, lateral, frontal
    hardware_types: List[str] = field(default_factory=list)
    modality: str = ""
    quality_flags: List[str] = field(default_factory=list)

    def matches(self, other: "GeometricSignature", tolerance_mm: float = 0.3) -> float:
        """Score how well another signature matches this one. Returns 0.0-1.0."""
        score = 0.0
        total = 0.0

        # d_min overlap
        total += 1.0
        if other.d_min_range[0] <= self.d_min_range[1] + tolerance_mm and \
           other.d_min_range[1] >= self.d_min_range[0] - tolerance_mm:
            overlap = min(self.d_min_range[1], other.d_min_range[1]) - \
                      max(self.d_min_range[0], other.d_min_range[0])
            span = max(self.d_min_range[1] - self.d_min_range[0], 0.1)
            score += min(overlap / span, 1.0) if overlap > 0 else 0.5

        # Modality match
        total += 1.0
        if self.modality and other.modality and self.modality == other.modality:
            score += 1.0

        # Hardware overlap
        if self.hardware_types:
            total += 1.0
            shared = set(self.hardware_types) & set(other.hardware_types)
            if shared:
                score += len(shared) / len(self.hardware_types)

        # Quality flag overlap
        if self.quality_flags:
            total += 0.5
            shared = set(self.quality_flags) & set(other.quality_flags)
            if shared:
                score += 0.5 * len(shared) / len(self.quality_flags)

        return score / total if total > 0 else 0.0


@dataclass
class OverrideEvent:
    """A single clinical override event."""
    override_id: str = ""
    timestamp: float = 0.0
    image_path: str = ""
    drift_region: DriftRegion = field(default_factory=DriftRegion)
    signature: GeometricSignature = field(default_factory=GeometricSignature)
    images_flagged: int = 0
    labeling_hint: str = ""

    def to_dict(self) -> dict:
        return {
            "override_id": self.override_id,
            "timestamp": self.timestamp,
            "image_path": self.image_path,
            "drift_region": asdict(self.drift_region),
            "signature": asdict(self.signature),
            "images_flagged": self.images_flagged,
            "labeling_hint": self.labeling_hint,
        }


@dataclass
class ImageRecord:
    """Lightweight record for tracking image tier status."""
    filename: str
    tier: str = "SILVER"            # PLATINUM, GOLD, SILVER, SCRAP, REJECT
    d_min_mm: float = 0.0
    modality: str = ""
    hardware_types: List[str] = field(default_factory=list)
    quality_flags: List[str] = field(default_factory=list)
    override_ids: List[str] = field(default_factory=list)
    labeling_hints: List[str] = field(default_factory=list)


class TruthEngine:
    """Manages the override → search → flag → hint pipeline."""

    MATCH_THRESHOLD = 0.55  # Minimum signature match score to flag

    def __init__(self, persist_dir: str = "data/truth_engine"):
        self._persist_dir = Path(persist_dir)
        self._persist_dir.mkdir(parents=True, exist_ok=True)
        self._overrides: List[OverrideEvent] = []
        self._image_registry: Dict[str, ImageRecord] = {}
        self._load()

    def _load(self) -> None:
        overrides_path = self._persist_dir / "overrides.json"
        if overrides_path.exists():
            try:
                data = json.loads(overrides_path.read_text())
                self._overrides = [
                    OverrideEvent(**{k: v for k, v in o.items()
                                    if k in OverrideEvent.__dataclass_fields__})
                    for o in data.get("overrides", [])
                ]
            except Exception:
                self._overrides = []

        registry_path = self._persist_dir / "image_registry.json"
        if registry_path.exists():
            try:
                data = json.loads(registry_path.read_text())
                for filename, rec in data.items():
                    self._image_registry[filename] = ImageRecord(
                        filename=filename,
                        tier=rec.get("tier", "SILVER"),
                        d_min_mm=rec.get("d_min_mm", 0.0),
                        modality=rec.get("modality", ""),
                        hardware_types=rec.get("hardware_types", []),
                        quality_flags=rec.get("quality_flags", []),
                        override_ids=rec.get("override_ids", []),
                        labeling_hints=rec.get("labeling_hints", []),
                    )
            except Exception:
                pass

    def _save(self) -> None:
        overrides_path = self._persist_dir / "overrides.json"
        overrides_path.write_text(json.dumps(
            {"overrides": [o.to_dict() for o in self._overrides]},
            indent=2,
        ))

        registry_path = self._persist_dir / "image_registry.json"
        registry_data = {}
        for filename, rec in self._image_registry.items():
            registry_data[filename] = asdict(rec)
        registry_path.write_text(json.dumps(registry_data, indent=2))

    def register_image(self, filename: str, tier: str = "SILVER",
                       d_min_mm: float = 0.0, modality: str = "",
                       hardware_types: Optional[List[str]] = None,
                       quality_flags: Optional[List[str]] = None) -> None:
        """Register an image in the truth engine for override tracking."""
        self._image_registry[filename] = ImageRecord(
            filename=filename,
            tier=tier,
            d_min_mm=d_min_mm,
            modality=modality,
            hardware_types=hardware_types or [],
            quality_flags=quality_flags or [],
        )

    def clinical_override(
        self,
        image_path: str,
        drift_region: DriftRegion,
        signature: GeometricSignature,
    ) -> OverrideEvent:
        """Execute the full override pipeline.

        1. Record the drift event
        2. Search for similar images via geometric signature
        3. Mass-flag matching images (demote to SCRAP)
        4. Generate labeling hint for the cluster

        Returns the override event with stats.
        """
        override_id = f"ovr-{int(time.time())}-{len(self._overrides)}"

        # Step 2: Vector search — find matching images
        matches = self._search_similar(signature)

        # Step 3: Mass flagging — demote matches
        flagged_count = 0
        for filename, match_score in matches:
            rec = self._image_registry.get(filename)
            if rec and rec.tier in ("SILVER", "GOLD"):
                rec.tier = "SCRAP"
                rec.override_ids.append(override_id)
                flagged_count += 1

        # Step 4: Generate labeling hint
        hint = self._generate_hint(drift_region, signature, flagged_count)

        # Apply hint to flagged images
        for filename, _ in matches:
            rec = self._image_registry.get(filename)
            if rec and override_id in rec.override_ids:
                rec.labeling_hints.append(hint)

        # Record event
        event = OverrideEvent(
            override_id=override_id,
            timestamp=time.time(),
            image_path=image_path,
            drift_region=drift_region,
            signature=signature,
            images_flagged=flagged_count,
            labeling_hint=hint,
        )
        self._overrides.append(event)
        self._save()

        return event

    def _search_similar(self, signature: GeometricSignature) -> List[Tuple[str, float]]:
        """Find images with similar geometric signatures."""
        matches = []
        for filename, rec in self._image_registry.items():
            rec_sig = GeometricSignature(
                d_min_range=(rec.d_min_mm - 0.2, rec.d_min_mm + 0.2),
                modality=rec.modality,
                hardware_types=rec.hardware_types,
                quality_flags=rec.quality_flags,
            )
            score = signature.matches(rec_sig)
            if score >= self.MATCH_THRESHOLD:
                matches.append((filename, score))

        # Sort by match score descending
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    def _generate_hint(self, drift: DriftRegion, sig: GeometricSignature,
                       flagged: int) -> str:
        """Generate a labeling hint based on the override context."""
        parts = []

        if drift.surface and drift.tooth_id:
            parts.append(f"Override at {drift.surface} surface of {drift.tooth_id}")

        if drift.ai_prediction and drift.expert_label:
            parts.append(
                f"AI predicted '{drift.ai_prediction}' but expert labeled '{drift.expert_label}'"
            )

        if "metal_artifact_streaking" in sig.quality_flags or \
           "beam_hardening_scatter" in sig.quality_flags:
            parts.append(
                "In images with high beam artifact, prioritize the marginal ridge "
                "over the blurry gingival crest"
            )

        if sig.hardware_types:
            hw = ", ".join(sig.hardware_types)
            parts.append(f"Hardware present: {hw} — may cause reflective artifacts")

        if drift.d_min_mm > 0:
            parts.append(f"Measured gap: {drift.d_min_mm:.2f}mm")

        parts.append(f"{flagged} similar images demoted to SCRAP")

        return ". ".join(parts) + "."

    def get_stats(self) -> dict:
        """Get truth engine statistics."""
        tier_counts: Dict[str, int] = {}
        for rec in self._image_registry.values():
            tier_counts[rec.tier] = tier_counts.get(rec.tier, 0) + 1

        return {
            "total_overrides": len(self._overrides),
            "total_images": len(self._image_registry),
            "tier_distribution": tier_counts,
            "recent_overrides": [o.to_dict() for o in self._overrides[-10:]],
            "total_scraped": tier_counts.get("SCRAP", 0),
        }

    def get_image_status(self, filename: str) -> Optional[dict]:
        rec = self._image_registry.get(filename)
        if not rec:
            return None
        return asdict(rec)


# Singleton instance
truth_engine = TruthEngine()
