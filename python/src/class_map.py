"""Class ID ↔ name mapping and validation for HS dental tooth detection.

Base YOLO model (yolov12s_010826.pt) outputs 9 tooth position classes.
This module is the single source of truth for class definitions used
across inference, cleanup, export, and Roboflow upload.
"""

# Tooth position classes from the base YOLO model
TOOTH_CLASSES = {
    0: "dL",      # Lateral incisor left
    1: "centL",   # Central incisor left
    2: "centR",   # Central incisor right
    3: "dR",      # Lateral incisor right
    4: "canR",    # Canine right
    5: "m3",      # Third molar
    6: "m2",      # Second molar
    7: "canL",    # Canine left
    8: "m1",      # First molar
}

# Reverse lookup: name → ID
TOOTH_NAME_TO_ID = {v: k for k, v in TOOTH_CLASSES.items()}

# Total number of classes
NUM_CLASSES = len(TOOTH_CLASSES)

# Confidence tiers for two-tier labeling strategy
HIGH_CONFIDENCE_THRESHOLD = 0.50   # Auto-suggested, likely correct
LOW_CONFIDENCE_THRESHOLD = 0.10    # Flagged for careful review

# Anterior teeth (between canines) — used for rotation analysis
ANTERIOR_IDS = {0, 1, 2, 3}  # dL, centL, centR, dR
CANINE_IDS = {4, 7}           # canR, canL
MOLAR_IDS = {5, 6, 8}         # m3, m2, m1


def validate_class_id(class_id: int) -> bool:
    """Check if a class ID is valid."""
    return class_id in TOOTH_CLASSES


def class_name(class_id: int) -> str:
    """Get the name for a class ID. Raises ValueError if invalid."""
    if class_id not in TOOTH_CLASSES:
        raise ValueError(f"Invalid class ID {class_id}. Valid: {list(TOOTH_CLASSES.keys())}")
    return TOOTH_CLASSES[class_id]


def confidence_tier(conf: float) -> str:
    """Categorize a confidence value into a tier."""
    if conf >= HIGH_CONFIDENCE_THRESHOLD:
        return "high"
    elif conf >= LOW_CONFIDENCE_THRESHOLD:
        return "low"
    else:
        return "below_threshold"


def data_yaml_content(dataset_path: str) -> str:
    """Generate a YOLO data.yaml string for this class schema."""
    names_block = "\n".join(f"  {k}: {v}" for k, v in TOOTH_CLASSES.items())
    return (
        f"path: {dataset_path}\n"
        f"train: train/images\n"
        f"val: val/images\n"
        f"\n"
        f"nc: {NUM_CLASSES}\n"
        f"names:\n"
        f"{names_block}\n"
    )
