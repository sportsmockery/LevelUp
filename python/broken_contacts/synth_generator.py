"""Synthetic Dental Image Generator.

Creates artificial dental scenes with procedurally generated teeth, contacts,
gaps, restorations, and gingival margins. Each image comes with YOLO-format
labels and relational pair annotations.

Used to bootstrap training data and test the full pipeline when real clinical
images are not yet available.
"""

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


# --- Tooth color palette (realistic dental shades) ---
ENAMEL_COLORS = [
    (235, 230, 220), (240, 235, 225), (230, 225, 215),
    (245, 240, 230), (225, 220, 210), (220, 215, 205),
]
DENTIN_COLORS = [
    (210, 195, 170), (200, 185, 160), (215, 200, 175),
]
RESTORATION_COLORS = [
    (180, 180, 185), (160, 160, 170), (140, 140, 150),  # amalgam
    (230, 228, 220), (235, 232, 225),                     # composite
]
GUM_COLORS = [
    (180, 100, 110), (170, 90, 100), (190, 110, 120),
    (160, 85, 95), (175, 95, 105),
]
BACKGROUND_COLORS = [
    (40, 35, 45), (50, 45, 55), (35, 30, 40), (60, 55, 65),
]


@dataclass
class SynthTooth:
    """A single procedurally generated tooth."""
    x: int           # center x
    y: int           # center y
    width: int       # crown width
    height: int      # crown height
    color: Tuple[int, int, int]
    has_restoration: bool = False
    restoration_color: Tuple[int, int, int] = (180, 180, 185)
    restoration_area: float = 0.0  # fraction of crown covered


@dataclass
class SynthScene:
    """A complete synthetic dental scene."""
    image: np.ndarray
    teeth: List[SynthTooth]
    gap_indices: List[int]           # indices where open contacts exist
    labels_yolo: List[str]           # YOLO format label lines
    relational_pairs: List[dict]     # pair annotations


def _random_tooth_arch(
    num_teeth: int,
    img_w: int,
    img_h: int,
    arch_y: int,
    tooth_w_range: Tuple[int, int] = (35, 55),
    tooth_h_range: Tuple[int, int] = (50, 80),
    gap_probability: float = 0.2,
    restoration_probability: float = 0.15,
) -> Tuple[List[SynthTooth], List[int]]:
    """Generate a row of teeth with controlled gaps and restorations."""
    teeth = []
    gaps = []
    spacing = img_w // (num_teeth + 1)

    for i in range(num_teeth):
        tw = random.randint(*tooth_w_range)
        th = random.randint(*tooth_h_range)
        x = spacing * (i + 1) + random.randint(-8, 8)
        y = arch_y + random.randint(-5, 5)
        color = random.choice(ENAMEL_COLORS)

        has_resto = random.random() < restoration_probability
        resto_color = random.choice(RESTORATION_COLORS) if has_resto else (0, 0, 0)
        resto_area = random.uniform(0.15, 0.4) if has_resto else 0.0

        teeth.append(SynthTooth(
            x=x, y=y, width=tw, height=th, color=color,
            has_restoration=has_resto,
            restoration_color=resto_color,
            restoration_area=resto_area,
        ))

        # Decide if gap between this tooth and next
        if i < num_teeth - 1 and random.random() < gap_probability:
            gaps.append(i)

    return teeth, gaps


def _draw_tooth(
    draw: ImageDraw.ImageDraw,
    img: np.ndarray,
    tooth: SynthTooth,
    add_texture: bool = True,
) -> None:
    """Draw a single tooth with crown shape, optional restoration, and texture."""
    x, y, w, h = tooth.x, tooth.y, tooth.width, tooth.height

    # Crown shape: rounded rectangle with slight taper
    top_w = int(w * 0.85)
    points = [
        (x - top_w // 2, y - h // 2),      # top-left
        (x + top_w // 2, y - h // 2),      # top-right
        (x + w // 2, y + h // 3),           # mid-right (widest)
        (x + w // 2 - 3, y + h // 2),      # bottom-right
        (x - w // 2 + 3, y + h // 2),      # bottom-left
        (x - w // 2, y + h // 3),           # mid-left
    ]

    draw.polygon(points, fill=tooth.color, outline=(200, 195, 185))

    # Restoration overlay
    if tooth.has_restoration:
        resto_h = int(h * tooth.restoration_area)
        resto_y = y - h // 2 + random.randint(5, 15)
        resto_w = int(w * 0.6)
        draw.ellipse(
            [x - resto_w // 2, resto_y, x + resto_w // 2, resto_y + resto_h],
            fill=tooth.restoration_color,
        )


def _draw_gum_line(
    draw: ImageDraw.ImageDraw,
    teeth: List[SynthTooth],
    img_h: int,
    img_w: int,
) -> List[Tuple[int, int, int, int]]:
    """Draw gingival margin (gum line) around the teeth. Returns gum bbox list."""
    gum_color = random.choice(GUM_COLORS)
    gum_bboxes = []

    for i, t in enumerate(teeth):
        # Gum scallop around each tooth
        gum_top = t.y - t.height // 2 - random.randint(5, 15)
        gum_left = t.x - t.width // 2 - 5
        gum_right = t.x + t.width // 2 + 5

        # Draw gum tissue above tooth
        points = [
            (gum_left, gum_top),
            (t.x, gum_top - random.randint(3, 8)),  # scallop peak
            (gum_right, gum_top),
            (gum_right, gum_top - 15),
            (gum_left, gum_top - 15),
        ]
        draw.polygon(points, fill=gum_color)

        gum_bboxes.append((gum_left, gum_top - 15, gum_right, gum_top))

    # Fill gum area above all teeth
    if teeth:
        leftmost = min(t.x - t.width // 2 for t in teeth) - 20
        rightmost = max(t.x + t.width // 2 for t in teeth) + 20
        top_line = min(t.y - t.height // 2 for t in teeth) - 20
        draw.rectangle([leftmost, 0, rightmost, top_line], fill=gum_color)

    return gum_bboxes


def _add_contact_gap(
    draw: ImageDraw.ImageDraw,
    left: SynthTooth,
    right: SynthTooth,
    gap_size: int,
    bg_color: Tuple[int, int, int],
) -> Tuple[int, int, int, int]:
    """Draw a visible gap between two teeth. Returns gap bbox."""
    gap_x = (left.x + left.width // 2 + right.x - right.width // 2) // 2
    gap_top = max(left.y - left.height // 2, right.y - right.height // 2) + 5
    gap_bot = min(left.y + left.height // 2, right.y + right.height // 2) - 5
    half_gap = gap_size // 2

    # Draw dark gap
    draw.rectangle(
        [gap_x - half_gap, gap_top, gap_x + half_gap, gap_bot],
        fill=bg_color,
    )
    return (gap_x - half_gap - 2, gap_top, gap_x + half_gap + 2, gap_bot)


def _add_noise_and_texture(img: np.ndarray) -> np.ndarray:
    """Add realistic noise and slight texture variation."""
    # Gaussian noise
    noise = np.random.normal(0, 3, img.shape).astype(np.int16)
    noisy = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # Slight blur for realism
    if random.random() > 0.5:
        noisy = cv2.GaussianBlur(noisy, (3, 3), 0.5)

    return noisy


def generate_scene(
    img_w: int = 640,
    img_h: int = 480,
    num_teeth: int = 0,
    gap_probability: float = 0.2,
    restoration_probability: float = 0.15,
) -> SynthScene:
    """Generate a complete synthetic dental scene.

    Args:
        img_w: Image width.
        img_h: Image height.
        num_teeth: Number of teeth (0 = random 4-8).
        gap_probability: Chance of gap between adjacent teeth.
        restoration_probability: Chance of restoration on each tooth.

    Returns:
        SynthScene with image, labels, and pair annotations.
    """
    if num_teeth == 0:
        num_teeth = random.randint(4, 8)

    bg_color = random.choice(BACKGROUND_COLORS)
    img = np.full((img_h, img_w, 3), bg_color, dtype=np.uint8)

    pil_img = Image.fromarray(img)
    draw = ImageDraw.Draw(pil_img)

    arch_y = img_h // 2 + random.randint(-20, 20)

    teeth, gap_indices = _random_tooth_arch(
        num_teeth, img_w, img_h, arch_y,
        gap_probability=gap_probability,
        restoration_probability=restoration_probability,
    )

    # Draw gum line first (behind teeth)
    gum_bboxes = _draw_gum_line(draw, teeth, img_h, img_w)

    # Draw teeth
    for tooth in teeth:
        _draw_tooth(draw, img, tooth)

    # Draw gaps
    gap_bboxes = {}
    for gi in gap_indices:
        gap_size = random.randint(4, 15)
        gap_bbox = _add_contact_gap(draw, teeth[gi], teeth[gi + 1], gap_size, bg_color)
        gap_bboxes[gi] = gap_bbox

    # Convert back to numpy and add texture
    img = np.array(pil_img)
    img = _add_noise_and_texture(img)

    # --- Generate YOLO labels ---
    labels = []

    for i, tooth in enumerate(teeth):
        # Class 0: tooth_crown
        cx = tooth.x / img_w
        cy = tooth.y / img_h
        bw = tooth.width / img_w
        bh = tooth.height / img_h
        labels.append(f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

        # Class 1: mesial_surface (left side of tooth)
        ms_w = tooth.width * 0.2 / img_w
        ms_x = (tooth.x - tooth.width // 2 + tooth.width * 0.1) / img_w
        labels.append(f"1 {ms_x:.6f} {cy:.6f} {ms_w:.6f} {bh * 0.8:.6f}")

        # Class 2: distal_surface (right side of tooth)
        ds_x = (tooth.x + tooth.width // 2 - tooth.width * 0.1) / img_w
        labels.append(f"2 {ds_x:.6f} {cy:.6f} {ms_w:.6f} {bh * 0.8:.6f}")

        # Class 3: occlusal_surface (top of tooth)
        os_h = tooth.height * 0.2 / img_h
        os_y = (tooth.y - tooth.height // 2 + tooth.height * 0.1) / img_h
        labels.append(f"3 {cx:.6f} {os_y:.6f} {bw * 0.7:.6f} {os_h:.6f}")

        # Class 4: restoration_margin (if restoration exists)
        if tooth.has_restoration:
            rm_y = (tooth.y - tooth.height // 2 + 10) / img_h
            rm_h = tooth.height * tooth.restoration_area / img_h
            rm_w = tooth.width * 0.6 / img_w
            labels.append(f"4 {cx:.6f} {rm_y:.6f} {rm_w:.6f} {rm_h:.6f}")

    # Class 5: contact_gap_candidate
    for gi, bbox in gap_bboxes.items():
        gcx = ((bbox[0] + bbox[2]) / 2) / img_w
        gcy = ((bbox[1] + bbox[3]) / 2) / img_h
        gw = (bbox[2] - bbox[0]) / img_w
        gh = (bbox[3] - bbox[1]) / img_h
        labels.append(f"5 {gcx:.6f} {gcy:.6f} {gw:.6f} {gh:.6f}")

    # Class 8: gingival_margin
    for bbox in gum_bboxes:
        gcx = ((bbox[0] + bbox[2]) / 2) / img_w
        gcy = ((bbox[1] + bbox[3]) / 2) / img_h
        gw = (bbox[2] - bbox[0]) / img_w
        gh = (bbox[3] - bbox[1]) / img_h
        if gw > 0 and gh > 0:
            labels.append(f"8 {gcx:.6f} {gcy:.6f} {gw:.6f} {gh:.6f}")

    # --- Relational pair annotations ---
    pairs = []
    for i in range(len(teeth) - 1):
        has_gap = i in gap_indices
        pairs.append({
            "pair_index": i,
            "member_ids": [i, i + 1],
            "type": "interproximal",
            "has_gap": has_gap,
            "clinical_label": "open_contact_small" if has_gap else "normal_interproximal",
        })

    return SynthScene(
        image=img,
        teeth=teeth,
        gap_indices=gap_indices,
        labels_yolo=labels,
        relational_pairs=pairs,
    )


def generate_dataset(
    output_dir: str,
    num_images: int = 100,
    train_split: float = 0.8,
    img_w: int = 640,
    img_h: int = 480,
    gap_probability: float = 0.25,
    restoration_probability: float = 0.15,
) -> dict:
    """Generate a complete synthetic dataset with train/val split.

    Creates YOLO-format directory structure:
        output_dir/
            train/images/  train/labels/
            val/images/    val/labels/
            relational/    (pair annotations)

    Args:
        output_dir: Root output directory.
        num_images: Total images to generate.
        train_split: Fraction for training (rest is val).
        img_w: Image width.
        img_h: Image height.
        gap_probability: Probability of gap between teeth.
        restoration_probability: Probability of restoration per tooth.

    Returns:
        Summary dict with counts and paths.
    """
    out = Path(output_dir)
    train_img = out / "train" / "images"
    train_lbl = out / "train" / "labels"
    val_img = out / "val" / "images"
    val_lbl = out / "val" / "labels"
    rel_dir = out / "relational"

    for d in [train_img, train_lbl, val_img, val_lbl, rel_dir]:
        d.mkdir(parents=True, exist_ok=True)

    num_train = int(num_images * train_split)
    total_gaps = 0
    total_teeth = 0
    total_restorations = 0

    for i in range(num_images):
        scene = generate_scene(
            img_w=img_w,
            img_h=img_h,
            gap_probability=gap_probability,
            restoration_probability=restoration_probability,
        )

        name = f"synth_{i:04d}"
        is_train = i < num_train
        img_dir = train_img if is_train else val_img
        lbl_dir = train_lbl if is_train else val_lbl

        # Save image
        cv2.imwrite(str(img_dir / f"{name}.jpg"), scene.image)

        # Save YOLO labels
        with open(lbl_dir / f"{name}.txt", "w") as f:
            f.write("\n".join(scene.labels_yolo) + "\n")

        # Save relational annotations
        with open(rel_dir / f"{name}.json", "w") as f:
            json.dump({
                "image_id": name,
                "num_teeth": len(scene.teeth),
                "gaps": scene.gap_indices,
                "contact_pairs": scene.relational_pairs,
            }, f, indent=2)

        total_teeth += len(scene.teeth)
        total_gaps += len(scene.gap_indices)
        total_restorations += sum(1 for t in scene.teeth if t.has_restoration)

    # Generate data.yaml
    yaml_content = f"""# Synthetic Dental Dataset — Auto-Generated
path: {out.resolve()}
train: train/images
val: val/images

nc: 9
names:
  0: tooth_crown
  1: mesial_surface
  2: distal_surface
  3: occlusal_surface
  4: restoration_margin
  5: contact_gap_candidate
  6: articulating_mark
  7: ortho_hardware
  8: gingival_margin
"""
    with open(out / "data.yaml", "w") as f:
        f.write(yaml_content)

    summary = {
        "total_images": num_images,
        "train_images": num_train,
        "val_images": num_images - num_train,
        "total_teeth": total_teeth,
        "total_gaps": total_gaps,
        "total_restorations": total_restorations,
        "output_dir": str(out),
        "data_yaml": str(out / "data.yaml"),
    }

    print(f"Generated {num_images} synthetic dental images")
    print(f"  Train: {num_train} | Val: {num_images - num_train}")
    print(f"  Teeth: {total_teeth} | Gaps: {total_gaps} | Restorations: {total_restorations}")
    print(f"  Output: {out}")

    return summary
