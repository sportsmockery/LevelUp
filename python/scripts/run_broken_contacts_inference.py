"""Run the full broken contacts inference pipeline.

Chains YOLO detector -> crop generation -> contact classifier.
Outputs annotated images, per-contact JSON, and crop images.

Usage:
    python scripts/run_broken_contacts_inference.py \
        --input path/to/test_images \
        --detector runs/detect/contacts_detector_v1/weights/best.pt \
        --classifier runs/classify/contacts_classifier_v1/best.pt \
        --output runs/broken_contacts_inference

    # Single image:
    python scripts/run_broken_contacts_inference.py \
        --input path/to/image.jpg \
        --detector runs/detect/contacts_detector_v1/weights/best.pt \
        --classifier runs/classify/contacts_classifier_v1/best.pt
"""

import argparse
import json
from pathlib import Path

from broken_contacts.config import Config
from broken_contacts.inference import BrokenContactsPipeline


def main():
    parser = argparse.ArgumentParser(description="Run broken contacts inference")
    parser.add_argument("--input", type=str, required=True,
                        help="Path to image or directory of images")
    parser.add_argument("--detector", type=str, required=True,
                        help="Path to trained detector model (.pt)")
    parser.add_argument("--classifier", type=str, required=True,
                        help="Path to trained classifier model (.pt)")
    parser.add_argument("--output", type=str, default="runs/broken_contacts_inference",
                        help="Output directory (default: runs/broken_contacts_inference)")
    parser.add_argument("--det-conf", type=float, default=0.3,
                        help="Detector confidence threshold (default: 0.3)")
    parser.add_argument("--cls-conf", type=float, default=0.5,
                        help="Classifier confidence threshold (default: 0.5)")
    parser.add_argument("--no-crops", action="store_true", help="Skip saving crop images")
    parser.add_argument("--no-vis", action="store_true", help="Skip saving annotated images")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input not found: {input_path}")

    config = Config()
    config.detector_model_path = args.detector
    config.classifier_model_path = args.classifier
    config.output_dir = args.output
    config.detector_confidence = args.det_conf
    config.classifier_confidence_threshold = args.cls_conf

    pipeline = BrokenContactsPipeline(config)

    if input_path.is_file():
        # Single image
        result = pipeline.run(
            image_path=str(input_path),
            output_dir=args.output,
            save_crops=not args.no_crops,
            save_visualization=not args.no_vis,
        )
        print(f"\nResults for: {input_path.name}")
        print(f"  Contacts found: {len(result.contacts)}")
        for c in result.contacts:
            flag = " <<<" if c.classifier_label == "open_contact" else ""
            print(f"  #{c.pair_index}: {c.classifier_label} ({c.classifier_confidence:.1%}){flag}")

    else:
        # Batch inference on directory
        results = pipeline.run_batch(
            image_dir=str(input_path),
            output_dir=args.output,
        )

        # Print summary
        total_contacts = sum(len(r.contacts) for r in results)
        open_contacts = sum(
            1 for r in results for c in r.contacts
            if c.classifier_label == "open_contact"
        )
        print(f"\n{'='*50}")
        print(f"Batch complete: {len(results)} images")
        print(f"Total contacts analyzed: {total_contacts}")
        print(f"Open contacts found: {open_contacts}")
        print(f"Output directory: {args.output}")


if __name__ == "__main__":
    main()
