"""Generate interproximal contact crops from labeled detector data.

Reads YOLO-format labels and generates crops of the regions between adjacent
teeth. Output crops are saved into class folders for manual sorting, or into
a flat directory for review.

Usage:
    python scripts/generate_contact_crops.py \
        --images dataset_contacts_detector/train/images \
        --labels dataset_contacts_detector/train/labels \
        --output dataset_contacts_classifier/train

    After running, manually sort the generated crops into:
        normal_contact/  open_contact/  unclear_contact/
"""

import argparse
import json
from pathlib import Path

from broken_contacts.config import Config
from broken_contacts.crops import generate_crops_from_labels


def main():
    parser = argparse.ArgumentParser(description="Generate interproximal contact crops")
    parser.add_argument("--images", type=str, required=True, help="Directory of source images")
    parser.add_argument("--labels", type=str, required=True, help="Directory of YOLO label files")
    parser.add_argument("--output", type=str, required=True, help="Output directory for crops")
    parser.add_argument("--padding", type=float, default=0.15, help="Crop padding fraction (default: 0.15)")
    parser.add_argument("--crop-size", type=int, default=224, help="Crop output size (default: 224)")
    parser.add_argument("--unsorted", action="store_true",
                        help="Save all crops to a flat 'unsorted' folder instead of class folders")
    args = parser.parse_args()

    images_dir = Path(args.images)
    labels_dir = Path(args.labels)
    output_dir = Path(args.output)

    if not images_dir.is_dir():
        raise NotADirectoryError(f"Images directory not found: {images_dir}")
    if not labels_dir.is_dir():
        raise NotADirectoryError(f"Labels directory not found: {labels_dir}")

    config = Config()
    config.interproximal_padding = args.padding
    config.crop_size = args.crop_size

    # Find all image/label pairs
    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    image_files = sorted(f for f in images_dir.iterdir() if f.suffix.lower() in image_extensions)

    if not image_files:
        raise FileNotFoundError(f"No images found in {images_dir}")

    if args.unsorted:
        crop_output = output_dir / "unsorted"
    else:
        crop_output = output_dir / "unsorted"
        print("Crops will be saved to 'unsorted/' folder.")
        print("After generation, manually move them into:")
        print(f"  {output_dir}/normal_contact/")
        print(f"  {output_dir}/open_contact/")
        print(f"  {output_dir}/unclear_contact/")
        print()

    crop_output.mkdir(parents=True, exist_ok=True)

    total_crops = 0
    all_metadata = []

    for img_path in image_files:
        label_path = labels_dir / f"{img_path.stem}.txt"
        if not label_path.exists():
            print(f"  Skipping {img_path.name} (no label file)")
            continue

        crops = generate_crops_from_labels(
            image_path=str(img_path),
            label_path=str(label_path),
            config=config,
            output_dir=crop_output,
        )

        for crop in crops:
            crop.pop("crop_image", None)  # remove PIL image from metadata
            all_metadata.append({
                "source_image": str(img_path),
                **crop,
            })

        total_crops += len(crops)
        print(f"  {img_path.name}: {len(crops)} crops")

    # Save metadata
    meta_path = output_dir / "crops_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(all_metadata, f, indent=2)

    print(f"\nGenerated {total_crops} crops -> {crop_output}")
    print(f"Metadata saved to: {meta_path}")

    if not args.unsorted:
        print(f"\nNext step: sort crops in {crop_output}/ into class folders.")


if __name__ == "__main__":
    main()
