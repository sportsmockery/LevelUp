"""Run the YOLO -> SAM2 Auto-Labeling Factory.

Processes dental images through the full pipeline:
1. CLAHE enhancement + adaptive sharpening
2. YOLO 9-class detection
3. Multi-point SAM2 prompting + mask refinement
4. Dual-gate scoring (GOLD/SILVER/REJECT)
5. YOLO segment polygon export + contact pair geometry

Usage:
    # Process a directory of dental images:
    python scripts/run_sam_factory.py \
        --images data/raw \
        --yolo yolov12s_010826.pt \
        --sam sam_vit_b_01ec64.pth \
        --output runs/sam_factory_v1

    # Process with a trained detector and custom confidence:
    python scripts/run_sam_factory.py \
        --images data/raw \
        --yolo runs/detect/contacts_detector_v1/weights/best.pt \
        --sam sam_vit_b_01ec64.pth \
        --output runs/sam_factory_v1 \
        --yolo-conf 0.3 \
        --no-enhance

    # Single image:
    python scripts/run_sam_factory.py \
        --images path/to/image.jpg \
        --yolo yolov12s_010826.pt \
        --sam sam_vit_b_01ec64.pth \
        --output runs/sam_factory_v1
"""

import argparse
import json
from pathlib import Path

from broken_contacts.sam_factory import SAMFactory, export_yolo_segments, process_directory


def main():
    parser = argparse.ArgumentParser(
        description="YOLO -> SAM2 auto-labeling factory for dental contact system"
    )
    parser.add_argument("--images", type=str, required=True,
                        help="Path to image or directory of images")
    parser.add_argument("--yolo", type=str, required=True,
                        help="Path to YOLO model (.pt)")
    parser.add_argument("--sam", type=str, required=True,
                        help="Path to SAM2 checkpoint (.pth)")
    parser.add_argument("--sam-type", type=str, default="vit_b",
                        choices=["vit_b", "vit_l", "vit_h"],
                        help="SAM model type (default: vit_b)")
    parser.add_argument("--output", type=str, default="runs/sam_factory",
                        help="Output directory (default: runs/sam_factory)")
    parser.add_argument("--yolo-conf", type=float, default=0.25,
                        help="YOLO confidence threshold (default: 0.25)")
    parser.add_argument("--batch-size", type=int, default=4,
                        help="Images per GPU memory flush (default: 4)")
    parser.add_argument("--no-enhance", action="store_true",
                        help="Skip CLAHE/sharpening preprocessing")
    args = parser.parse_args()

    input_path = Path(args.images)
    if not input_path.exists():
        raise FileNotFoundError(f"Input not found: {input_path}")

    if input_path.is_file():
        # Single image mode
        factory = SAMFactory(
            yolo_model_path=args.yolo,
            sam_checkpoint_path=args.sam,
            sam_model_type=args.sam_type,
            yolo_confidence=args.yolo_conf,
        )

        result = factory.process_image(str(input_path), enhance=not args.no_enhance)

        output_dir = Path(args.output)
        gold_dir = output_dir / "train" / "labels"
        silver_dir = output_dir / "review_required"
        reject_log = output_dir / "reject_log.jsonl"

        export_summary = export_yolo_segments(result, gold_dir, silver_dir, reject_log)

        print(f"\nResults for: {input_path.name}")
        print(f"  Quality: {result.quality_score:.2f}")
        print(f"  Detections: {result.detections}")
        print(f"  GOLD:   {result.gold_count}")
        print(f"  SILVER: {result.silver_count}")
        print(f"  REJECT: {result.reject_count}")
        print(f"  Contact pairs: {len(result.contact_pairs)}")

        for pair in result.contact_pairs:
            print(f"    Pair #{pair['pair_index']}: "
                  f"dist={pair['contact_distance_px']:.1f}px "
                  f"mid=({pair['contact_midpoint'][0]:.0f}, {pair['contact_midpoint'][1]:.0f})")

        # Save full result
        result_path = output_dir / f"{input_path.stem}_result.json"
        result_path.parent.mkdir(parents=True, exist_ok=True)
        with open(result_path, "w") as f:
            json.dump(result.to_dict(), f, indent=2)
        print(f"\n  Full result: {result_path}")

        factory.cleanup()

    else:
        # Batch directory mode
        process_directory(
            image_dir=str(input_path),
            yolo_model_path=args.yolo,
            sam_checkpoint_path=args.sam,
            output_dir=args.output,
            sam_model_type=args.sam_type,
            yolo_confidence=args.yolo_conf,
            enhance=not args.no_enhance,
            batch_size=args.batch_size,
        )


if __name__ == "__main__":
    main()
