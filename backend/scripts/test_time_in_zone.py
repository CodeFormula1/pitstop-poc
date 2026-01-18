"""Test script for time-in-zone functionality.

This script:
- Runs time-in-zone analysis on a sample video
- Uses the sample zone configuration
- Writes annotated output video with zone polygons and time labels
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.model.zone_timing.time_in_zone import run_time_in_zone


def main() -> None:
    parser = argparse.ArgumentParser(description="Test time-in-zone tracking")
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Input video path. If not provided, uses first video in storage/input/",
    )
    parser.add_argument(
        "--zones",
        type=str,
        default=None,
        help="Zone config JSON path. If not provided, uses sample_zones.json",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="YOLO model path. If not provided, uses model_weights/best.pt",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="outputs/test_time_in_zone.mp4",
        help="Output video path (default: outputs/test_time_in_zone.mp4)",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=150,
        help="Max frames to process (default: 150, ~5 seconds at 30fps)",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.5,
        help="Confidence threshold (default: 0.5)",
    )
    parser.add_argument(
        "--iou",
        type=float,
        default=0.5,
        help="IoU threshold (default: 0.5)",
    )
    parser.add_argument(
        "--resize",
        type=str,
        default="1020x500",
        help="Resize frames to WxH (default: 1020x500, use 'none' to skip)",
    )
    args = parser.parse_args()

    # Resolve paths relative to backend directory
    backend_dir = Path(__file__).resolve().parent.parent
    
    # Find input video
    if args.input:
        input_path = Path(args.input)
        if not input_path.is_absolute():
            input_path = backend_dir / input_path
    else:
        # Find first video in storage/input
        input_dir = backend_dir / "storage" / "input"
        videos = list(input_dir.glob("*.mp4"))
        if not videos:
            print("ERROR: No videos found in storage/input/")
            print("Please provide --input <video_path>")
            sys.exit(1)
        input_path = videos[0]
        print(f"Using video: {input_path.name}")

    # Find zone config
    if args.zones:
        zones_path = Path(args.zones)
        if not zones_path.is_absolute():
            zones_path = backend_dir / zones_path
    else:
        zones_path = backend_dir / "app" / "model" / "zone_timing" / "sample_zones.json"
    
    # Find model
    if args.model:
        model_path = Path(args.model)
        if not model_path.is_absolute():
            model_path = backend_dir / model_path
    else:
        model_path = backend_dir / "model_weights" / "best.pt"
    
    # Output path
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = backend_dir / output_path
    
    # Parse resize
    target_size = None
    if args.resize.lower() != "none":
        try:
            w, h = args.resize.split("x")
            target_size = (int(w), int(h))
        except ValueError:
            print(f"ERROR: Invalid resize format '{args.resize}'. Use WxH or 'none'")
            sys.exit(1)

    print("=" * 60)
    print("Time-in-Zone Test")
    print("=" * 60)
    print(f"Input video: {input_path}")
    print(f"Zone config: {zones_path}")
    print(f"Model: {model_path}")
    print(f"Output path: {output_path}")
    print(f"Max frames: {args.frames}")
    print(f"Confidence: {args.conf}")
    print(f"IoU: {args.iou}")
    print(f"Target size: {target_size}")
    print("=" * 60)
    print()

    # Run time-in-zone analysis
    result = run_time_in_zone(
        video_path=input_path,
        zone_config_path=zones_path,
        model_path=model_path,
        conf_threshold=args.conf,
        iou_threshold=args.iou,
        classes=None,  # Use all classes
        write_output_video=True,
        output_path=output_path,
        target_size=target_size,
        max_frames=args.frames,
    )

    # Print result as JSON
    print("\n=== Result JSON ===")
    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()

