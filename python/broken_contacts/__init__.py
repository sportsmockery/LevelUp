"""Broken Contacts — Relationship-aware dental contact analysis pipeline.

Stage 1: Multi-class YOLO detection/segmentation (9 classes)
         + SAM2 mask refinement via auto-labeling factory
Stage 2: Geometric pair graph builder (distance-minimized surface centroids)
Stage 3: Pair-level classifier + clinical rules adjudication (8 relational classes)
"""

from broken_contacts.config import Config
from broken_contacts.detector import ContactDetector
from broken_contacts.classifier import ContactClassifier
from broken_contacts.pair_graph import PairGraphBuilder
from broken_contacts.rules import RulesLayer
from broken_contacts.inference import BrokenContactsPipeline
from broken_contacts.sam_factory import SAMFactory
from broken_contacts.enhance import enhance_dental_image, pil_to_enhanced

__all__ = [
    "Config",
    "ContactDetector",
    "ContactClassifier",
    "PairGraphBuilder",
    "RulesLayer",
    "BrokenContactsPipeline",
    "SAMFactory",
    "enhance_dental_image",
    "pil_to_enhanced",
]
