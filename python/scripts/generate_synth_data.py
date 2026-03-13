"""Generate synthetic dental images for pipeline testing and bootstrapping.

Usage:
    python scripts/generate_synth_data.py --output data/raw --count 50
    python scripts/generate_synth_data.py --output data/synth --count 200 --gap-prob 0.3
"""

import argparse
from broken_contacts.synth_generator import generate_dataset


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic dental images")
    parser.add_argument("--output", type=str, default="data/synth", help="Output directory")
    parser.add_argument("--count", type=int, default=100, help="Number of images")
    parser.add_argument("--width", type=int, default=640, help="Image width")
    parser.add_argument("--height", type=int, default=480, help="Image height")
    parser.add_argument("--gap-prob", type=float, default=0.25, help="Gap probability")
    parser.add_argument("--resto-prob", type=float, default=0.15, help="Restoration probability")
    parser.add_argument("--split", type=float, default=0.8, help="Train split fraction")
    args = parser.parse_args()

    generate_dataset(
        output_dir=args.output,
        num_images=args.count,
        train_split=args.split,
        img_w=args.width,
        img_h=args.height,
        gap_probability=args.gap_prob,
        restoration_probability=args.resto_prob,
    )


if __name__ == "__main__":
    main()
