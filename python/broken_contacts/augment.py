"""Clinical-aware image augmentation engine for robustness testing.

Produces variants of dental images with controlled transforms to test
scorer consistency. Each variant records exactly which transforms were
applied and their parameters.
"""

import io
import random
from typing import List, Tuple

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


def _rotate_slight(img: Image.Image) -> Tuple[Image.Image, dict]:
    angle = random.uniform(-15, 15)
    rotated = img.rotate(angle, expand=False, fillcolor=(0, 0, 0))
    return rotated, {"transform": "rotate_slight", "angle_deg": round(angle, 2)}


def _brightness_shift(img: Image.Image) -> Tuple[Image.Image, dict]:
    factor = random.uniform(0.7, 1.3)
    enhanced = ImageEnhance.Brightness(img).enhance(factor)
    return enhanced, {"transform": "brightness_shift", "factor": round(factor, 3)}


def _contrast_shift(img: Image.Image) -> Tuple[Image.Image, dict]:
    factor = random.uniform(0.7, 1.4)
    enhanced = ImageEnhance.Contrast(img).enhance(factor)
    return enhanced, {"transform": "contrast_shift", "factor": round(factor, 3)}


def _crop_jitter(img: Image.Image) -> Tuple[Image.Image, dict]:
    w, h = img.size
    pct = random.uniform(0.05, 0.15)
    left = int(w * random.uniform(0, pct))
    top = int(h * random.uniform(0, pct))
    right = w - int(w * random.uniform(0, pct))
    bottom = h - int(h * random.uniform(0, pct))
    cropped = img.crop((left, top, right, bottom)).resize((w, h), Image.LANCZOS)
    return cropped, {"transform": "crop_jitter", "pct": round(pct, 3), "box": [left, top, right, bottom]}


def _color_temperature(img: Image.Image) -> Tuple[Image.Image, dict]:
    arr = np.array(img, dtype=np.float32)
    r_shift = random.randint(-20, 20)
    b_shift = random.randint(-20, 20)
    arr[:, :, 0] = np.clip(arr[:, :, 0] + r_shift, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] + b_shift, 0, 255)
    return Image.fromarray(arr.astype(np.uint8)), {
        "transform": "color_temperature", "r_shift": r_shift, "b_shift": b_shift,
    }


def _gaussian_blur(img: Image.Image) -> Tuple[Image.Image, dict]:
    sigma = random.uniform(0.5, 2.0)
    blurred = img.filter(ImageFilter.GaussianBlur(radius=sigma))
    return blurred, {"transform": "gaussian_blur", "sigma": round(sigma, 3)}


def _jpeg_artifact(img: Image.Image) -> Tuple[Image.Image, dict]:
    quality = random.randint(40, 80)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    degraded = Image.open(buf).convert("RGB")
    return degraded, {"transform": "jpeg_artifact", "quality": quality}


ALL_TRANSFORMS = [
    _rotate_slight,
    _brightness_shift,
    _contrast_shift,
    _crop_jitter,
    _color_temperature,
    _gaussian_blur,
    _jpeg_artifact,
]


def augment_image(
    image: Image.Image,
    num_variants: int = 3,
    transforms_per_variant: int = 2,
) -> List[Tuple[Image.Image, dict]]:
    """Generate augmented variants of a dental image.

    Each variant applies a random subset of clinical-aware transforms.

    Args:
        image: Source PIL image.
        num_variants: Number of augmented variants to produce.
        transforms_per_variant: Number of transforms to chain per variant.

    Returns:
        List of (augmented_image, metadata) tuples.
    """
    variants = []
    for i in range(num_variants):
        selected = random.sample(ALL_TRANSFORMS, min(transforms_per_variant, len(ALL_TRANSFORMS)))
        current = image.copy()
        applied = []
        for fn in selected:
            current, meta = fn(current)
            applied.append(meta)
        variants.append((current, {"variant_index": i, "transforms": applied}))
    return variants
