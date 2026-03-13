"""Drift Monitor — visualizes YOLO boundary evolution across iterations.

Generates drift_report.png containing:
1. Line chart: Mean S_final and Mean IoU vs iteration
2. Bar chart: Tier distribution (Platinum/Gold/Silver/Reject) for latest batch
3. Scatter plot: YOLO confidence vs SAM2 stability (overconfident failure detection)
4. Modality gap chart: IoU gap (1 - IoU) per modality per iteration

Also provides JSON-serializable data for the web dashboard.
"""

import json
from dataclasses import asdict
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False


def load_factory_history(path: str = "runs/factory_history.json") -> List[dict]:
    """Load iteration history from disk."""
    p = Path(path)
    if not p.exists():
        return []
    with open(p) as f:
        return json.load(f)


def generate_drift_report(
    history: Optional[List[dict]] = None,
    output_path: str = "runs/drift_report.png",
) -> str:
    """Generate the 4-panel drift report image.

    Args:
        history: List of IterationResult dicts. Loaded from disk if None.
        output_path: Where to save the PNG.

    Returns:
        Path to saved image.
    """
    if not HAS_MATPLOTLIB:
        raise ImportError("matplotlib required for drift_report. pip install matplotlib")

    if history is None:
        history = load_factory_history()

    if not history:
        raise ValueError("No iteration history to plot")

    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle("YOLO-SAM2 Self-Evolution Drift Report", fontsize=16, fontweight="bold")
    fig.patch.set_facecolor("#1a1a2e")

    for ax in axes.flat:
        ax.set_facecolor("#16213e")
        ax.tick_params(colors="white")
        ax.xaxis.label.set_color("white")
        ax.yaxis.label.set_color("white")
        ax.title.set_color("white")
        for spine in ax.spines.values():
            spine.set_color("#333")

    # --- Panel 1: Score & IoU trend ---
    ax1 = axes[0, 0]
    iters = [h["iteration"] for h in history]
    scores = [h["mean_final_score"] for h in history]
    ious = [h["mean_iou"] for h in history]
    drifts = [h["mean_drift_px"] for h in history]

    ax1.plot(iters, scores, "o-", color="#00d4aa", linewidth=2, label="Mean S_final", markersize=6)
    ax1.plot(iters, ious, "s-", color="#4dabf7", linewidth=2, label="Mean IoU", markersize=6)
    ax1.set_xlabel("Iteration")
    ax1.set_ylabel("Score")
    ax1.set_title("Confidence & IoU Trend")
    ax1.legend(facecolor="#16213e", edgecolor="#333", labelcolor="white")
    ax1.set_ylim(0, 1.05)
    ax1.grid(True, alpha=0.2)

    # --- Panel 2: Tier distribution (latest) ---
    ax2 = axes[0, 1]
    latest = history[-1]
    tiers = ["PLATINUM", "GOLD", "SILVER", "REJECT"]
    counts = [latest["platinum_count"], latest["gold_count"], latest["silver_count"], latest["reject_count"]]
    colors = ["#e0aaff", "#ffd700", "#c0c0c0", "#ff6b6b"]
    bars = ax2.bar(tiers, counts, color=colors, edgecolor="#333", linewidth=1.5)
    ax2.set_title(f"Tier Distribution (Iteration #{latest['iteration']})")
    ax2.set_ylabel("Count")
    for bar, count in zip(bars, counts):
        if count > 0:
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                     str(count), ha="center", va="bottom", color="white", fontweight="bold")

    # --- Panel 3: YOLO conf vs SAM stability scatter ---
    ax3 = axes[1, 0]
    drift_records = latest.get("drift_records", [])
    if drift_records:
        yolo_confs = [d["yolo_confidence"] for d in drift_records]
        sam_scores = [d["sam_score"] for d in drift_records]
        tier_colors_map = {"PLATINUM": "#e0aaff", "GOLD": "#ffd700", "SILVER": "#c0c0c0", "REJECT": "#ff6b6b"}
        scatter_colors = [tier_colors_map.get(d["tier"], "#888") for d in drift_records]

        ax3.scatter(yolo_confs, sam_scores, c=scatter_colors, alpha=0.7, s=30, edgecolors="#333", linewidth=0.5)

        # Highlight overconfident failures (high YOLO, low SAM)
        for d in drift_records:
            if d["yolo_confidence"] > 0.8 and d["sam_score"] < 0.6:
                ax3.annotate("!", (d["yolo_confidence"], d["sam_score"]),
                            color="red", fontsize=14, fontweight="bold", ha="center")

        ax3.axhline(y=0.6, color="#ff6b6b", linestyle="--", alpha=0.5, label="SAM danger zone")
        ax3.axvline(x=0.8, color="#ffa94d", linestyle="--", alpha=0.5, label="YOLO overconfident")
    ax3.set_xlabel("YOLO Confidence")
    ax3.set_ylabel("SAM2 Stability")
    ax3.set_title("Overconfident Failure Detection")
    ax3.set_xlim(0, 1.05)
    ax3.set_ylim(0, 1.05)
    ax3.legend(facecolor="#16213e", edgecolor="#333", labelcolor="white", fontsize=8)
    ax3.grid(True, alpha=0.2)

    # --- Panel 4: Modality IoU gap trend ---
    ax4 = axes[1, 1]
    modalities = set()
    for h in history:
        modalities.update(h.get("modality_breakdown", {}).keys())

    mod_colors = {"bitewing": "#ff6b6b", "intraoral_photo": "#4dabf7", "periapical": "#ffd43b", "unknown": "#888"}
    for mod in sorted(modalities):
        mod_gaps = []
        mod_iters = []
        for h in history:
            mb = h.get("modality_breakdown", {}).get(mod)
            if mb and mb.get("mean_iou", 0) > 0:
                mod_gaps.append(round((1 - mb["mean_iou"]) * 100, 1))
                mod_iters.append(h["iteration"])
        if mod_gaps:
            ax4.plot(mod_iters, mod_gaps, "o-", color=mod_colors.get(mod, "#aaa"),
                     linewidth=2, label=f"{mod} gap", markersize=5)

    ax4.set_xlabel("Iteration")
    ax4.set_ylabel("IoU Gap (%)")
    ax4.set_title("Modality-Specific IoU Gap (lower = better)")
    ax4.legend(facecolor="#16213e", edgecolor="#333", labelcolor="white", fontsize=8)
    ax4.grid(True, alpha=0.2)

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=150, facecolor=fig.get_facecolor())
    plt.close()

    print(f"Drift report saved to: {output_path}")
    return output_path


def get_dashboard_data(history: Optional[List[dict]] = None) -> dict:
    """Generate JSON-serializable data for the web Command Center.

    Returns all metrics the dashboard needs without matplotlib.
    """
    if history is None:
        history = load_factory_history()

    if not history:
        return {"iterations": 0, "trend": [], "latest": None, "modality_gaps": {}, "hard_samples": []}

    latest = history[-1]

    # Trend data for sparklines
    trend = [{
        "iteration": h["iteration"],
        "mean_score": h["mean_final_score"],
        "mean_iou": h["mean_iou"],
        "mean_drift": h["mean_drift_px"],
        "platinum": h["platinum_count"],
        "gold": h["gold_count"],
        "silver": h["silver_count"],
        "reject": h["reject_count"],
    } for h in history]

    # Modality gap analysis
    modality_gaps: Dict[str, List[dict]] = {}
    for h in history:
        for mod, stats in h.get("modality_breakdown", {}).items():
            if mod not in modality_gaps:
                modality_gaps[mod] = []
            iou_gap = round((1 - stats.get("mean_iou", 0)) * 100, 1)
            modality_gaps[mod].append({
                "iteration": h["iteration"],
                "iou_gap_pct": iou_gap,
                "mean_drift": stats.get("mean_drift", 0),
                "images": stats.get("images", 0),
            })

    # Overconfident failures from latest
    overconfident = []
    for d in latest.get("drift_records", []):
        if d.get("yolo_confidence", 0) > 0.8 and d.get("sam_score", 0) < 0.6:
            overconfident.append(d)

    # Clinical guardrail stats (how often rules override classifier)
    guardrail_overrides = 0  # Would be populated from rules layer logs

    return {
        "iterations": len(history),
        "trend": trend,
        "latest": {
            "iteration": latest["iteration"],
            "images": latest["images_processed"],
            "detections": latest["total_detections"],
            "platinum": latest["platinum_count"],
            "gold": latest["gold_count"],
            "silver": latest["silver_count"],
            "reject": latest["reject_count"],
            "mean_score": latest["mean_final_score"],
            "mean_iou": latest["mean_iou"],
            "mean_drift": latest["mean_drift_px"],
            "mean_yolo_conf": latest["mean_yolo_conf"],
            "mean_sam_score": latest["mean_sam_score"],
            "duration": latest["duration_seconds"],
        },
        "modality_gaps": modality_gaps,
        "hard_samples": latest.get("hard_samples", [])[:10],
        "overconfident_failures": overconfident[:10],
        "scatter_data": [{
            "yolo": d.get("yolo_confidence", 0),
            "sam": d.get("sam_score", 0),
            "tier": d.get("tier", ""),
            "class": d.get("class_name", ""),
        } for d in latest.get("drift_records", [])[:200]],
    }
