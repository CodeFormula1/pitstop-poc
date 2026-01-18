"""Test script for zone drawing functionality.

This script:
- Opens a sample video
- Takes the first N frames
- Resizes to standard size (1020x500)
- Draws zones on each frame
- Writes output to outputs/test_zones.mp4
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import cv2
import numpy as np

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.model.zone_timing.zones import load_polygons, draw_zones


# Standard frame size
STANDARD_WIDTH = 1020
STANDARD_HEIGHT = 500


def main() -> None:
    parser = argparse.ArgumentParser(description="Test zone drawing on video")
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
        "--output",
        type=str,
        default="outputs/test_zones.mp4",
        help="Output video path (default: outputs/test_zones.mp4)",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=90,
        help="Number of frames to process (default: 90, ~3 seconds at 30fps)",
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
    
    # Output path
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = backend_dir / output_path
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Input video: {input_path}")
    print(f"Zone config: {zones_path}")
    print(f"Output path: {output_path}")
    print(f"Frames to process: {args.frames}")
    print(f"Target size: {STANDARD_WIDTH}x{STANDARD_HEIGHT}")
    print()

    # Load zone polygons
    print("Loading zone configuration...")
    polygons = load_polygons(zones_path)
    print(f"Loaded {len(polygons)} zones")

    # Open video
    cap = cv2.VideoCapture(str(input_path))
    if not cap.isOpened():
        print(f"ERROR: Could not open video: {input_path}")
        sys.exit(1)

    # Get video properties
    original_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Original video: {original_width}x{original_height} @ {original_fps:.1f}fps, {total_frames} frames")

    # Setup output writer
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(
        str(output_path),
        fourcc,
        original_fps,
        (STANDARD_WIDTH, STANDARD_HEIGHT),
    )
    
    if not out.isOpened():
        print(f"ERROR: Could not create output video: {output_path}")
        cap.release()
        sys.exit(1)

    # Process frames
    frames_processed = 0
    frames_to_process = min(args.frames, total_frames) if total_frames > 0 else args.frames
    
    print(f"\nProcessing {frames_to_process} frames...")
    
    while frames_processed < frames_to_process:
        ok, frame = cap.read()
        if not ok:
            break
        
        # Resize to standard size
        frame_resized = cv2.resize(frame, (STANDARD_WIDTH, STANDARD_HEIGHT))
        
        # Draw zones
        frame_with_zones = draw_zones(frame_resized, polygons)
        
        # Write frame
        out.write(frame_with_zones)
        frames_processed += 1
        
        if frames_processed % 30 == 0:
            print(f"  Processed {frames_processed}/{frames_to_process} frames")

    # Cleanup
    cap.release()
    out.release()

    print(f"\nDone! Processed {frames_processed} frames")
    print(f"Output saved to: {output_path}")
    
    # Verify output
    if output_path.exists():
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"Output file size: {size_mb:.2f} MB")
    else:
        print("WARNING: Output file was not created!")
        sys.exit(1)


if __name__ == "__main__":
    main()

