"""Train the YOLO detector for teeth and interproximal regions.

Usage:
    python scripts/train_contacts_detector.py --data dataset_contacts_detector/data.yaml
    python scripts/train_contacts_detector.py --data dataset_contacts_detector/data.yaml --epochs 100 --batch 8
"""

import argparse
from pathlib import Path
from ultralytics import YOLO


def main():
    parser = argparse.ArgumentParser(description="Train broken contacts YOLO detector")
    parser.add_argument("--data", type=str, required=True, help="Path to data.yaml")
    parser.add_argument("--base-model", type=str, default="yolov12s_010826.pt",
                        help="Base YOLO model to fine-tune (default: yolov12s_010826.pt)")
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs (default: 100)")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (default: 8)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size (default: 640)")
    parser.add_argument("--lr", type=float, default=0.0005, help="Initial learning rate (default: 0.0005)")
    parser.add_argument("--name", type=str, default="contacts_detector_v1", help="Run name")
    parser.add_argument("--patience", type=int, default=25, help="Early stopping patience (default: 25)")
    parser.add_argument("--resume", type=str, default=None, help="Resume from checkpoint")
    args = parser.parse_args()

    if args.resume:
        print(f"Resuming from: {args.resume}")
        model = YOLO(args.resume)
    else:
        base_path = Path(args.base_model)
        if not base_path.exists():
            raise FileNotFoundError(f"Base model not found: {base_path}")
        print(f"Fine-tuning from: {base_path}")
        model = YOLO(str(base_path))

    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        name=args.name,
        patience=args.patience,
        lr0=args.lr,
        augment=True,
        save=True,
        save_period=10,
        val=True,
        plots=True,
        verbose=True,
    )

    best = Path("runs/detect") / args.name / "weights" / "best.pt"
    if best.exists():
        print(f"\nValidating best model: {best}")
        val_model = YOLO(str(best))
        metrics = val_model.val(data=args.data)
        print(f"mAP50:    {metrics.box.map50:.4f}")
        print(f"mAP50-95: {metrics.box.map:.4f}")
        print(f"\nBest model saved to: {best}")


if __name__ == "__main__":
    main()
