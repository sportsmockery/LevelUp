"""Auto-label real dental images using the base YOLO model.

Runs YOLO detection on real patient images and saves the detections
as YOLO-format label files. These can then be used to fine-tune
the model on real data instead of only synthetic data.

Usage from Colab:
    from broken_contacts.auto_label_real import auto_label_and_train
    result = auto_label_and_train()
"""

import os
import shutil
from pathlib import Path
from typing import Optional


def auto_label_images(
    image_dir: str = "data/raw/train/images",
    output_dir: str = "data/real_labeled",
    yolo_model_path: str = "yolov12s_010826.pt",
    confidence: float = 0.35,
    max_images: int = 0,
) -> dict:
    """Run YOLO on real images and save labels in YOLO format.

    Args:
        image_dir: Directory containing real dental images.
        output_dir: Where to save the labeled dataset.
        yolo_model_path: Path to base YOLO model.
        confidence: Detection confidence threshold.
        max_images: Max images to process (0 = all).

    Returns:
        Summary dict with counts.
    """
    from ultralytics import YOLO

    base_dir = Path(__file__).parent.parent.resolve()
    img_dir = base_dir / image_dir
    out_dir = base_dir / output_dir

    # Create output structure
    train_img = out_dir / "train" / "images"
    train_lbl = out_dir / "train" / "labels"
    val_img = out_dir / "val" / "images"
    val_lbl = out_dir / "val" / "labels"
    for d in [train_img, train_lbl, val_img, val_lbl]:
        d.mkdir(parents=True, exist_ok=True)

    # Load model
    model_path = base_dir / yolo_model_path
    if not model_path.exists():
        raise FileNotFoundError(f"YOLO model not found: {model_path}")
    model = YOLO(str(model_path))

    # Get class names from model
    class_names = model.names
    print(f"Model classes: {class_names}")

    # Find all images
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    all_images = sorted([
        f for f in img_dir.rglob("*")
        if f.suffix.lower() in exts
    ])

    if max_images > 0:
        all_images = all_images[:max_images]

    print(f"Processing {len(all_images)} images...")

    # 80/20 train/val split
    split_idx = int(len(all_images) * 0.8)
    total_detections = 0
    labeled_count = 0

    for i, img_path in enumerate(all_images):
        is_train = i < split_idx
        dst_img = (train_img if is_train else val_img) / img_path.name
        dst_lbl = (train_lbl if is_train else val_lbl) / f"{img_path.stem}.txt"

        # Run detection
        results = model.predict(source=str(img_path), conf=confidence, verbose=False)
        result = results[0]

        if len(result.boxes) == 0:
            continue

        # Copy image
        shutil.copy2(str(img_path), str(dst_img))

        # Write YOLO labels
        h, w = result.orig_shape
        lines = []
        for box, cls in zip(result.boxes.xyxy.cpu().numpy(), result.boxes.cls.cpu().numpy()):
            x1, y1, x2, y2 = box
            cx = ((x1 + x2) / 2) / w
            cy = ((y1 + y2) / 2) / h
            bw = (x2 - x1) / w
            bh = (y2 - y1) / h
            lines.append(f"{int(cls)} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")
            total_detections += 1

        dst_lbl.write_text("\n".join(lines) + "\n")
        labeled_count += 1

        if (i + 1) % 100 == 0:
            print(f"  {i + 1}/{len(all_images)} — {total_detections} detections")

    # Write data.yaml
    yaml_content = f"""# Real Dental Dataset — Auto-Labeled
path: {out_dir}
train: train/images
val: val/images

nc: {len(class_names)}
names:
"""
    for idx, name in class_names.items():
        yaml_content += f"  {idx}: {name}\n"

    (out_dir / "data.yaml").write_text(yaml_content)

    summary = {
        "total_images": len(all_images),
        "labeled_images": labeled_count,
        "total_detections": total_detections,
        "train_images": min(split_idx, labeled_count),
        "val_images": max(0, labeled_count - split_idx),
        "data_yaml": str(out_dir / "data.yaml"),
        "class_names": class_names,
    }

    print(f"\nAuto-labeled {labeled_count}/{len(all_images)} images")
    print(f"  Total detections: {total_detections}")
    print(f"  data.yaml: {out_dir / 'data.yaml'}")

    return summary


def auto_label_and_train(
    image_dir: str = "data/raw/train/images",
    confidence: float = 0.35,
    epochs: int = 60,
    batch_size: int = 16,
    max_images: int = 0,
) -> dict:
    """Auto-label real images then train YOLO on them.

    Full pipeline:
    1. Run base YOLO on real images to generate labels
    2. Fine-tune YOLO on the auto-labeled real data
    3. Save the improved model

    This produces a model that understands real dental anatomy
    instead of only synthetic images.
    """
    import time
    from broken_contacts.auto_train import save_to_drive

    base_dir = Path(__file__).parent.parent.resolve()
    os.chdir(str(base_dir))

    print("=" * 60)
    print("PHASE 1: Auto-labeling real images")
    print("=" * 60)

    label_result = auto_label_images(
        image_dir=image_dir,
        confidence=confidence,
        max_images=max_images,
    )

    if label_result["labeled_images"] < 10:
        return {"error": f"Too few labeled images ({label_result['labeled_images']}). Need at least 10."}

    print("\n" + "=" * 60)
    print("PHASE 2: Training YOLO on real data")
    print("=" * 60)

    from ultralytics import YOLO

    model = YOLO(str(base_dir / "yolov12s_010826.pt"))

    start = time.time()
    model.train(
        data=label_result["data_yaml"],
        epochs=epochs,
        imgsz=640,
        batch=batch_size,
        name="contacts_detector_real_v1",
        patience=15,
        lr0=0.0003,
        augment=True,
        save=True,
        val=True,
        verbose=True,
        project=str(base_dir / "runs" / "detect"),
        exist_ok=True,
    )
    duration = time.time() - start

    # Find the trained model
    det_project = base_dir / "runs" / "detect"
    best = det_project / "contacts_detector_real_v1" / "weights" / "best.pt"
    if not best.exists():
        candidates = list(det_project.glob("contacts_detector_real_v1*/weights/best.pt"))
        if candidates:
            best = candidates[-1]

    if not best.exists():
        return {"error": "Training completed but best.pt not found"}

    # Copy to the standard detector location
    standard_path = det_project / "contacts_detector_v1" / "weights" / "best.pt"
    standard_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(str(best), str(standard_path))

    print(f"\nTraining complete in {duration:.0f}s")
    print(f"Model saved: {standard_path}")

    # Validate
    val_model = YOLO(str(best))
    metrics = val_model.val(data=label_result["data_yaml"])
    map50 = float(metrics.box.map50)
    map5095 = float(metrics.box.map)

    print(f"mAP50:    {map50:.4f}")
    print(f"mAP50-95: {map5095:.4f}")

    # Save to Drive
    drive_result = save_to_drive(val_acc=map50)

    return {
        "status": "complete",
        "labeled_images": label_result["labeled_images"],
        "total_detections": label_result["total_detections"],
        "epochs": epochs,
        "duration_seconds": round(duration, 1),
        "map50": round(map50, 4),
        "map5095": round(map5095, 4),
        "model_path": str(standard_path),
        "drive_save": drive_result,
    }
