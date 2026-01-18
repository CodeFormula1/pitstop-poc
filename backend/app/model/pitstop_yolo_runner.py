"""CodeFx Pitstop: YOLO video runner (local).

This module supports two processing modes:
- MODE=classic: Original bbox annotate (YOLO inference + bounding boxes)
- MODE=time_in_zone: Supervision-based tracking with zone timing

Both modes:
- Load a YOLO model (Ultralytics)
- Read an input video with OpenCV
- Run inference per frame
- Write an output MP4
- Transcode to browser-compatible H.264 using ffmpeg

Swap LocalStorage -> S3 later by changing the caller; this runner only needs file paths.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple, Any

import cv2
from ultralytics import YOLO

from app.utils.video_transcode import (
    ensure_browser_mp4,
    cleanup_temp_file,
)

LogCB = Optional[Callable[[str], None]]
ProgressCB = Optional[Callable[[float], None]]


class ProcessingMode(str, Enum):
    """Processing mode for the pitstop runner."""
    CLASSIC = "classic"
    TIME_IN_ZONE = "time_in_zone"


@dataclass
class RunResult:
    output_path: str
    frames_processed: int
    mode: str = "classic"
    zone_summary: Optional[Dict[str, Any]] = None


class PitstopYoloRunner:
    """Loads YOLO weights once and can process videos multiple times."""

    def __init__(
        self,
        weights_path: str,
        threshold: float = 0.5,
        mode: str = "classic",
        zone_config_path: Optional[str] = None,
        iou_threshold: float = 0.5,
        target_size: Optional[Tuple[int, int]] = None,
    ):
        if not os.path.exists(weights_path):
            raise FileNotFoundError(
                f"YOLO weights not found at: {weights_path}. "
                "Place best.pt there or update the path."
            )
        self.weights_path = weights_path
        self.threshold = float(threshold)
        self.iou_threshold = float(iou_threshold)
        self.mode = ProcessingMode(mode.lower())
        self.zone_config_path = zone_config_path
        self.target_size = target_size
        
        # Only load model for classic mode (time_in_zone loads its own)
        if self.mode == ProcessingMode.CLASSIC:
            self._model = YOLO(weights_path)
        else:
            self._model = None
        
        # Validate zone config for time_in_zone mode
        if self.mode == ProcessingMode.TIME_IN_ZONE:
            if not zone_config_path:
                raise ValueError("zone_config_path required for time_in_zone mode")
            if not os.path.exists(zone_config_path):
                raise FileNotFoundError(f"Zone config not found: {zone_config_path}")

    def process_video(
        self,
        input_path: str,
        output_path: str,
        log_cb: LogCB = None,
        progress_cb: ProgressCB = None,
        class_name_map: Optional[dict[int, str]] = None,
    ) -> RunResult:
        """
        Run video processing based on configured mode.
        
        The output is transcoded to browser-compatible H.264 using ffmpeg.
        """
        def log(msg: str) -> None:
            """Safe logging wrapper."""
            if log_cb:
                try:
                    log_cb(msg)
                except Exception:
                    pass

        log(f"Processing mode: {self.mode.value}")
        
        if self.mode == ProcessingMode.TIME_IN_ZONE:
            return self._process_time_in_zone(
                input_path, output_path, log_cb, progress_cb
            )
        else:
            return self._process_classic(
                input_path, output_path, log_cb, progress_cb, class_name_map
            )

    def _process_time_in_zone(
        self,
        input_path: str,
        output_path: str,
        log_cb: LogCB = None,
        progress_cb: ProgressCB = None,
    ) -> RunResult:
        """
        Process video using supervision-based time-in-zone tracking.
        """
        def log(msg: str) -> None:
            """Safe logging wrapper."""
            if log_cb:
                try:
                    log_cb(msg)
                except Exception:
                    pass

        # Import here to avoid circular imports and lazy loading
        from app.model.zone_timing.time_in_zone import run_time_in_zone

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input video not found: {input_path}")

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        # Write to temp file first, then transcode
        temp_output_path = output_path.replace(".mp4", "_raw.mp4")
        if temp_output_path == output_path:
            temp_output_path = output_path + "_raw"

        log(f"MODE: time_in_zone (supervision-based tracking)")
        log(f"Zone config: {os.path.basename(self.zone_config_path)}")
        log(f"Temp output path: {os.path.basename(temp_output_path)}")
        
        if self.target_size:
            log(f"Target size: {self.target_size[0]}x{self.target_size[1]}")

        # Create a progress wrapper that maps to 0-90%
        def zone_progress_cb(pct: float) -> None:
            if progress_cb:
                # Map zone processing progress to 0-90%
                progress_cb(min(0.9, pct * 0.9))

        try:
            # Run time-in-zone analysis
            result = run_time_in_zone(
                video_path=input_path,
                zone_config_path=self.zone_config_path,
                model_path=self.weights_path,
                conf_threshold=self.threshold,
                iou_threshold=self.iou_threshold,
                classes=None,  # Use all classes
                write_output_video=True,
                output_path=temp_output_path,
                target_size=self.target_size,
                max_frames=None,  # Process all frames
            )
            
            frames = result.total_frames
            zone_summary = result.to_dict()
            
            # Log zone statistics
            log(f"Loaded zones: {len(result.zones)}")
            log(f"Frames processed: {frames}")
            
            # Count active tracker IDs across all zones
            all_tracker_ids = set()
            for zone in result.zones:
                all_tracker_ids.update(zone.tracker_times.keys())
            log(f"Tracker IDs active: {len(all_tracker_ids)}")
            
            # Log per-zone summary
            for zone in result.zones:
                log(f"  Zone '{zone.zone_name}': {zone.total_unique_trackers} trackers, max {zone.max_time_sec:.2f}s")

        except Exception as e:
            log(f"Time-in-zone processing error: {type(e).__name__}: {e}")
            cleanup_temp_file(temp_output_path, log_cb=log_cb)
            raise

        # Verify temp file was created
        if not os.path.exists(temp_output_path):
            raise RuntimeError(f"Time-in-zone did not produce temp output file: {temp_output_path}")
        
        temp_size = os.path.getsize(temp_output_path)
        log(f"Temp file created: {temp_size:,} bytes")

        # Transcode to browser-compatible H.264
        log("Finalizing output (H.264 encoding)...")
        
        if progress_cb:
            progress_cb(0.92)

        try:
            ensure_browser_mp4(temp_output_path, output_path, log_cb=log_cb)
            log("Transcoding successful")
        except Exception as e:
            log(f"Transcoding error: {type(e).__name__}: {e}")
            cleanup_temp_file(temp_output_path, log_cb=log_cb)
            raise RuntimeError(f"Video transcoding failed: {e}")

        # Clean up temp file on success
        cleanup_temp_file(temp_output_path, log_cb=log_cb)

        # Verify final output
        if not os.path.exists(output_path):
            raise RuntimeError(f"Final output file not found: {output_path}")

        final_size = os.path.getsize(output_path)
        
        if progress_cb:
            progress_cb(1.0)
        
        log(f"Output ready: {final_size:,} bytes (browser-compatible)")

        return RunResult(
            output_path=output_path,
            frames_processed=frames,
            mode="time_in_zone",
            zone_summary=zone_summary,
        )

    def _process_classic(
        self,
        input_path: str,
        output_path: str,
        log_cb: LogCB = None,
        progress_cb: ProgressCB = None,
        class_name_map: Optional[dict[int, str]] = None,
    ) -> RunResult:
        """
        Original classic mode: YOLO inference with bounding box annotations.
        """
        def log(msg: str) -> None:
            """Safe logging wrapper."""
            if log_cb:
                try:
                    log_cb(msg)
                except Exception:
                    pass

        if class_name_map is None:
            class_name_map = {0: "wheel"}

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input video not found: {input_path}")

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        # Write OpenCV output to a temp file, then transcode
        temp_output_path = output_path.replace(".mp4", "_raw.mp4")
        if temp_output_path == output_path:
            temp_output_path = output_path + "_raw"

        log(f"MODE: classic (bbox annotate)")
        log(f"Temp output path: {os.path.basename(temp_output_path)}")

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open input video: {input_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        if fps <= 1e-6:
            fps = 30.0
            log("FPS not detected; defaulting to 30 FPS")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        if width <= 0 or height <= 0:
            raise RuntimeError("Could not read video dimensions")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(temp_output_path, fourcc, fps, (width, height))
        if not out.isOpened():
            raise RuntimeError(f"Could not open output writer for: {temp_output_path}")

        frames = 0
        try:
            log(f"Starting YOLO inference: {os.path.basename(input_path)}")
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                results = self._model(frame, verbose=False)[0]

                # results.boxes.data: [x1,y1,x2,y2,score,class]
                for row in results.boxes.data.tolist() if results.boxes is not None else []:
                    if len(row) < 6:
                        continue
                    x1, y1, x2, y2, score, class_id = row[:6]
                    if float(score) < self.threshold:
                        continue

                    x1i, y1i, x2i, y2i = map(lambda v: int(max(0, v)), (x1, y1, x2, y2))
                    cls = int(class_id)
                    label = class_name_map.get(cls, f"cls_{cls}")

                    cv2.rectangle(frame, (x1i, y1i), (x2i, y2i), (0, 255, 0), 2)
                    cv2.putText(
                        frame,
                        f"{label} {float(score):.2f}",
                        (x1i, max(0, y1i - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 0),
                        2,
                    )

                out.write(frame)
                frames += 1

                # Progress for YOLO inference: 0-90%
                if progress_cb and total_frames > 0 and frames % 10 == 0:
                    progress_cb(min(0.9, (frames / total_frames) * 0.9))

                if frames % 150 == 0:
                    if total_frames > 0:
                        log(f"Processed {frames}/{total_frames} frames")
                    else:
                        log(f"Processed {frames} frames")

            log(f"YOLO inference complete: {frames} frames")

        finally:
            cap.release()
            out.release()

        # Verify temp file was created
        if not os.path.exists(temp_output_path):
            raise RuntimeError(f"OpenCV did not produce temp output file: {temp_output_path}")
        
        temp_size = os.path.getsize(temp_output_path)
        log(f"Temp file created: {temp_size:,} bytes")

        # Transcode to browser-compatible H.264
        log("Finalizing output (H.264 encoding)...")
        
        if progress_cb:
            progress_cb(0.92)

        try:
            ensure_browser_mp4(temp_output_path, output_path, log_cb=log_cb)
            log("Transcoding successful")
        except Exception as e:
            # Clean up temp file on ANY error
            log(f"Transcoding error: {type(e).__name__}: {e}")
            cleanup_temp_file(temp_output_path, log_cb=log_cb)
            raise RuntimeError(f"Video transcoding failed: {e}")

        # Clean up temp file on success
        cleanup_temp_file(temp_output_path, log_cb=log_cb)

        # Verify final output
        if not os.path.exists(output_path):
            raise RuntimeError(f"Final output file not found: {output_path}")

        final_size = os.path.getsize(output_path)
        
        if progress_cb:
            progress_cb(1.0)
        
        log(f"Output ready: {final_size:,} bytes (browser-compatible)")

        return RunResult(
            output_path=output_path,
            frames_processed=frames,
            mode="classic",
        )


if __name__ == "__main__":
    # Minimal manual test:
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", required=True)
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--threshold", type=float, default=0.5)
    ap.add_argument("--mode", choices=["classic", "time_in_zone"], default="classic")
    ap.add_argument("--zones", help="Zone config path (required for time_in_zone mode)")
    ap.add_argument("--target-size", help="Target size as WxH (e.g., 1020x500)")
    args = ap.parse_args()

    target_size = None
    if args.target_size:
        w, h = args.target_size.split("x")
        target_size = (int(w), int(h))

    runner = PitstopYoloRunner(
        args.weights,
        threshold=args.threshold,
        mode=args.mode,
        zone_config_path=args.zones,
        target_size=target_size,
    )
    result = runner.process_video(
        args.input,
        args.output,
        log_cb=print,
        progress_cb=lambda p: print(f"progress={p:.2f}"),
    )
    print(f"\nResult: {result}")
