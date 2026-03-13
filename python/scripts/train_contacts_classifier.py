"""Train the ResNet18 contact classifier.

Expects an ImageFolder-style dataset:
    data_dir/
        train/
            normal_contact/
            open_contact/
            unclear_contact/
        val/
            normal_contact/
            open_contact/
            unclear_contact/

Usage:
    python scripts/train_contacts_classifier.py --data dataset_contacts_classifier
    python scripts/train_contacts_classifier.py --data dataset_contacts_classifier --epochs 50 --batch 32
"""

import argparse
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from broken_contacts.classifier import build_classifier_model
from broken_contacts.config import Config
from broken_contacts.utils import ensure_dir


def main():
    parser = argparse.ArgumentParser(description="Train contact classifier")
    parser.add_argument("--data", type=str, required=True, help="Dataset root (with train/ and val/ subdirs)")
    parser.add_argument("--epochs", type=int, default=25, help="Training epochs (default: 25)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (default: 16)")
    parser.add_argument("--imgsz", type=int, default=224, help="Image size (default: 224)")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate (default: 0.001)")
    parser.add_argument("--name", type=str, default="contacts_classifier_v1", help="Run name")
    parser.add_argument("--resume", type=str, default=None, help="Resume from checkpoint")
    args = parser.parse_args()

    data_root = Path(args.data)
    train_dir = data_root / "train"
    val_dir = data_root / "val"

    if not train_dir.is_dir():
        raise NotADirectoryError(f"Training directory not found: {train_dir}")
    if not val_dir.is_dir():
        raise NotADirectoryError(f"Validation directory not found: {val_dir}")

    # Device
    if torch.backends.mps.is_available():
        device = torch.device("mps")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")
    print(f"Using device: {device}")

    # Transforms
    train_transform = transforms.Compose([
        transforms.Resize((args.imgsz, args.imgsz)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((args.imgsz, args.imgsz)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    train_dataset = datasets.ImageFolder(str(train_dir), transform=train_transform)
    val_dataset = datasets.ImageFolder(str(val_dir), transform=val_transform)

    print(f"Training samples: {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")
    print(f"Classes: {train_dataset.classes}")

    config = Config()
    num_classes = len(train_dataset.classes)
    if num_classes != config.num_classifier_classes:
        print(f"Warning: found {num_classes} classes, config expects {config.num_classifier_classes}")

    train_loader = DataLoader(train_dataset, batch_size=args.batch, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=args.batch, shuffle=False, num_workers=2)

    # Model
    model = build_classifier_model(num_classes=num_classes, pretrained=True)
    model.to(device)

    start_epoch = 0
    if args.resume:
        checkpoint = torch.load(args.resume, map_location=device, weights_only=True)
        model.load_state_dict(checkpoint["model_state_dict"])
        start_epoch = checkpoint.get("epoch", 0)
        print(f"Resumed from epoch {start_epoch}")

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.5)

    # Output directory
    run_dir = ensure_dir(Path("runs/classify") / args.name)
    best_val_acc = 0.0

    for epoch in range(start_epoch, args.epochs):
        # Train
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs, 1)
            train_correct += (predicted == labels).sum().item()
            train_total += labels.size(0)

        scheduler.step()
        train_acc = train_correct / train_total if train_total > 0 else 0

        # Validate
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, predicted = torch.max(outputs, 1)
                val_correct += (predicted == labels).sum().item()
                val_total += labels.size(0)

        val_acc = val_correct / val_total if val_total > 0 else 0

        print(
            f"Epoch {epoch + 1}/{args.epochs} | "
            f"Train Loss: {train_loss / train_total:.4f} Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss / val_total:.4f} Acc: {val_acc:.4f}"
        )

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_path = run_dir / "best.pt"
            torch.save({
                "epoch": epoch + 1,
                "model_state_dict": model.state_dict(),
                "val_acc": val_acc,
                "classes": train_dataset.classes,
            }, str(best_path))
            print(f"  -> New best model saved (val_acc={val_acc:.4f})")

        # Save periodic checkpoint
        if (epoch + 1) % 5 == 0:
            ckpt_path = run_dir / f"epoch_{epoch + 1}.pt"
            torch.save({
                "epoch": epoch + 1,
                "model_state_dict": model.state_dict(),
                "val_acc": val_acc,
                "classes": train_dataset.classes,
            }, str(ckpt_path))

    # Save final model
    final_path = run_dir / "last.pt"
    torch.save({
        "epoch": args.epochs,
        "model_state_dict": model.state_dict(),
        "val_acc": val_acc,
        "classes": train_dataset.classes,
    }, str(final_path))

    print(f"\nTraining complete.")
    print(f"Best val accuracy: {best_val_acc:.4f}")
    print(f"Best model: {run_dir / 'best.pt'}")
    print(f"Last model: {final_path}")


if __name__ == "__main__":
    main()
