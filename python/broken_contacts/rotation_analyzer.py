"""Tooth Rotation Analyzer — detects rotated teeth relative to the dental arch.

Uses YOLO detections + SAM masks to:
1. Extract tooth contours from segmentation masks
2. Fit a polynomial arch curve through tooth centroids
3. Measure each tooth's orientation vs the arch tangent
4. Count rotated teeth and recommend treatment

Treatment recommendations:
  0 rotated:     NoTreatment
  1-2 rotated:   DirectTreatment (aligners, brackets)
  3-5 rotated:   Contraindication (complex ortho needed)
  6+ rotated:    NeedsToReferOut (specialist referral)
"""

import math
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np


# ── Constants ─────────────────────────────────────────────────────────

POLY_DEGREE = 2
FRONT_MAX_TEETH = 6
ROTATION_THRESHOLD_DEG = 18


# ── Geometry Helpers ──────────────────────────────────────────────────

def contour_centroid(contour: np.ndarray) -> Optional[np.ndarray]:
    """Compute centroid of a contour."""
    pts = contour.reshape(-1, 2).astype(np.float32)
    M = cv2.moments(pts)
    if M["m00"] == 0:
        return None
    return np.array([M["m10"] / M["m00"], M["m01"] / M["m00"]], dtype=np.float32)


def tooth_orientation_angle(contour: np.ndarray) -> float:
    """Compute major axis angle of tooth contour via PCA."""
    pts = contour.reshape(-1, 2).astype(np.float32)
    mean = np.mean(pts, axis=0)
    pts_centered = pts - mean
    cov = np.cov(pts_centered.T)
    eigenvalues, eigenvectors = np.linalg.eig(cov)
    idx = np.argmax(eigenvalues)
    major_axis = eigenvectors[:, idx]
    return math.atan2(major_axis[1], major_axis[0])


def fit_polynomial_arch(teeth_data: List[dict], degree: int = POLY_DEGREE) -> Optional[np.ndarray]:
    """Fit polynomial y = f(x) through tooth centroids."""
    if len(teeth_data) < 3:
        return None
    x = np.array([t["centroid"][0] for t in teeth_data])
    y = np.array([t["centroid"][1] for t in teeth_data])
    deg = min(degree, max(1, len(x) - 1))
    return np.polyfit(x, y, deg)


def arch_tangent_angle(coeffs: np.ndarray, x: float) -> float:
    """Compute tangent angle of the arch polynomial at position x."""
    poly = np.poly1d(coeffs)
    dpoly = np.polyder(poly)
    slope = dpoly(x)
    return math.atan(slope)


def arch_normal_vector(theta_arch: float) -> Tuple[float, float]:
    return -math.sin(theta_arch), math.cos(theta_arch)


# ── Incisal Edge Detection ───────────────────────────────────────────

def detect_incisal_line(
    contour: np.ndarray,
    theta_arch: float,
    top_ratio: float = 0.25,
    window: int = 12,
) -> Tuple[Optional[Tuple[float, float]], Optional[Tuple[float, float]]]:
    """Detect the incisal (biting) edge of a tooth contour."""
    pts = contour.reshape(-1, 2)
    y_min, y_max = pts[:, 1].min(), pts[:, 1].max()
    y_thresh = y_min + top_ratio * (y_max - y_min)
    top_pts = pts[pts[:, 1] <= y_thresh]

    if len(top_pts) < window:
        return None, None

    best_diff = 1e9
    best_line = None

    for i in range(len(top_pts) - window):
        segment = top_pts[i:i + window].astype(np.float32)
        vx, vy, x0, y0 = cv2.fitLine(segment, cv2.DIST_L2, 0, 0.01, 0.01)
        vx, vy = float(vx), float(vy)
        theta_seg = math.atan2(vy, vx)
        diff = abs(theta_seg - theta_arch)
        diff = min(diff, abs(math.pi - diff))
        if diff < best_diff:
            best_diff = diff
            best_line = (vx, vy, float(x0), float(y0))

    if best_line is None:
        return None, None

    vx, vy, x0, y0 = best_line
    norm = math.hypot(vx, vy)
    vx, vy = vx / norm, vy / norm
    return (x0, y0), (vx, vy)


# ── Rotation Computation ─────────────────────────────────────────────

def compute_tooth_rotation(tooth: dict, coeffs: np.ndarray) -> dict:
    """Compute rotation angle of a single tooth relative to arch.

    Returns dict with angle_deg, is_rotated, method used.
    """
    contour = tooth["contour"]
    centroid = tooth["centroid"]

    theta_arch = arch_tangent_angle(coeffs, centroid[0])

    # Method 1: PCA-based orientation
    theta_tooth = tooth_orientation_angle(contour)
    diff = abs(theta_tooth - theta_arch)
    diff = min(diff, abs(math.pi - diff))
    pca_angle_deg = math.degrees(diff)

    # Method 2: Incisal edge detection (more accurate for anterior teeth)
    incisal_center, incisal_vec = detect_incisal_line(contour, theta_arch)
    incisal_angle_deg = None

    if incisal_center is not None and incisal_vec is not None:
        vx, vy = incisal_vec
        lx, ly = -vy, vx  # long axis = perpendicular to incisal
        norm = math.hypot(lx, ly)
        lx, ly = lx / norm, ly / norm
        arch_norm = arch_normal_vector(theta_arch)
        dot = lx * arch_norm[0] + ly * arch_norm[1]
        dot = max(min(dot, 1.0), -1.0)
        incisal_angle_deg = math.degrees(math.acos(abs(dot)))

    # Use incisal method if available, PCA as fallback
    if incisal_angle_deg is not None and incisal_angle_deg <= 60:
        angle = incisal_angle_deg
        method = "incisal"
    elif pca_angle_deg <= 60:
        angle = pca_angle_deg
        method = "pca"
    else:
        angle = pca_angle_deg
        method = "pca_high"

    return {
        "angle_deg": round(angle, 1),
        "is_rotated": angle > ROTATION_THRESHOLD_DEG and angle <= 60,
        "method": method,
        "pca_angle": round(pca_angle_deg, 1),
        "incisal_angle": round(incisal_angle_deg, 1) if incisal_angle_deg is not None else None,
        "centroid": [float(centroid[0]), float(centroid[1])],
        "class_name": tooth.get("class_name", ""),
    }


# ── Treatment Recommendation ─────────────────────────────────────────

def rotation_recommendation(rotated_count: int) -> dict:
    """Recommend treatment based on number of rotated teeth."""
    if rotated_count == 0:
        return {
            "category": "NoTreatment",
            "severity": "none",
            "description": "No rotated teeth detected. Arch alignment is normal.",
            "hardware": [],
        }
    elif 1 <= rotated_count <= 2:
        return {
            "category": "DirectTreatment",
            "severity": "mild",
            "description": f"{rotated_count} rotated tooth/teeth. Can be treated with direct orthodontic approach.",
            "hardware": [
                {"device": "clear_aligner", "reason": "Mild rotation correction"},
                {"device": "bracket", "subtype": "single bracket + elastic", "reason": "Derotation"},
            ],
        }
    elif 3 <= rotated_count <= 5:
        return {
            "category": "Contraindication",
            "severity": "moderate",
            "description": f"{rotated_count} rotated teeth. Complex orthodontic treatment needed.",
            "hardware": [
                {"device": "bracket", "subtype": "full fixed brackets", "reason": "Multiple derotations required"},
                {"device": "archwire", "subtype": "NiTi round wire", "reason": "Initial alignment"},
                {"device": "elastic", "subtype": "rotation wedges", "reason": "Active derotation force"},
            ],
        }
    else:
        return {
            "category": "NeedsToReferOut",
            "severity": "severe",
            "description": f"{rotated_count} rotated teeth. Specialist referral recommended.",
            "hardware": [
                {"device": "bracket", "subtype": "full fixed brackets", "reason": "Comprehensive treatment"},
                {"device": "tad_miniscrew", "subtype": "TADs for anchorage", "reason": "Complex mechanics may be needed"},
            ],
        }


# ── Main Analysis Function ───────────────────────────────────────────

def analyze_rotations(
    teeth_data: List[dict],
    class_names: Optional[Dict[int, str]] = None,
) -> dict:
    """Analyze tooth rotations from YOLO+SAM detection results.

    Args:
        teeth_data: List of dicts with 'contour', 'centroid', 'class_name' keys.
                    contour: np.ndarray shape (N, 2)
                    centroid: np.ndarray shape (2,)
                    class_name: str (e.g. 'canL', 'canR', 'm1', etc.)

    Returns:
        Complete rotation analysis with per-tooth angles and treatment recommendation.
    """
    if len(teeth_data) < 3:
        return {
            "status": "insufficient_teeth",
            "message": f"Need at least 3 teeth, found {len(teeth_data)}",
            "rotated_count": 0,
            "teeth": [],
            "recommendation": rotation_recommendation(0),
        }

    # Sort teeth by x-centroid (left to right)
    sorted_teeth = sorted(teeth_data, key=lambda t: t["centroid"][0])

    # Find canines to define the anterior region
    idx_canL = next((i for i, t in enumerate(sorted_teeth) if t["class_name"] == "canL"), None)
    idx_canR = next((i for i, t in enumerate(sorted_teeth) if t["class_name"] == "canR"), None)

    if idx_canL is not None and idx_canR is not None:
        start_idx = min(idx_canL, idx_canR)
        end_idx = max(idx_canL, idx_canR) + 1
        central_teeth = sorted_teeth[start_idx + 1:end_idx - 1]
    else:
        mid = len(sorted_teeth) // 2
        half_window = FRONT_MAX_TEETH // 2
        start = max(0, mid - half_window)
        end = min(len(sorted_teeth), start + FRONT_MAX_TEETH)
        central_teeth = sorted_teeth[start + 1:end - 1]

    if len(central_teeth) < 3:
        central_teeth = sorted_teeth

    # Fit arch polynomial
    coeffs = fit_polynomial_arch(central_teeth, POLY_DEGREE)
    if coeffs is None:
        return {
            "status": "arch_fit_failed",
            "message": "Could not fit arch polynomial — insufficient teeth data",
            "rotated_count": 0,
            "teeth": [],
            "recommendation": rotation_recommendation(0),
        }

    # Compute rotation for each central tooth
    tooth_results = []
    rotated_count = 0

    for tooth in central_teeth:
        result = compute_tooth_rotation(tooth, coeffs)
        tooth_results.append(result)
        if result["is_rotated"]:
            rotated_count += 1

    recommendation = rotation_recommendation(rotated_count)

    return {
        "status": "ok",
        "total_teeth_analyzed": len(central_teeth),
        "rotated_count": rotated_count,
        "rotation_threshold_deg": ROTATION_THRESHOLD_DEG,
        "arch_polynomial_degree": POLY_DEGREE,
        "arch_coefficients": [float(c) for c in coeffs],
        "teeth": tooth_results,
        "recommendation": recommendation,
    }
