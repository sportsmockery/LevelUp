"""Visualization utilities for relationship-aware broken contacts pipeline output."""

from pathlib import Path
from typing import List, Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from broken_contacts.schemas import ContactPrediction


# Colors per clinical label
CLINICAL_COLORS = {
    "normal_contact": (0, 200, 0),        # green
    "food_trap_risk": (220, 40, 40),       # red
    "restoration_failure": (200, 60, 180), # magenta
    "monitor": (220, 180, 0),              # yellow
    "not_assessable": (120, 120, 120),     # gray
}

# Backward compat for simple labels
LABEL_COLORS = {
    "normal_contact": (0, 200, 0),
    "open_contact": (220, 40, 40),
    "unclear_contact": (220, 180, 0),
}

TOOTH_COLOR = (100, 160, 255)  # light blue
GEOMETRY_COLOR = (255, 140, 0)  # orange for geometric lines


def _get_font(size: int):
    try:
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
    except (IOError, OSError):
        return ImageFont.load_default()


def draw_results(
    image: Image.Image,
    contacts: List[ContactPrediction],
    tooth_boxes: Optional[List[np.ndarray]] = None,
    show_geometry: bool = True,
) -> Image.Image:
    """Draw detection and classification results on an image.

    Args:
        image: Source image.
        contacts: List of contact predictions.
        tooth_boxes: Optional list of tooth bounding boxes to draw.
        show_geometry: Whether to draw geometric lines between surfaces.

    Returns:
        Annotated PIL image.
    """
    annotated = image.copy()
    draw = ImageDraw.Draw(annotated)
    font = _get_font(14)
    font_small = _get_font(11)

    # Draw tooth boxes
    if tooth_boxes:
        for i, box in enumerate(tooth_boxes):
            x1, y1, x2, y2 = [int(c) for c in box]
            draw.rectangle([x1, y1, x2, y2], outline=TOOTH_COLOR, width=2)
            draw.text((x1 + 2, y1 + 2), f"T{i}", fill=TOOTH_COLOR, font=font_small)

    # Draw contact regions with labels
    for contact in contacts:
        # Use clinical label color if available, fall back to simple
        clinical_label = contact.clinical.label if hasattr(contact, 'clinical') else None
        if clinical_label and clinical_label in CLINICAL_COLORS:
            color = CLINICAL_COLORS[clinical_label]
            display_label = clinical_label.replace("_", " ")
            display_conf = contact.clinical.confidence
        else:
            color = LABEL_COLORS.get(contact.classifier_label, (200, 200, 200))
            display_label = contact.classifier_label.replace("_", " ")
            display_conf = contact.classifier_confidence

        box = contact.contact_box
        x1, y1, x2, y2 = [int(c) for c in box]

        # Draw contact region box
        draw.rectangle([x1, y1, x2, y2], outline=color, width=3)

        # Label text above the box
        text = f"{display_label} {display_conf:.0%}"
        bbox = draw.textbbox((x1, y1 - 18), text, font=font)
        draw.rectangle([bbox[0] - 2, bbox[1] - 2, bbox[2] + 2, bbox[3] + 2], fill=color)
        draw.text((x1, y1 - 18), text, fill=(255, 255, 255), font=font)

        # Morphology sub-label
        if hasattr(contact, 'morphology') and contact.morphology:
            morph_text = f"[{contact.morphology.label}]"
            draw.text((x1, y2 + 2), morph_text, fill=color, font=font_small)

        # Pair index
        pair_text = f"#{contact.pair_index}"
        draw.text((x2 + 3, y1), pair_text, fill=color, font=font_small)

        # Draw geometric line between surface points
        if show_geometry and contact.geometry:
            geo = contact.geometry
            pl = geo.surface_point_left   # [x, y]
            pr = geo.surface_point_right  # [x, y]
            draw.line(
                [(int(pl[0]), int(pl[1])), (int(pr[0]), int(pr[1]))],
                fill=GEOMETRY_COLOR, width=2,
            )
            # Distance label at midpoint
            mx, my = geo.contact_midpoint
            dist_text = f"{geo.contact_distance_px:.1f}px"
            draw.text((int(mx) - 15, int(my) - 12), dist_text,
                       fill=GEOMETRY_COLOR, font=font_small)

    return annotated


def save_annotated(
    image: Image.Image,
    contacts: List[ContactPrediction],
    output_path: str,
    tooth_boxes: Optional[List[np.ndarray]] = None,
) -> str:
    """Draw results and save to file."""
    annotated = draw_results(image, contacts, tooth_boxes)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    annotated.save(output_path, quality=95)
    return output_path
