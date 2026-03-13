"""Train Trigger — monitors label counts and invokes YOLO fine-tuning.

Watches the Platinum/Gold label directories. When the accumulated count
crosses the retrain threshold, triggers a short fine-tuning run on the
YOLO model to absorb the SAM2-refined geometry.
"""

import json
import time
from pathlib import Path
from typing import Optional

from ultralytics import YOLO


LABEL_COUNT_FILE = "runs/label_counts.json"


def count_labels(label_dir: str) -> int:
    """Count .txt label files in a directory."""
    d = Path(label_dir)
    if not d.is_dir():
        return 0
    return sum(1 for f in d.glob("*.txt"))


def auto_retrain(
    current_model: str,
    data_yaml: str = "config/data.yaml",
    epochs: int = 10,
    batch: int = 8,
    imgsz: int = 640,
    lr: float = 0.0005,
    name: Optional[str] = None,
    patience: int = 5,
) -> Optional[str]:
    """Trigger a YOLO fine-tuning run.

    Args:
        current_model: Path to current best YOLO model.
        data_yaml: Dataset configuration.
        epochs: Number of fine-tuning epochs (short burst).
        batch: Batch size.
        imgsz: Image size.
        lr: Learning rate (lower for fine-tuning).
        name: Run name.
        patience: Early stopping patience.

    Returns:
        Path to new best model, or None if training failed.
    """
    if name is None:
        name = f"auto_retrain_{int(time.time())}"

    model_path = Path(current_model)
    if not model_path.exists():
        print(f"Model not found: {current_model}")
        return None

    yaml_path = Path(data_yaml)
    if not yaml_path.exists():
        print(f"Data YAML not found: {data_yaml}")
        return None

    print(f"\n{'='*60}")
    print(f"AUTO-RETRAIN TRIGGERED")
    print(f"  Model: {current_model}")
    print(f"  Data: {data_yaml}")
    print(f"  Epochs: {epochs}")
    print(f"  Name: {name}")
    print(f"{'='*60}\n")

    try:
        model = YOLO(current_model)
        model.train(
            data=data_yaml,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            lr0=lr,
            name=name,
            patience=patience,
            augment=True,
            save=True,
            val=True,
            verbose=True,
        )

        best_path = Path("runs/detect") / name / "weights" / "best.pt"
        if best_path.exists():
            print(f"\nRetrain complete. New model: {best_path}")

            # Log the retrain event
            _log_retrain(name, current_model, str(best_path), epochs)

            return str(best_path)
        else:
            print("Retrain completed but no best.pt found")
            return None

    except Exception as e:
        print(f"Retrain failed: {e}")
        return None


def monitor_and_retrain(
    label_dirs: list[str],
    threshold: int = 100,
    current_model: str = "yolov12s_010826.pt",
    data_yaml: str = "config/data.yaml",
    check_interval: int = 60,
    max_retrains: int = 10,
) -> None:
    """Continuously monitor label directories and trigger retraining.

    Args:
        label_dirs: Directories to monitor for new .txt labels.
        threshold: Number of new labels before retraining.
        current_model: Current YOLO model path.
        data_yaml: Dataset config.
        check_interval: Seconds between checks.
        max_retrains: Maximum number of retrain cycles.
    """
    prev_counts = {d: count_labels(d) for d in label_dirs}
    retrain_count = 0

    print(f"Monitoring {len(label_dirs)} directories for new labels...")
    print(f"  Threshold: {threshold} new labels")
    print(f"  Check interval: {check_interval}s")

    while retrain_count < max_retrains:
        time.sleep(check_interval)

        total_new = 0
        for d in label_dirs:
            current = count_labels(d)
            prev = prev_counts.get(d, 0)
            new = max(0, current - prev)
            total_new += new
            if new > 0:
                print(f"  {d}: +{new} labels ({current} total)")

        if total_new >= threshold:
            print(f"\nThreshold reached: {total_new} new labels")
            retrain_count += 1

            new_model = auto_retrain(
                current_model=current_model,
                data_yaml=data_yaml,
                name=f"auto_retrain_{retrain_count}",
            )

            if new_model:
                current_model = new_model

            # Reset counts
            prev_counts = {d: count_labels(d) for d in label_dirs}

    print(f"Reached max retrains ({max_retrains}). Stopping monitor.")


def _log_retrain(name: str, old_model: str, new_model: str, epochs: int) -> None:
    """Log retrain events to disk."""
    log_path = Path("runs/retrain_log.json")
    log_path.parent.mkdir(parents=True, exist_ok=True)

    logs = []
    if log_path.exists():
        try:
            with open(log_path) as f:
                logs = json.load(f)
        except Exception:
            pass

    logs.append({
        "name": name,
        "old_model": old_model,
        "new_model": new_model,
        "epochs": epochs,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    })

    with open(log_path, "w") as f:
        json.dump(logs, f, indent=2)


def get_retrain_history() -> list:
    """Load retrain event history."""
    log_path = Path("runs/retrain_log.json")
    if not log_path.exists():
        return []
    with open(log_path) as f:
        return json.load(f)
