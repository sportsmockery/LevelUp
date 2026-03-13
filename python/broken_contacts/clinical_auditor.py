"""Clinical Auditor — Hard Logic Ruleset & OMMS Scoring for the Truth Engine.

Implements the orthodontic validation rules that every model run must pass:
  Phase 1: Hard Logic Validation (Sagittal, Vertical, Transverse, Hardware)
  Phase 2: OMMS (Orthodontic Model Maturity Score) calculation
  Phase 3: Progression tracking (deltas, 7-day rolling avg, purge impact)
  Phase 4: Production gatekeeper (RED/YELLOW/GREEN)
"""

import json
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# ═══════════════════════════════════════════════════════════════════════
# Phase 1: Hard Clinical Logic Ruleset
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class SagittalInput:
    molar_relation: str = "neutral"   # "distal", "mesial", "neutral"
    overjet_mm: float = 2.0
    incisor_inclination: str = "normal"  # "labial", "lingual", "normal"
    ANB_angle: float = 2.0


@dataclass
class VerticalInput:
    overbite_mm: float = 2.0
    overbite_percent: float = 25.0


@dataclass
class TransverseInput:
    maxillary_width: float = 35.0
    mandibular_width: float = 34.0


@dataclass
class HardwareInput:
    crowding_mm: float = 0.0
    overjet_mm: float = 2.0
    anchorage_need: str = "low"       # "low", "moderate", "high"
    d_min_contacts: List[float] = field(default_factory=list)  # d_min for each contact
    root_proximity_mm: float = 5.0    # closest root to TAD position
    tad_position: Optional[str] = None


@dataclass
class DiagnosisResult:
    classification: str = "Class_I"
    flags: List[str] = field(default_factory=list)
    hardware_suggestions: List[dict] = field(default_factory=list)
    biological_breaches: List[str] = field(default_factory=list)
    logic_violations: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def validate_sagittal(inp: SagittalInput) -> Tuple[str, List[str]]:
    """Sagittal classification logic."""
    classification = "Class_I"
    flags = []

    if inp.molar_relation == "distal" and inp.overjet_mm > 4.0:
        classification = "Class_II_Div_1"

    elif inp.molar_relation == "distal" and inp.overjet_mm < 2.0 and inp.incisor_inclination == "lingual":
        classification = "Class_II_Div_2"

    elif inp.molar_relation == "mesial" and inp.overjet_mm < 0:
        classification = "Class_III"

    if inp.overjet_mm < 0 and inp.ANB_angle < 0:
        flags.append("Skeletal_Class_III_Surgical_Risk")

    return classification, flags


def validate_vertical(inp: VerticalInput) -> List[str]:
    """Vertical diagnosis logic."""
    flags = []
    if inp.overbite_mm < 0:
        flags.append("Anterior_Open_Bite")
    if inp.overbite_percent > 40:
        flags.append("Deep_Bite")
    return flags


def validate_transverse(inp: TransverseInput) -> List[str]:
    """Transverse diagnosis logic."""
    flags = []
    if inp.maxillary_width < inp.mandibular_width:
        flags.append("Posterior_Crossbite")
    return flags


def suggest_hardware(inp: HardwareInput) -> Tuple[List[dict], List[str]]:
    """Hardware suggestion engine."""
    suggestions = []
    breaches = []

    if inp.crowding_mm > 5.0:
        suggestions.append({
            "device": "palatal_expander",
            "subtype": "RPE (Rapid Palatal Expander)",
            "reason": f"Crowding {inp.crowding_mm:.1f}mm > 5.0mm threshold",
            "alternative": "Serial extractions",
        })

    if inp.overjet_mm > 6.0 and inp.anchorage_need == "high":
        suggestions.append({
            "device": "tad_miniscrew",
            "subtype": "TADs (Temporary Anchorage Devices)",
            "reason": f"Overjet {inp.overjet_mm:.1f}mm > 6.0mm with high anchorage need",
        })

    # Power chain if multiple open contacts
    open_contacts = [d for d in inp.d_min_contacts if d > 1.0]
    if len(open_contacts) >= 3:
        suggestions.append({
            "device": "elastic",
            "subtype": "Power Chain (Space Closure)",
            "reason": f"{len(open_contacts)} contacts with d_min > 1.0mm",
        })

    # CRITICAL: Biological breach check
    if inp.root_proximity_mm < 1.0 and inp.tad_position:
        breaches.append(
            f"BIOLOGICAL BREACH: Root proximity {inp.root_proximity_mm:.2f}mm < 1.0mm "
            f"at TAD position {inp.tad_position}. BLOCK INFERENCE."
        )

    return suggestions, breaches


def run_hard_logic(
    sagittal: SagittalInput,
    vertical: VerticalInput,
    transverse: TransverseInput,
    hardware: HardwareInput,
    ai_diagnosis: str = "",
) -> DiagnosisResult:
    """Execute the full hard logic ruleset and return validated diagnosis."""
    classification, sag_flags = validate_sagittal(sagittal)
    vert_flags = validate_vertical(vertical)
    trans_flags = validate_transverse(transverse)
    hw_suggestions, bio_breaches = suggest_hardware(hardware)

    all_flags = sag_flags + vert_flags + trans_flags

    # Audit: check if AI diagnosis violates hard logic
    logic_violations = []
    if ai_diagnosis:
        if classification != "Class_I" and ai_diagnosis == "Class_I":
            logic_violations.append(
                f"AI diagnosed Class_I but hard logic says {classification}. "
                f"Triggering Clinical Override."
            )
        if "Skeletal_Class_III_Surgical_Risk" in all_flags and "surgical" not in ai_diagnosis.lower():
            logic_violations.append(
                "Skeletal Class III with surgical risk not flagged by AI."
            )

    return DiagnosisResult(
        classification=classification,
        flags=all_flags,
        hardware_suggestions=hw_suggestions,
        biological_breaches=bio_breaches,
        logic_violations=logic_violations,
    )


# ═══════════════════════════════════════════════════════════════════════
# Phase 2: OMMS (Orthodontic Model Maturity Score)
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class OMMSScore:
    """Orthodontic Model Maturity Score for a single run."""
    run_id: str = ""
    timestamp: float = 0.0

    # Component scores (0.0 - 100.0)
    s_geo: float = 0.0          # Geometric accuracy (d_min drift, mask IoU)
    s_clin: float = 0.0         # Clinical accuracy (diagnosis + hardware match %)
    b_crit: int = 0             # Biological breach count

    # Computed
    omms: float = 0.0           # Final OMMS score
    status: str = "RED"         # RED, YELLOW, GREEN

    # Sub-metrics
    mean_drift_mm: float = 0.0
    mask_iou: float = 0.0
    logic_match_pct: float = 0.0
    hardware_match_pct: float = 0.0
    class_accuracy: Dict[str, float] = field(default_factory=dict)

    # Deltas vs 7-day average
    omms_delta: float = 0.0
    drift_delta: float = 0.0
    logic_delta: float = 0.0

    # Purge stats
    clusters_purged: int = 0
    images_purged: int = 0
    purge_impact_geo: float = 0.0  # s_geo improvement from purge

    def to_dict(self) -> dict:
        return asdict(self)


PENALTY_PER_BREACH = 10.0  # OMMS penalty per biological breach


def calculate_omms(
    s_geo: float,
    s_clin: float,
    b_crit: int,
) -> Tuple[float, str]:
    """Calculate OMMS = (0.3 * S_geo) + (0.7 * S_clin) - (Penalty * B_crit).

    Returns (score, status).
    """
    omms = (0.3 * s_geo) + (0.7 * s_clin) - (PENALTY_PER_BREACH * b_crit)
    omms = max(0.0, min(100.0, omms))

    if b_crit > 0 or omms < 85:
        status = "RED"
    elif omms < 92:
        status = "YELLOW"
    else:
        status = "GREEN"

    return round(omms, 2), status


def compute_s_geo(mean_drift_mm: float, mask_iou: float) -> float:
    """Compute geometric score from drift and IoU.

    Target: drift <= 0.15mm, IoU >= 0.85
    """
    # Drift score: 100 at 0mm, 0 at 1mm
    drift_score = max(0.0, 100.0 - (mean_drift_mm / 1.0) * 100.0)
    # IoU score: direct percentage
    iou_score = mask_iou * 100.0
    return round((drift_score * 0.5 + iou_score * 0.5), 2)


def compute_s_clin(
    logic_match_pct: float,
    hardware_match_pct: float,
) -> float:
    """Compute clinical score from logic match and hardware accuracy."""
    return round((logic_match_pct * 0.6 + hardware_match_pct * 0.4), 2)


# ═══════════════════════════════════════════════════════════════════════
# Phase 3: Progression Tracking
# ═══════════════════════════════════════════════════════════════════════

class AuditHistory:
    """Tracks OMMS scores and run history for progression analysis."""

    HISTORY_FILE = "data/audit_history.json"
    MAX_RUNS = 100

    def __init__(self):
        self._runs: List[OMMSScore] = []
        self._load()

    def _load(self) -> None:
        path = Path(self.HISTORY_FILE)
        if path.exists():
            try:
                data = json.loads(path.read_text())
                for r in data.get("runs", []):
                    self._runs.append(OMMSScore(**{
                        k: v for k, v in r.items()
                        if k in OMMSScore.__dataclass_fields__
                    }))
            except Exception:
                pass

    def _save(self) -> None:
        path = Path(self.HISTORY_FILE)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(
            {"runs": [r.to_dict() for r in self._runs[-self.MAX_RUNS:]]},
            indent=2,
        ))

    def record_run(self, score: OMMSScore) -> None:
        """Record a new run and compute deltas."""
        avg_7d = self.rolling_average(7)
        if avg_7d:
            score.omms_delta = round(score.omms - avg_7d["omms"], 2)
            score.drift_delta = round(score.mean_drift_mm - avg_7d["mean_drift_mm"], 4)
            score.logic_delta = round(score.logic_match_pct - avg_7d["logic_match_pct"], 2)

        self._runs.append(score)
        self._save()

    def rolling_average(self, days: int = 7) -> Optional[dict]:
        """Compute rolling average over last N runs (proxy for days)."""
        if not self._runs:
            return None
        recent = self._runs[-days:]
        n = len(recent)
        return {
            "omms": round(sum(r.omms for r in recent) / n, 2),
            "s_geo": round(sum(r.s_geo for r in recent) / n, 2),
            "s_clin": round(sum(r.s_clin for r in recent) / n, 2),
            "mean_drift_mm": round(sum(r.mean_drift_mm for r in recent) / n, 4),
            "logic_match_pct": round(sum(r.logic_match_pct for r in recent) / n, 2),
            "hardware_match_pct": round(sum(r.hardware_match_pct for r in recent) / n, 2),
        }

    def consecutive_green(self) -> int:
        """Count consecutive GREEN runs from the most recent."""
        count = 0
        for r in reversed(self._runs):
            if r.status == "GREEN":
                count += 1
            else:
                break
        return count

    def get_progression(self) -> dict:
        """Full progression data for the dashboard."""
        avg_7d = self.rolling_average(7)
        latest = self._runs[-1] if self._runs else None
        green_streak = self.consecutive_green()

        # Production readiness
        if green_streak >= 3:
            readiness = "GREEN"
            readiness_label = "Ready for Level 3 Autopilot"
        elif latest and latest.status == "YELLOW":
            readiness = "YELLOW"
            readiness_label = "Needs targeted training on specific clusters"
        else:
            readiness = "RED"
            readiness_label = "Not production ready"

        # OMMS velocity (trend over last 5 runs)
        velocity = 0.0
        if len(self._runs) >= 2:
            recent_5 = self._runs[-5:]
            if len(recent_5) >= 2:
                velocity = round(
                    (recent_5[-1].omms - recent_5[0].omms) / len(recent_5), 2
                )

        # Top failure mode
        failure_mode = self._detect_top_failure()

        return {
            "total_runs": len(self._runs),
            "latest": latest.to_dict() if latest else None,
            "rolling_7d": avg_7d,
            "green_streak": green_streak,
            "production_readiness": readiness,
            "production_label": readiness_label,
            "omms_velocity": velocity,
            "omms_history": [
                {"run_id": r.run_id, "omms": r.omms, "status": r.status,
                 "timestamp": r.timestamp}
                for r in self._runs[-20:]
            ],
            "top_failure_mode": failure_mode,
            # Layer performance table
            "layer_performance": self._layer_performance(latest, avg_7d),
        }

    def _detect_top_failure(self) -> Optional[dict]:
        """Detect the most common failure pattern across recent runs."""
        if len(self._runs) < 3:
            return None

        recent = self._runs[-10:]
        # Check class accuracy trends
        class_acc: Dict[str, List[float]] = {}
        for r in recent:
            for cls, acc in r.class_accuracy.items():
                class_acc.setdefault(cls, []).append(acc)

        worst_class = None
        worst_acc = 100.0
        for cls, accs in class_acc.items():
            avg = sum(accs) / len(accs)
            if avg < worst_acc:
                worst_acc = avg
                worst_class = cls

        if worst_class and worst_acc < 85:
            return {
                "pattern": f"Low accuracy on {worst_class.replace('_', ' ')}",
                "accuracy": round(worst_acc, 1),
                "action": f"Trigger Recursive Purge on {worst_class} cluster",
                "affected_class": worst_class,
            }
        return None

    def _layer_performance(self, latest: Optional[OMMSScore],
                           avg_7d: Optional[dict]) -> List[dict]:
        """Build the layer performance table for the dashboard."""
        if not latest:
            return []

        layers = []

        # Anatomical layer
        iou_delta = 0.0
        if avg_7d:
            old_iou = compute_s_geo(avg_7d["mean_drift_mm"], 0.0)
            iou_delta = round(latest.s_geo - (avg_7d.get("s_geo", 0)), 2)
        layers.append({
            "layer": "Anatomical",
            "metric": "IoU Accuracy",
            "value": f"{latest.mask_iou * 100:.1f}%",
            "delta": f"{'+' if iou_delta >= 0 else ''}{iou_delta:.1f}%",
            "status": "improving" if iou_delta > 0 else "drift" if iou_delta < -1 else "stable",
        })

        # Diagnostic layer
        logic_delta = latest.logic_delta if latest.logic_delta else 0.0
        layers.append({
            "layer": "Diagnostic",
            "metric": "Logic Alignment",
            "value": f"{latest.logic_match_pct:.1f}%",
            "delta": f"{'+' if logic_delta >= 0 else ''}{logic_delta:.1f}%",
            "status": "improving" if logic_delta > 0 else "drift" if logic_delta < -1 else "stable",
        })

        # Safety layer
        layers.append({
            "layer": "Safety",
            "metric": "Biological Breaches",
            "value": str(latest.b_crit),
            "delta": "No Change" if latest.b_crit == 0 else f"+{latest.b_crit}",
            "status": "secure" if latest.b_crit == 0 else "breach",
        })

        # Hardware layer
        layers.append({
            "layer": "Hardware",
            "metric": "TAD Placement Logic",
            "value": f"{latest.hardware_match_pct:.0f}%",
            "delta": "",
            "status": "improving" if latest.hardware_match_pct >= 90 else "needs_work",
        })

        return layers


# Singleton
audit_history = AuditHistory()
