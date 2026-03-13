"""
Healthy Start — YOLO Teeth Detection + SAM Segmentation Service
FastAPI server that runs YOLOv12 inference and SAM segmentation for dental image analysis.
"""

import io
import base64
import os
from pathlib import Path
from typing import Optional

# Load .env.local for ROBOFLOW_API_KEY
_env_path = Path(__file__).parent.parent / ".env.local"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _val = _line.split("=", 1)
                os.environ.setdefault(_key.strip(), _val.strip())

import numpy as np
import torch
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from ultralytics import YOLO
from segment_anything import sam_model_registry, SamPredictor

YOLO_MODEL_PATH = Path(__file__).parent / "yolov12s_010826.pt"
SAM_MODEL_PATH = Path(__file__).parent / "sam_vit_b_01ec64.pth"

app = FastAPI(title="Healthy Start Teeth Detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://levelup-wrestling.vercel.app"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

yolo_model = None
sam_predictor = None


def get_yolo():
    global yolo_model
    if yolo_model is None:
        yolo_model = YOLO(str(YOLO_MODEL_PATH))
    return yolo_model


def get_sam():
    global sam_predictor
    if sam_predictor is None:
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        sam = sam_model_registry["vit_b"](checkpoint=str(SAM_MODEL_PATH))
        sam.to(device)
        sam_predictor = SamPredictor(sam)
    return sam_predictor


def image_to_b64(img: Image.Image, fmt: str = "JPEG") -> str:
    buffer = io.BytesIO()
    img.save(buffer, format=fmt, quality=90)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "yolo_loaded": yolo_model is not None,
        "sam_loaded": sam_predictor is not None,
    }


@app.post("/detect")
async def detect_teeth(file: UploadFile = File(...), confidence: float = 0.25):
    """Run YOLO teeth detection on an uploaded image."""
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    yolo = get_yolo()
    results = yolo.predict(source=image, conf=confidence, verbose=False)

    detections = []
    result = results[0]

    for box in result.boxes:
        detections.append({
            "class_id": int(box.cls[0]),
            "class_name": result.names[int(box.cls[0])],
            "confidence": round(float(box.conf[0]), 4),
            "bbox": [round(float(c), 2) for c in box.xyxy[0].tolist()],
        })

    annotated = result.plot()
    pil_annotated = Image.fromarray(annotated)

    return JSONResponse({
        "detections": detections,
        "count": len(detections),
        "image_width": image.width,
        "image_height": image.height,
        "annotated_image": f"data:image/jpeg;base64,{image_to_b64(pil_annotated)}",
    })


@app.post("/segment")
async def segment_teeth(
    file: UploadFile = File(...),
    confidence: float = 0.25,
    use_yolo_boxes: bool = Query(True, description="Use YOLO detections as SAM prompts"),
):
    """Run YOLO detection + SAM segmentation pipeline."""
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image_np = np.array(image)

    # Step 1: YOLO detection
    yolo = get_yolo()
    results = yolo.predict(source=image, conf=confidence, verbose=False)
    result = results[0]

    detections = []
    for box in result.boxes:
        detections.append({
            "class_id": int(box.cls[0]),
            "class_name": result.names[int(box.cls[0])],
            "confidence": round(float(box.conf[0]), 4),
            "bbox": [round(float(c), 2) for c in box.xyxy[0].tolist()],
        })

    # Step 2: SAM segmentation using YOLO bounding boxes as prompts
    predictor = get_sam()
    predictor.set_image(image_np)

    masks_overlay = image_np.copy()
    colors = [
        (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0),
        (255, 0, 255), (0, 255, 255), (128, 255, 0), (255, 128, 0),
    ]

    for i, det in enumerate(detections):
        bbox = np.array(det["bbox"])
        masks, scores, _ = predictor.predict(
            box=bbox,
            multimask_output=True,
        )
        # Use the mask with highest score
        best_mask = masks[np.argmax(scores)]
        color = colors[i % len(colors)]
        for c in range(3):
            masks_overlay[:, :, c] = np.where(
                best_mask,
                masks_overlay[:, :, c] * 0.5 + color[c] * 0.5,
                masks_overlay[:, :, c],
            )
        det["mask_score"] = round(float(scores[np.argmax(scores)]), 4)

    pil_overlay = Image.fromarray(masks_overlay.astype(np.uint8))

    # Also generate YOLO-only annotated image
    yolo_annotated = Image.fromarray(result.plot())

    return JSONResponse({
        "detections": detections,
        "count": len(detections),
        "image_width": image.width,
        "image_height": image.height,
        "annotated_image": f"data:image/jpeg;base64,{image_to_b64(yolo_annotated)}",
        "segmented_image": f"data:image/jpeg;base64,{image_to_b64(pil_overlay)}",
    })


@app.post("/broken-contacts")
async def broken_contacts_endpoint(
    file: UploadFile = File(...),
    confidence: float = 0.3,
    modality: str = Query("intraoral_photo", description="bitewing, intraoral_photo, periapical, other"),
    mm_per_pixel: Optional[float] = Query(None, description="Calibration ratio for mm measurements"),
):
    """Run 3-stage broken contacts pipeline.

    Stage 1: Multi-class YOLO detection (7 classes)
    Stage 2: Geometric pair graph (distance-minimized surface centroids)
    Stage 3: Classifier + clinical rules adjudication

    Requires trained detector and classifier models in runs/ directory.
    """
    from broken_contacts.config import Config as BCConfig
    from broken_contacts.inference import BrokenContactsPipeline
    from broken_contacts.visualize import draw_results

    config = BCConfig()
    config.detector_confidence = confidence

    if not Path(config.detector_model_path).exists():
        return JSONResponse(
            {"error": "Detector model not trained yet. Run train_contacts_detector.py first."},
            status_code=503,
        )
    if not Path(config.classifier_model_path).exists():
        return JSONResponse(
            {"error": "Classifier model not trained yet. Run train_contacts_classifier.py first."},
            status_code=503,
        )

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    pipeline = BrokenContactsPipeline(config, mm_per_pixel=mm_per_pixel)
    result = pipeline.run(
        image_path="<upload>",
        save_crops=False,
        save_visualization=False,
        save_json=False,
        modality=modality,
    )

    # For uploaded files, run directly on the image object
    from broken_contacts.visualize import draw_results as _draw
    stage1 = pipeline.detector.detect(image)

    if not stage1.tooth_boxes:
        return JSONResponse({
            "contacts": [],
            "count": 0,
            "open_contacts": 0,
            "metadata": {"modality": modality},
            "annotated_image": f"data:image/jpeg;base64,{image_to_b64(image)}",
        })

    pairs = pipeline.pair_builder.build_pairs_from_masks(
        image=image,
        tooth_boxes=stage1.tooth_boxes,
        tooth_confs=stage1.tooth_confs,
        distal_masks=stage1.distal_masks,
        mesial_masks=stage1.mesial_masks,
        gap_candidates=stage1.gap_boxes if stage1.gap_boxes else None,
        gap_confs=stage1.gap_confs if stage1.gap_confs else None,
        restoration_boxes=stage1.restoration_boxes if stage1.restoration_boxes else None,
    )

    contacts = []
    if pairs:
        crop_images = [p["crop_image"] for p in pairs if p["crop_image"] is not None]
        predictions = pipeline.classifier.predict_batch(crop_images) if crop_images else []

        from broken_contacts.schemas import (
            ContactPrediction, DetectorConfidences, MorphologyLabel, ClinicalLabel,
        )

        pred_idx = 0
        for pair in pairs:
            if pair["crop_image"] is None:
                continue
            raw_label, raw_conf = predictions[pred_idx]
            pred_idx += 1

            raw_morph = pipeline._classifier_to_morphology(raw_label, raw_conf)
            raw_clin = ClinicalLabel(label=raw_label, confidence=raw_conf)

            geo = pair.get("geometry")
            adjudicated = pipeline.rules.adjudicate(
                morphology=raw_morph,
                raw_clinical=raw_clin,
                has_restoration=pair.get("has_restoration", False),
                gap_candidate_conf=pair.get("contact_gap_conf"),
                contact_distance_px=geo.contact_distance_px if geo else None,
                modality=modality,
            )
            simple_label, simple_conf = pipeline.rules.map_to_simple_label(adjudicated)

            contact = ContactPrediction(
                pair_index=pair["pair_index"],
                left_tooth_box=pair["left_tooth_box"],
                right_tooth_box=pair["right_tooth_box"],
                contact_box=pair["contact_box"],
                morphology=raw_morph,
                clinical=adjudicated,
                classifier_label=simple_label,
                classifier_confidence=simple_conf,
                detector_confidences=DetectorConfidences(
                    left_tooth=pair["left_tooth_conf"],
                    right_tooth=pair["right_tooth_conf"],
                    contact_gap_candidate=pair.get("contact_gap_conf"),
                ),
                geometry=geo,
                pair_type="interproximal",
                left_to_right_index=pair.get("left_to_right_index"),
                has_restoration=pair.get("has_restoration", False),
            )
            contacts.append(contact)

    annotated = _draw(image, contacts, tooth_boxes=stage1.tooth_boxes)

    flagged = sum(
        1 for c in contacts
        if c.clinical.label in ("food_trap_risk", "restoration_failure")
    )

    return JSONResponse({
        "contacts": [c.to_dict() for c in contacts],
        "count": len(contacts),
        "open_contacts": flagged,
        "metadata": {"modality": modality, "mm_per_pixel": mm_per_pixel},
        "annotated_image": f"data:image/jpeg;base64,{image_to_b64(annotated)}",
    })


@app.post("/enhance")
async def enhance_endpoint(file: UploadFile = File(...)):
    """Apply CLAHE + adaptive sharpening to a dental image.

    Returns enhanced image with quality metrics.
    """
    from broken_contacts.enhance import pil_to_enhanced, compute_quality_score

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    enhanced, metrics = pil_to_enhanced(image)
    quality = compute_quality_score(metrics)

    return JSONResponse({
        "quality_score": quality,
        "metrics": metrics,
        "original_image": f"data:image/jpeg;base64,{image_to_b64(image)}",
        "enhanced_image": f"data:image/jpeg;base64,{image_to_b64(enhanced)}",
    })


@app.post("/sam-factory")
async def sam_factory_endpoint(
    file: UploadFile = File(...),
    confidence: float = 0.25,
    enhance_image: bool = Query(True, description="Apply CLAHE/sharpening"),
):
    """Run YOLO -> SAM2 auto-labeling factory on a single image.

    Returns scored masks with GOLD/SILVER/REJECT tiers and contact pairs.
    """
    import cv2
    from broken_contacts.sam_factory import SAMFactory

    yolo_path = str(YOLO_MODEL_PATH)
    sam_path = str(SAM_MODEL_PATH)

    if not Path(yolo_path).exists():
        return JSONResponse({"error": "YOLO model not found"}, status_code=503)
    if not Path(sam_path).exists():
        return JSONResponse({"error": "SAM model not found"}, status_code=503)

    # Save upload to temp file (SAMFactory reads from path)
    import tempfile
    contents = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        factory = SAMFactory(
            yolo_model_path=yolo_path,
            sam_checkpoint_path=sam_path,
            yolo_confidence=confidence,
        )
        result = factory.process_image(tmp_path, enhance=enhance_image)
        factory.cleanup()

        # Generate annotated image with masks overlay
        image = Image.open(tmp_path).convert("RGB")
        img_np = np.array(image)
        overlay = img_np.copy()

        tier_colors = {
            "GOLD": (0, 220, 0),
            "SILVER": (220, 180, 0),
            "REJECT": (180, 0, 0),
        }

        for m in result.masks:
            if m.mask is not None:
                color = tier_colors.get(m.tier, (120, 120, 120))
                for c in range(3):
                    overlay[:, :, c] = np.where(
                        m.mask > 0,
                        overlay[:, :, c] * 0.5 + color[c] * 0.5,
                        overlay[:, :, c],
                    )

        annotated = Image.fromarray(overlay.astype(np.uint8))

        return JSONResponse({
            "quality_score": result.quality_score,
            "detections": result.detections,
            "gold_count": result.gold_count,
            "silver_count": result.silver_count,
            "reject_count": result.reject_count,
            "masks": [m.to_dict() for m in result.masks],
            "contact_pairs": result.contact_pairs,
            "annotated_image": f"data:image/jpeg;base64,{image_to_b64(annotated)}",
        })

    finally:
        import os
        os.unlink(tmp_path)


# =========================================================================
# Scoring Loop Endpoints
# =========================================================================

from broken_contacts.loop import scoring_loop, LoopConfig


@app.post("/loop/start")
async def loop_start(config: dict = {}):
    """Start the continuous scoring loop."""
    lc = LoopConfig(
        source_dir=config.get("source_dir", "data/raw/train/images"),
        interval_seconds=config.get("interval_seconds", 60),
        enable_augmentation=config.get("enable_augmentation", False),
        num_variants=config.get("num_variants", 3),
        modality=config.get("modality", "intraoral_photo"),
        detector_confidence=config.get("detector_confidence", 0.3),
        auto_fetch_datasets=config.get("auto_fetch_datasets", True),
    )
    result = scoring_loop.start(lc)
    return JSONResponse(result)


@app.post("/loop/stop")
async def loop_stop():
    """Stop the continuous scoring loop."""
    result = scoring_loop.stop()
    return JSONResponse(result)


@app.get("/loop/status")
async def loop_status():
    """Get current loop state including all pass history."""
    return JSONResponse(scoring_loop.get_status())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
