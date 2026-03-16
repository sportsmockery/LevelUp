"""Batch ID generation, metadata tracking, and path management.

Each auto-label run creates a versioned batch under:
  /content/drive/MyDrive/hs_models/datasets/teeth_detection/manifests/<batch_id>/

Locally (non-Colab) it falls back to:
  ./runs/auto_label/<batch_id>/
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional


# Google Drive path (Colab)
GDRIVE_BASE = Path("/content/drive/MyDrive/hs_models/datasets/teeth_detection/manifests")
# Local fallback
LOCAL_BASE = Path("runs/auto_label")


def _base_dir() -> Path:
    """Use Google Drive if mounted, otherwise local."""
    if GDRIVE_BASE.parent.parent.exists():
        return GDRIVE_BASE
    return LOCAL_BASE


def generate_batch_id(prefix: str = "rf_batch") -> str:
    """Generate a batch ID like rf_batch_2026_03_16_a."""
    date_str = datetime.now().strftime("%Y_%m_%d")
    base = _base_dir()
    # Find next suffix letter
    existing = sorted(base.glob(f"{prefix}_{date_str}_*")) if base.exists() else []
    suffix = chr(ord("a") + len(existing))
    return f"{prefix}_{date_str}_{suffix}"


class BatchManifest:
    """Manages all paths and metadata for a single auto-label batch."""

    def __init__(self, batch_id: Optional[str] = None, base_dir: Optional[Path] = None):
        self.batch_id = batch_id or generate_batch_id()
        self.base = (base_dir or _base_dir()) / self.batch_id
        self.base.mkdir(parents=True, exist_ok=True)

        # Standard output paths
        self.config_path = self.base / "config.json"
        self.raw_predictions_path = self.base / "raw_predictions.json"
        self.cleaned_predictions_path = self.base / "cleaned_predictions.json"
        self.flagged_path = self.base / "flagged_for_review.json"
        self.label_export_dir = self.base / "label_export"
        self.upload_manifest_path = self.base / "upload_manifest.json"
        self.upload_failures_path = self.base / "upload_failures.json"
        self.summary_path = self.base / "summary.json"

        self.label_export_dir.mkdir(parents=True, exist_ok=True)

    def save_config(self, config: dict) -> None:
        """Save the exact parameters used for this batch."""
        config["batch_id"] = self.batch_id
        config["created_at"] = datetime.now().isoformat()
        config["base_dir"] = str(self.base)
        self.config_path.write_text(json.dumps(config, indent=2))

    def save_json(self, path: Path, data) -> None:
        """Write JSON data to a path under this batch."""
        path.write_text(json.dumps(data, indent=2, default=str))

    def load_json(self, path: Path):
        """Load JSON data from a path."""
        if path.exists():
            return json.loads(path.read_text())
        return None

    def save_summary(self, stats: dict) -> None:
        """Save batch summary stats."""
        stats["batch_id"] = self.batch_id
        stats["completed_at"] = datetime.now().isoformat()
        self.save_json(self.summary_path, stats)

    def __repr__(self) -> str:
        return f"BatchManifest(id={self.batch_id}, path={self.base})"
