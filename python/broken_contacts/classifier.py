"""Stage 2: ResNet18-based contact classifier (normal / open / unclear)."""

from pathlib import Path
from typing import Tuple

import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms, models

from broken_contacts.config import Config


class ContactClassifier:
    """Classifies interproximal contact crops as normal, open, or unclear."""

    def __init__(self, config: Config, device: str = "auto"):
        self.config = config
        if device == "auto":
            if torch.backends.mps.is_available():
                self.device = torch.device("mps")
            elif torch.cuda.is_available():
                self.device = torch.device("cuda")
            else:
                self.device = torch.device("cpu")
        else:
            self.device = torch.device(device)

        model_path = Path(config.classifier_model_path)
        if not model_path.exists():
            raise FileNotFoundError(
                f"Classifier model not found: {model_path}. "
                "Train the classifier first with train_contacts_classifier.py"
            )

        self.model = self._load_model(model_path)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((config.classifier_imgsz, config.classifier_imgsz)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def _load_model(self, model_path: Path) -> nn.Module:
        """Load a trained ResNet18 classifier from checkpoint."""
        model = models.resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, self.config.num_classifier_classes)

        checkpoint = torch.load(str(model_path), map_location=self.device, weights_only=True)
        if "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
        else:
            model.load_state_dict(checkpoint)

        model.to(self.device)
        return model

    def predict(self, crop: Image.Image) -> Tuple[str, float]:
        """Classify a single contact crop.

        Args:
            crop: PIL image of the interproximal contact region.

        Returns:
            Tuple of (class_label, confidence).
        """
        tensor = self.transform(crop).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1)
            conf, pred_idx = torch.max(probs, dim=1)

        label = self.config.classifier_classes[pred_idx.item()]
        confidence = round(conf.item(), 4)
        return label, confidence

    def predict_batch(self, crops: list[Image.Image]) -> list[Tuple[str, float]]:
        """Classify a batch of contact crops.

        Args:
            crops: List of PIL images.

        Returns:
            List of (class_label, confidence) tuples.
        """
        if not crops:
            return []

        tensors = torch.stack([self.transform(c) for c in crops]).to(self.device)

        with torch.no_grad():
            logits = self.model(tensors)
            probs = torch.softmax(logits, dim=1)
            confs, pred_idxs = torch.max(probs, dim=1)

        results = []
        for conf, idx in zip(confs, pred_idxs):
            label = self.config.classifier_classes[idx.item()]
            results.append((label, round(conf.item(), 4)))
        return results


def build_classifier_model(num_classes: int, pretrained: bool = True) -> nn.Module:
    """Build a ResNet18 classifier for training.

    Args:
        num_classes: Number of output classes.
        pretrained: Whether to use ImageNet pretrained weights.

    Returns:
        ResNet18 model with modified final layer.
    """
    weights = models.ResNet18_Weights.DEFAULT if pretrained else None
    model = models.resnet18(weights=weights)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model
