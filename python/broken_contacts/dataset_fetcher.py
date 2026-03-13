"""Automated Roboflow dataset fetcher for dental AI training.

Downloads and merges dental datasets from Roboflow Universe into the
pipeline's data directory. Designed to run automatically within the
scoring loop or on-demand.
"""

import json
import os
import shutil
from pathlib import Path
from typing import List, Optional

# Curated dental datasets on Roboflow Universe
# Each entry: (workspace, project, version, description)
DENTAL_DATASETS = [
    # Teeth detection & labeling
    ("dental-module", "teeth-labeling", 1, "Teeth bounding boxes — intraoral photos"),
    # Dentistry with tooth numbers, crowns, implants, root canals
    ("nanyang-technological-university-kdgtt", "dentistry-vibir", 1, "565 X-rays — tooth numbers, crowns, implants"),
    # Dental caries detection
    ("project-group13", "dental-caries-detection-using-dl", 5, "Dental caries detection"),
    # Dental X-ray panoramic
    ("celldetection-ok5sm", "dental-x-ray-panoramic-dataset", 1, "Panoramic X-ray — caries, bone loss, crowns"),
    # Dental images general
    ("thesis-0nhc1", "dental-images-hvaic", 1, "1000 dental images — general"),
    # DENTEX challenge
    ("dentex", "dentex-3xe7e", 1, "DENTEX challenge — dental enumeration"),
]

# Focus areas for dental contact system
FOCUS_KEYWORDS = [
    "teeth", "dental", "tooth", "caries", "crown",
    "implant", "orthodontic", "braces", "overbite",
    "contact", "restoration", "filling",
]

MANIFEST_FILE = "data/fetch_manifest.json"


def _load_manifest() -> dict:
    """Load record of previously downloaded datasets."""
    path = Path(MANIFEST_FILE)
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {"downloaded": []}


def _save_manifest(manifest: dict) -> None:
    Path(MANIFEST_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_FILE, "w") as f:
        json.dump(manifest, f, indent=2)


def fetch_dataset(
    workspace: str,
    project: str,
    version: int,
    output_dir: str = "data/roboflow",
    target_dir: str = "data/raw/train/images",
    api_key: Optional[str] = None,
) -> dict:
    """Download a single Roboflow dataset and merge images into target directory.

    Args:
        workspace: Roboflow workspace ID.
        project: Roboflow project ID.
        version: Dataset version number.
        output_dir: Where to download the raw dataset.
        target_dir: Where to copy images for the scoring loop.
        api_key: Roboflow API key (falls back to ROBOFLOW_API_KEY env var).

    Returns:
        Summary dict with counts.
    """
    from roboflow import Roboflow

    key = api_key or os.environ.get("ROBOFLOW_API_KEY")
    if not key:
        raise ValueError(
            "No Roboflow API key. Set ROBOFLOW_API_KEY in .env.local "
            "or pass api_key parameter."
        )

    dataset_id = f"{workspace}/{project}/v{version}"
    download_path = Path(output_dir) / f"{project}_v{version}"

    print(f"Downloading: {dataset_id}")
    rf = Roboflow(api_key=key)
    proj = rf.workspace(workspace).project(project)
    ver = proj.version(version)
    ver.download("yolov8", location=str(download_path))

    # Merge all images into target directory
    target = Path(target_dir)
    target.mkdir(parents=True, exist_ok=True)

    copied = 0
    for split in ["train", "valid", "test"]:
        img_dir = download_path / split / "images"
        if not img_dir.is_dir():
            continue
        for img_file in img_dir.iterdir():
            if img_file.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
                dest = target / f"{project}_{img_file.name}"
                if not dest.exists():
                    shutil.copy2(str(img_file), str(dest))
                    copied += 1

    # Also copy labels if available
    labels_target = Path(target_dir).parent / "labels"
    labels_target.mkdir(parents=True, exist_ok=True)
    for split in ["train", "valid", "test"]:
        lbl_dir = download_path / split / "labels"
        if not lbl_dir.is_dir():
            continue
        for lbl_file in lbl_dir.iterdir():
            if lbl_file.suffix == ".txt":
                dest = labels_target / f"{project}_{lbl_file.name}"
                if not dest.exists():
                    shutil.copy2(str(lbl_file), str(dest))

    return {
        "dataset_id": dataset_id,
        "download_path": str(download_path),
        "images_copied": copied,
        "target_dir": str(target),
    }


def fetch_all_datasets(
    api_key: Optional[str] = None,
    target_dir: str = "data/raw/train/images",
    skip_downloaded: bool = True,
) -> List[dict]:
    """Download all curated dental datasets, skipping previously downloaded ones.

    Args:
        api_key: Roboflow API key.
        target_dir: Where to merge images.
        skip_downloaded: Skip datasets already in the manifest.

    Returns:
        List of per-dataset summary dicts.
    """
    manifest = _load_manifest()
    downloaded_ids = set(manifest["downloaded"]) if skip_downloaded else set()

    results = []
    for workspace, project, version, desc in DENTAL_DATASETS:
        dataset_id = f"{workspace}/{project}/v{version}"
        if dataset_id in downloaded_ids:
            print(f"Skipping (already downloaded): {desc}")
            continue

        try:
            result = fetch_dataset(
                workspace=workspace,
                project=project,
                version=version,
                target_dir=target_dir,
                api_key=api_key,
            )
            result["description"] = desc
            results.append(result)

            manifest["downloaded"].append(dataset_id)
            _save_manifest(manifest)

            print(f"  -> {result['images_copied']} images copied")

        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({"dataset_id": dataset_id, "error": str(e)})

    total = sum(r.get("images_copied", 0) for r in results)
    print(f"\nTotal new images: {total}")
    return results


def search_and_fetch(
    query: str = "dental teeth",
    max_results: int = 5,
    api_key: Optional[str] = None,
    target_dir: str = "data/raw/train/images",
) -> List[dict]:
    """Search Roboflow Universe for dental datasets and download matches.

    Args:
        query: Search query.
        max_results: Maximum datasets to download.
        api_key: Roboflow API key.
        target_dir: Where to merge images.

    Returns:
        List of per-dataset summary dicts.
    """
    from roboflow import Roboflow

    key = api_key or os.environ.get("ROBOFLOW_API_KEY")
    if not key:
        raise ValueError("No Roboflow API key")

    rf = Roboflow(api_key=key)

    # Note: Roboflow search API is limited; we fall back to curated list
    print(f"Fetching curated dental datasets (query context: '{query}')")
    return fetch_all_datasets(api_key=key, target_dir=target_dir)
