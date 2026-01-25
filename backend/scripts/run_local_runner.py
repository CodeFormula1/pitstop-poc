#!/usr/bin/env python3
"""
Local sanity test script for the Pitstop YOLO runner.

This script allows running the YOLO video processor directly without the API,
useful for testing and debugging the model independently.

Usage:
    python backend/scripts/run_local_runner.py \
        --input path/to/input.mp4 \
        --output path/to/output.mp4 \
        --weights backend/model_weights/best.pt

Optional:
    --threshold 0.5   Detection confidence threshold (default: 0.5)
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Add the backend app directory to the path so we can import the runner
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Pitstop YOLO inference on a video file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Basic usage
    python backend/scripts/run_local_runner.py \\
        --input video.mp4 \\
        --output annotated_video.mp4 \\
        --weights backend/model_weights/best.pt

    # With custom threshold
    python backend/scripts/run_local_runner.py \\
        --input video.mp4 \\
        --output annotated_video.mp4 \\
        --weights backend/model_weights/best.pt \\
        --threshold 0.7
        """,
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to the input video file",
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Path for the output annotated video file",
    )
    parser.add_argument(
        "--weights", "-w",
        required=True,
        help="Path to the YOLO weights file (best.pt)",
    )
    parser.add_argument(
        "--threshold", "-t",
        type=float,
        default=0.5,
        help="Detection confidence threshold (default: 0.5)",
    )
    
    args = parser.parse_args()
    
    # Validate input file exists
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)
    
    # Validate weights file exists
    if not os.path.exists(args.weights):
        print(f"Error: Weights file not found: {args.weights}")
        print("Please download or place the YOLO weights at the specified path.")
        sys.exit(1)
    
    # Import the runner (after path setup)
    from app.model.pitstop_yolo_runner import PitstopYoloRunner
    
    print("=" * 60)
    print("Pitstop YOLO Runner - Local Test")
    print("=" * 60)
    print(f"Input:     {args.input}")
    print(f"Output:    {args.output}")
    print(f"Weights:   {args.weights}")
    print(f"Threshold: {args.threshold}")
    print("=" * 60)
    print()
    
    def log_cb(msg: str) -> None:
        print(f"[LOG] {msg}")
    
    def progress_cb(p: float) -> None:
        bar_width = 40
        filled = int(bar_width * p)
        bar = "█" * filled + "░" * (bar_width - filled)
        print(f"\r[PROGRESS] [{bar}] {p*100:.1f}%", end="", flush=True)
        if p >= 1.0:
            print()  # Newline at 100%
    
    try:
        print("[INFO] Loading YOLO model...")
        runner = PitstopYoloRunner(
            weights_path=args.weights,
            threshold=args.threshold,
        )
        
        print("[INFO] Starting video processing...")
        print()
        
        result = runner.process_video(
            input_path=args.input,
            output_path=args.output,
            log_cb=log_cb,
            progress_cb=progress_cb,
        )
        
        print()
        print("=" * 60)
        print("Processing Complete!")
        print("=" * 60)
        print(f"Frames processed: {result.frames_processed}")
        print(f"Output saved to:  {result.output_path}")
        
        if os.path.exists(result.output_path):
            size_mb = os.path.getsize(result.output_path) / (1024 * 1024)
            print(f"Output file size: {size_mb:.2f} MB")
        
        print("=" * 60)
        
    except FileNotFoundError as e:
        print(f"\n[ERROR] File not found: {e}")
        sys.exit(1)
    except RuntimeError as e:
        print(f"\n[ERROR] Runtime error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()


