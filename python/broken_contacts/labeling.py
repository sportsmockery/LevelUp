"""Comprehensive orthodontic scan labeling system.

Implements the multi-axis labeling schema from the deep research report:
  - Patient context (age, sex, dentition stage, special populations)
  - Encounter context (type, reason, planned procedures)
  - Acquisition details (modality, intent, coverage, device, files)
  - Clinical findings (occlusion, Angle class, overjet, crossbite)
  - Hardware present (brackets, archwires, TADs, aligners, retainers, etc.)
  - Treatment intent (phase, therapy type, planned devices)
  - Quality assessment (grade, flags, completeness, recommended action)
  - Annotations (labels, geometry, confidence)
  - Audit trail (labeler, clinician, review status)
  - Privacy/de-identification tracking

Also retains the original adjudication queue for the /hs/label workflow.
"""

import json
import time
import uuid
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Any, Dict, List, Optional


SCHEMA_VERSION = "v1.0.0"

# ═══════════════════════════════════════════════════════════════════════
# Enumerations — mirrors the JSON Schema enum values
# ═══════════════════════════════════════════════════════════════════════

ENCOUNTER_TYPES = [
    "initial_consult", "diagnostic_records_full", "appliance_delivery_fitting",
    "progress_assessment", "pre_op_planning", "post_op_followup",
    "emergency_problem_visit", "retention_check", "growth_monitoring",
    "interdisciplinary_coordination", "transfer_of_care", "legal_documentation",
]

MODALITIES = [
    "intraoral_scan", "digital_impression_from_conventional", "cbct",
    "panoramic_radiograph", "lateral_cephalogram", "facial_scan_3d",
    "occlusal_analysis_digital", "intraoral_photography", "extraoral_photography",
]

INTENTS = [
    "diagnosis_and_treatment_planning", "appliance_design_manufacture",
    "appliance_fit_verification", "surgical_planning", "implant_site_assessment",
    "progress_quantification", "emergency_triage_and_repair",
    "occlusal_adjustment_documentation", "interdisciplinary_restorative_coordination",
]

ANATOMIC_COVERAGES = [
    "maxillary_arch", "mandibular_arch", "full_arch_both", "segmental_region",
    "occlusion_bite_registration", "gingiva_soft_tissue", "edentulous_span",
    "full_edentulous_arch", "craniofacial_skeleton", "airway_region",
    "cleft_defect_region",
]

SPECIAL_CONTEXTS = [
    "pediatric_patient", "craniofacial_anomaly", "cleft_lip_palate",
    "orthognathic_case", "limited_opening", "sedation_or_anxiolysis",
    "gag_reflex", "partially_edentulous", "fully_edentulous",
    "restorations_present", "active_fixed_appliances_present",
]

DEVICE_CATEGORIES = [
    "bracket", "band", "buccal_tube", "archwire", "ligature", "elastic",
    "tad_miniscrew", "palatal_expander", "rpe", "sarpe_related", "nance",
    "space_maintainer", "removable_appliance", "clear_aligner", "attachment",
    "button", "bonded_retainer", "fixed_retainer", "lingual_appliance",
    "surgical_plate", "surgical_screw", "implant_fixture", "implant_abutment",
    "crown", "bridge", "scan_body", "impression_tray", "other",
]

DEVICE_STATES = ["intact", "loose", "debonded", "broken", "missing", "unknown"]

QUALITY_GRADES = ["diagnostic", "suboptimal_but_usable", "non_diagnostic", "unknown"]

QUALITY_FLAGS = [
    "motion_blur", "metal_artifact_streaking", "beam_hardening_scatter",
    "field_of_view_truncation", "incomplete_scan_missing_regions",
    "stitching_error_or_warp", "occlusion_mismatch", "soft_tissue_insufficient",
    "calibration_due_or_failed", "radiographic_artifact_other",
    "dicom_metadata_phi_present",
]

RECOMMENDED_ACTIONS = [
    "no_action", "re_scan_partial", "re_scan_full",
    "repeat_cbct_if_justified", "manual_review_only",
]

TREATMENT_PHASES = [
    "pre_treatment", "active_treatment", "finishing",
    "retention", "relapse_management", "unknown",
]

THERAPY_TYPES = [
    "fixed_appliances", "clear_aligners", "removable_appliance",
    "orthopedic_growth_modification", "tad_supported_mechanics",
    "surgical_orthodontics", "implant_coordination", "restorative_coordination",
]

REVIEW_STATUSES = ["draft", "peer_reviewed", "adjudicated", "released"]

CODING_SYSTEMS = ["ICD-10", "ICD-10-CM", "SNOMED-CT", "INTERNAL"]

FILE_FORMATS = ["DICOM", "STL", "PLY", "OBJ", "PDF", "JPEG", "PNG", "CSV", "OTHER"]

GEOMETRY_TYPES = [
    "mesh_triangles", "mesh_vertices", "voxel_mask",
    "bbox_2d", "landmarks", "curve_polyline",
]


# ═══════════════════════════════════════════════════════════════════════
# Data classes
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class Code:
    system: str     # ICD-10, ICD-10-CM, SNOMED-CT, INTERNAL
    code: str
    display: str

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Code":
        return cls(system=d.get("system", "INTERNAL"),
                   code=d.get("code", ""),
                   display=d.get("display", ""))


@dataclass
class Patient:
    patient_pseudonym: str = ""
    age_at_scan_years: float = 0.0
    sex: str = "unknown"                    # female, male, intersex, unknown, not_recorded
    dentition_stage: str = "unknown"        # primary, mixed, permanent, transitional, edentulous, unknown
    special_context: List[str] = field(default_factory=list)
    coding: List[Code] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "patient_pseudonym": self.patient_pseudonym,
            "age_at_scan_years": self.age_at_scan_years,
            "sex": self.sex,
            "dentition_stage": self.dentition_stage,
            "special_context": self.special_context,
            "coding": [c.to_dict() for c in self.coding],
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Patient":
        return cls(
            patient_pseudonym=d.get("patient_pseudonym", ""),
            age_at_scan_years=d.get("age_at_scan_years", 0.0),
            sex=d.get("sex", "unknown"),
            dentition_stage=d.get("dentition_stage", "unknown"),
            special_context=d.get("special_context", []),
            coding=[Code.from_dict(c) for c in d.get("coding", [])],
        )


@dataclass
class Encounter:
    type: str = "progress_assessment"
    timestamp_start: str = ""
    timestamp_end: Optional[str] = None
    clinical_reason: str = ""
    planned_procedures: List[Code] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = {
            "type": self.type,
            "timestamp_start": self.timestamp_start,
            "clinical_reason": self.clinical_reason,
        }
        if self.timestamp_end:
            d["timestamp_end"] = self.timestamp_end
        if self.planned_procedures:
            d["planned_procedures"] = [c.to_dict() for c in self.planned_procedures]
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Encounter":
        return cls(
            type=d.get("type", "progress_assessment"),
            timestamp_start=d.get("timestamp_start", ""),
            timestamp_end=d.get("timestamp_end"),
            clinical_reason=d.get("clinical_reason", ""),
            planned_procedures=[Code.from_dict(c) for c in d.get("planned_procedures", [])],
        )


@dataclass
class DeviceInfo:
    manufacturer: str = ""
    model: str = ""
    software_version: Optional[str] = None
    serial_or_asset_tag: str = ""

    def to_dict(self) -> dict:
        d = {"manufacturer": self.manufacturer, "model": self.model,
             "serial_or_asset_tag": self.serial_or_asset_tag}
        if self.software_version:
            d["software_version"] = self.software_version
        return d


@dataclass
class FileInfo:
    format: str = "JPEG"            # DICOM, STL, PLY, OBJ, PDF, JPEG, PNG, CSV, OTHER
    uris: List[str] = field(default_factory=list)
    dicom_uids: Optional[Dict[str, Any]] = None

    def to_dict(self) -> dict:
        d: dict = {"format": self.format, "uris": self.uris}
        if self.dicom_uids:
            d["dicom_uids"] = self.dicom_uids
        return d


@dataclass
class Acquisition:
    acquisition_id: str = ""
    modality: str = "intraoral_photography"
    intent: List[str] = field(default_factory=lambda: ["diagnosis_and_treatment_planning"])
    anatomic_coverage: List[str] = field(default_factory=lambda: ["full_arch_both"])
    device: DeviceInfo = field(default_factory=DeviceInfo)
    settings: Optional[Dict[str, Any]] = None
    files: FileInfo = field(default_factory=FileInfo)

    def to_dict(self) -> dict:
        d = {
            "acquisition_id": self.acquisition_id,
            "modality": self.modality,
            "intent": self.intent,
            "anatomic_coverage": self.anatomic_coverage,
            "device": self.device.to_dict(),
            "files": self.files.to_dict(),
        }
        if self.settings:
            d["settings"] = self.settings
        return d


@dataclass
class Occlusion:
    angle_class: str = "unknown"        # class_I, class_II, class_III, unknown
    overjet_mm: Optional[float] = None
    overbite_percent: Optional[float] = None
    open_bite: bool = False
    crossbite: bool = False
    midline_deviation_mm: Optional[float] = None

    def to_dict(self) -> dict:
        d: dict = {"angle_class": self.angle_class, "open_bite": self.open_bite,
                    "crossbite": self.crossbite}
        if self.overjet_mm is not None:
            d["overjet_mm"] = self.overjet_mm
        if self.overbite_percent is not None:
            d["overbite_percent"] = self.overbite_percent
        if self.midline_deviation_mm is not None:
            d["midline_deviation_mm"] = self.midline_deviation_mm
        return d


@dataclass
class ClinicalFindings:
    occlusion: Occlusion = field(default_factory=Occlusion)
    dentition_notes: str = ""
    coded_findings: List[Code] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "occlusion": self.occlusion.to_dict(),
            "dentition_notes": self.dentition_notes,
            "coded_findings": [c.to_dict() for c in self.coded_findings],
        }


@dataclass
class HardwareLocation:
    arch: str = "unknown"               # maxillary, mandibular, both, unknown
    tooth_system: str = "FDI"           # FDI, Universal, Palmer, none, unknown
    tooth_id: str = ""
    region: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class HardwareItem:
    device_category: str                # from DEVICE_CATEGORIES
    state: str = "intact"               # from DEVICE_STATES
    device_subtype: str = ""
    location: HardwareLocation = field(default_factory=HardwareLocation)
    coding: List[Code] = field(default_factory=list)
    affects_quality: bool = False
    notes: str = ""

    def to_dict(self) -> dict:
        d = {
            "device_category": self.device_category,
            "state": self.state,
            "location": self.location.to_dict(),
            "affects_quality": self.affects_quality,
        }
        if self.device_subtype:
            d["device_subtype"] = self.device_subtype
        if self.coding:
            d["coding"] = [c.to_dict() for c in self.coding]
        if self.notes:
            d["notes"] = self.notes
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "HardwareItem":
        loc = d.get("location", {})
        return cls(
            device_category=d.get("device_category", "other"),
            state=d.get("state", "unknown"),
            device_subtype=d.get("device_subtype", ""),
            location=HardwareLocation(
                arch=loc.get("arch", "unknown"),
                tooth_system=loc.get("tooth_system", "unknown"),
                tooth_id=loc.get("tooth_id", ""),
                region=loc.get("region", ""),
            ),
            coding=[Code.from_dict(c) for c in d.get("coding", [])],
            affects_quality=d.get("affects_quality", False),
            notes=d.get("notes", ""),
        )


@dataclass
class TreatmentIntent:
    treatment_phase: str = "unknown"    # from TREATMENT_PHASES
    therapy_type: List[str] = field(default_factory=list)  # from THERAPY_TYPES
    planned_devices: List[HardwareItem] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "treatment_phase": self.treatment_phase,
            "therapy_type": self.therapy_type,
            "planned_devices": [d.to_dict() for d in self.planned_devices],
        }


@dataclass
class Quality:
    overall_grade: str = "unknown"      # from QUALITY_GRADES
    flags: List[str] = field(default_factory=list)  # from QUALITY_FLAGS
    completeness_score_0_1: float = 0.0
    recommended_action: str = "no_action"  # from RECOMMENDED_ACTIONS
    qa_notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class AnnotationGeometry:
    type: str = "bbox_2d"               # from GEOMETRY_TYPES
    data_ref: Optional[str] = None
    points: Optional[List[List[float]]] = None

    def to_dict(self) -> dict:
        d: dict = {"type": self.type}
        if self.data_ref:
            d["data_ref"] = self.data_ref
        if self.points:
            d["points"] = self.points
        return d


@dataclass
class Annotation:
    label: str
    target_acquisition_id: str
    geometry: AnnotationGeometry
    confidence_0_1: float = 0.0
    label_code: Optional[Code] = None
    annotator_notes: str = ""

    def to_dict(self) -> dict:
        d = {
            "label": self.label,
            "target_acquisition_id": self.target_acquisition_id,
            "geometry": self.geometry.to_dict(),
            "confidence_0_1": self.confidence_0_1,
        }
        if self.label_code:
            d["label_code"] = self.label_code.to_dict()
        if self.annotator_notes:
            d["annotator_notes"] = self.annotator_notes
        return d


@dataclass
class Audit:
    labeled_at: str = ""
    labeler_id: str = ""
    clinician_id: str = ""
    site_id: str = ""
    review_status: str = "draft"        # from REVIEW_STATUSES

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Privacy:
    phi_present: bool = False
    consent_status: str = "unknown"     # not_applicable, unknown, consented, declined, restricted_use
    data_use: str = "clinical_only"     # clinical_only, research_internal, research_external, teaching, vendor_support
    deidentification_method: str = "unknown"  # hipaa_safe_harbor, hipaa_expert_determination, unknown, not_deidentified
    dicom_profile_applied: str = "none"
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            "phi_present": self.phi_present,
            "consent_status": self.consent_status,
            "data_use": self.data_use,
            "deidentification": {
                "method": self.deidentification_method,
                "dicom_profile_applied": self.dicom_profile_applied,
                "notes": self.notes,
            },
        }


# ═══════════════════════════════════════════════════════════════════════
# Top-level scan label record
# ═══════════════════════════════════════════════════════════════════════

@dataclass
class OrthoScanLabel:
    """Complete orthodontic scan label following the comprehensive schema."""
    schema_version: str = SCHEMA_VERSION
    record_id: str = field(default_factory=lambda: f"rec-{uuid.uuid4().hex[:12]}")

    patient: Patient = field(default_factory=Patient)
    encounter: Encounter = field(default_factory=Encounter)
    acquisitions: List[Acquisition] = field(default_factory=list)
    clinical_findings: ClinicalFindings = field(default_factory=ClinicalFindings)
    hardware_present: List[HardwareItem] = field(default_factory=list)
    treatment_intent: TreatmentIntent = field(default_factory=TreatmentIntent)
    quality: Quality = field(default_factory=Quality)
    annotations: List[Annotation] = field(default_factory=list)
    audit: Audit = field(default_factory=Audit)
    privacy: Privacy = field(default_factory=Privacy)

    def to_dict(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "record_id": self.record_id,
            "patient": self.patient.to_dict(),
            "encounter": self.encounter.to_dict(),
            "acquisitions": [a.to_dict() for a in self.acquisitions],
            "clinical_findings": self.clinical_findings.to_dict(),
            "hardware_present": [h.to_dict() for h in self.hardware_present],
            "treatment_intent": self.treatment_intent.to_dict(),
            "quality": self.quality.to_dict(),
            "annotations": [a.to_dict() for a in self.annotations],
            "audit": self.audit.to_dict(),
            "privacy": self.privacy.to_dict(),
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, d: dict) -> "OrthoScanLabel":
        hw = [HardwareItem.from_dict(h) for h in d.get("hardware_present", [])]

        enc_data = d.get("encounter", {})
        encounter = Encounter.from_dict(enc_data)

        patient = Patient.from_dict(d.get("patient", {}))

        cf_data = d.get("clinical_findings", {})
        occ = cf_data.get("occlusion", {})
        clinical_findings = ClinicalFindings(
            occlusion=Occlusion(
                angle_class=occ.get("angle_class", "unknown"),
                overjet_mm=occ.get("overjet_mm"),
                overbite_percent=occ.get("overbite_percent"),
                open_bite=occ.get("open_bite", False),
                crossbite=occ.get("crossbite", False),
                midline_deviation_mm=occ.get("midline_deviation_mm"),
            ),
            dentition_notes=cf_data.get("dentition_notes", ""),
            coded_findings=[Code.from_dict(c) for c in cf_data.get("coded_findings", [])],
        )

        q_data = d.get("quality", {})
        quality = Quality(
            overall_grade=q_data.get("overall_grade", "unknown"),
            flags=q_data.get("flags", []),
            completeness_score_0_1=q_data.get("completeness_score_0_1", 0.0),
            recommended_action=q_data.get("recommended_action", "no_action"),
            qa_notes=q_data.get("qa_notes", ""),
        )

        ti_data = d.get("treatment_intent", {})
        treatment_intent = TreatmentIntent(
            treatment_phase=ti_data.get("treatment_phase", "unknown"),
            therapy_type=ti_data.get("therapy_type", []),
            planned_devices=[HardwareItem.from_dict(pd) for pd in ti_data.get("planned_devices", [])],
        )

        a_data = d.get("audit", {})
        audit = Audit(
            labeled_at=a_data.get("labeled_at", ""),
            labeler_id=a_data.get("labeler_id", ""),
            clinician_id=a_data.get("clinician_id", ""),
            site_id=a_data.get("site_id", ""),
            review_status=a_data.get("review_status", "draft"),
        )

        p_data = d.get("privacy", {})
        dei = p_data.get("deidentification", {})
        privacy = Privacy(
            phi_present=p_data.get("phi_present", False),
            consent_status=p_data.get("consent_status", "unknown"),
            data_use=p_data.get("data_use", "clinical_only"),
            deidentification_method=dei.get("method", "unknown"),
            dicom_profile_applied=dei.get("dicom_profile_applied", "none"),
            notes=dei.get("notes", ""),
        )

        return cls(
            schema_version=d.get("schema_version", SCHEMA_VERSION),
            record_id=d.get("record_id", ""),
            patient=patient,
            encounter=encounter,
            clinical_findings=clinical_findings,
            hardware_present=hw,
            treatment_intent=treatment_intent,
            quality=quality,
            audit=audit,
            privacy=privacy,
        )


# ═══════════════════════════════════════════════════════════════════════
# Labeling Queue (persisted to disk)
# ═══════════════════════════════════════════════════════════════════════

class LabelingQueue:
    """Manages scan labels awaiting expert adjudication."""

    def __init__(self, persist_dir: Optional[str] = None):
        self._records: Dict[str, OrthoScanLabel] = {}
        self._persist_dir = Path(persist_dir) if persist_dir else None
        if self._persist_dir:
            self._persist_dir.mkdir(parents=True, exist_ok=True)
            self._load_persisted()

    def _load_persisted(self) -> None:
        if not self._persist_dir:
            return
        for fp in self._persist_dir.glob("*.json"):
            try:
                data = json.loads(fp.read_text())
                rec = OrthoScanLabel.from_dict(data)
                self._records[rec.record_id] = rec
            except Exception:
                continue

    def _persist(self, record: OrthoScanLabel) -> None:
        if not self._persist_dir:
            return
        fp = self._persist_dir / f"{record.record_id}.json"
        fp.write_text(json.dumps(record.to_dict(), indent=2))

    def add(self, record: OrthoScanLabel) -> str:
        self._records[record.record_id] = record
        self._persist(record)
        return record.record_id

    def get(self, record_id: str) -> Optional[OrthoScanLabel]:
        return self._records.get(record_id)

    def update_review(self, record_id: str, status: str, clinician_id: str = "") -> Optional[OrthoScanLabel]:
        rec = self._records.get(record_id)
        if not rec:
            return None
        rec.audit.review_status = status
        if clinician_id:
            rec.audit.clinician_id = clinician_id
        rec.audit.labeled_at = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        self._persist(rec)
        return rec

    def pending(self) -> List[OrthoScanLabel]:
        return [r for r in self._records.values() if r.audit.review_status == "draft"]

    def all_records(self) -> List[OrthoScanLabel]:
        return list(self._records.values())

    def stats(self) -> dict:
        records = self.all_records()
        statuses: Dict[str, int] = {}
        hw_counts: Dict[str, int] = {}
        for r in records:
            statuses[r.audit.review_status] = statuses.get(r.audit.review_status, 0) + 1
            for h in r.hardware_present:
                hw_counts[h.device_category] = hw_counts.get(h.device_category, 0) + 1
        return {
            "total": len(records),
            "review_statuses": statuses,
            "hardware_counts": hw_counts,
            "avg_quality": (
                sum(r.quality.completeness_score_0_1 for r in records) / len(records)
                if records else 0.0
            ),
        }


# Singleton queue instance
labeling_queue = LabelingQueue(persist_dir="data/labeling_queue")
