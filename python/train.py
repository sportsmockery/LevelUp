"""
Healthy Start — YOLO Fine-Tuning Script
Fine-tune the YOLOv12 teeth detection model on new labeled data.

Usage:
    python train.py --data dataset/data.yaml
    python train.py --data dataset/data.yaml --epochs 100 --batch 8 --imgsz 640
    python train.py --data dataset/data.yaml --resume runs/teeth_v2/weights/last.pt
"""

import argparse
from pathlib import Path
from ultralytics import YOLO

BASE_MODEL = Path(__file__).parent / "yolov12s_010826.pt"


def train(args):
    if args.resume:
        print(f"Resuming training from: {args.resume}")
        model = YOLO(args.resume)
    else:
        print(f"Fine-tuning from base model: {BASE_MODEL}")
        model = YOLO(str(BASE_MODEL))

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

    # Validate on the best checkpoint
    best = Path("runs/detect") / args.name / "weights" / "best.pt"
    if best.exists():
        print(f"\nRunning validation on best model: {best}")
        val_model = YOLO(str(best))
        metrics = val_model.val(data=args.data)
        print(f"\nmAP50:    {metrics.box.map50:.4f}")
        print(f"mAP50-95: {metrics.box.map:.4f}")
        print(f"\nBest model saved to: {best}")
    else:
        print("Training complete. Check runs/detect/ for results.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune YOLO teeth detection model")
    parser.add_argument("--data", type=str, required=True, help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs (default: 50)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (default: 16)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size (default: 640)")
    parser.add_argument("--name", type=str, default="teeth_v2", help="Run name (default: teeth_v2)")
    parser.add_argument("--lr", type=float, default=0.001, help="Initial learning rate (default: 0.001)")
    parser.add_argument("--patience", type=int, default=20, help="Early stopping patience (default: 20)")
    parser.add_argument("--resume", type=str, default=None, help="Path to checkpoint to resume from")
    args = parser.parse_args()

    train(args)
