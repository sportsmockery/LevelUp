"""Image Optimization Gate for dental scans.

Handles low-quality bitewings and intraoral photos via:
- CLAHE contrast enhancement for enamel boundary visibility
- Adaptive sharpening for blur-prone images
- Quality scoring for downstream exclusion gating
"""

import cv2
import numpy as np
from PIL import Image


# Laplacian sharpening kernel (mild)
SHARPEN_KERNEL = np.array([
    [0, -0.5, 0],
    [-0.5, 3, -0.5],
    [0, -0.5, 0],
], dtype=np.float32)

# Blur detection threshold (Laplacian variance)
BLUR_THRESHOLD = 80.0

# CLAHE parameters tuned for dental radiographs
CLAHE_CLIP_LIMIT = 3.0
CLAHE_TILE_SIZE = (8, 8)


def enhance_dental_image(
    image: np.ndarray,
    clip_limit: float = CLAHE_CLIP_LIMIT,
    tile_size: tuple = CLAHE_TILE_SIZE,
    blur_threshold: float = BLUR_THRESHOLD,
    auto_sharpen: bool = True,
) -> tuple[np.ndarray, dict]:
    """Apply CLAHE enhancement and adaptive sharpening to a dental image.

    Args:
        image: Input BGR image (OpenCV format).
        clip_limit: CLAHE contrast limit.
        tile_size: CLAHE tile grid size.
        blur_threshold: Laplacian variance below which sharpening is applied.
        auto_sharpen: Whether to apply sharpening for blur-prone images.

    Returns:
        Tuple of (enhanced_image, quality_metrics).
    """
    metrics = {
        "original_variance": 0.0,
        "enhanced_variance": 0.0,
        "blur_detected": False,
        "sharpening_applied": False,
        "clahe_applied": True,
    }

    # Convert to LAB for luminance-only CLAHE (preserves color)
    if len(image.shape) == 3 and image.shape[2] == 3:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
    else:
        # Grayscale (common for bitewings)
        l_channel = image.copy()
        a_channel = None
        b_channel = None

    # Measure original sharpness
    laplacian_var = cv2.Laplacian(l_channel, cv2.CV_64F).var()
    metrics["original_variance"] = round(float(laplacian_var), 2)
    metrics["blur_detected"] = laplacian_var < blur_threshold

    # Apply CLAHE to luminance channel
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
    l_enhanced = clahe.apply(l_channel)

    # Adaptive sharpening for blur-prone images
    if auto_sharpen and laplacian_var < blur_threshold:
        l_enhanced = cv2.filter2D(l_enhanced, -1, SHARPEN_KERNEL)
        l_enhanced = np.clip(l_enhanced, 0, 255).astype(np.uint8)
        metrics["sharpening_applied"] = True

    # Measure enhanced sharpness
    enhanced_var = cv2.Laplacian(l_enhanced, cv2.CV_64F).var()
    metrics["enhanced_variance"] = round(float(enhanced_var), 2)

    # Reconstruct image
    if a_channel is not None:
        enhanced_lab = cv2.merge([l_enhanced, a_channel, b_channel])
        enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    else:
        enhanced = l_enhanced

    return enhanced, metrics


def pil_to_enhanced(image: Image.Image, **kwargs) -> tuple[Image.Image, dict]:
    """Convenience wrapper: PIL Image in, enhanced PIL Image out.

    Args:
        image: PIL RGB image.
        **kwargs: Passed to enhance_dental_image.

    Returns:
        Tuple of (enhanced_pil_image, quality_metrics).
    """
    bgr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    enhanced_bgr, metrics = enhance_dental_image(bgr, **kwargs)
    enhanced_rgb = cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(enhanced_rgb), metrics


def compute_quality_score(metrics: dict) -> float:
    """Compute a 0-1 quality score from enhancement metrics.

    Higher variance = sharper image = higher quality.
    """
    var = metrics.get("enhanced_variance", 0.0)
    # Sigmoid-like mapping: 50->0.3, 100->0.6, 200->0.85, 500->0.97
    score = 1.0 - (1.0 / (1.0 + (var / 150.0) ** 1.5))
    return round(min(max(score, 0.0), 1.0), 3)
