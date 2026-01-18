"""Time-in-zone tracking using Supervision and YOLO.

This module implements Roboflow-style time-in-zone tracking:
- YOLO detection per frame
- ByteTrack for object tracking
- FPSBasedTimer for timing objects in each zone
- Optional annotated video output with zone polygons and time labels
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Union

import cv2
import numpy as np
import supervision as sv
from ultralytics import YOLO

from .zones import load_polygons


@dataclass
class FPSBasedTimer:
    """
    Timer that tracks how long each tracker_id has been detected.
    
    Based on frame count and FPS to compute time in seconds.
    """
    fps: float
    _frame_counts: Dict[int, int] = field(default_factory=dict)
    _active_ids: Set[int] = field(default_factory=set)
    
    def tick(self, detections: sv.Detections) -> Dict[int, float]:
        """
        Update timers for detections in the current frame.
        
        Args:
            detections: Detections that are currently in the zone.
            
        Returns:
            Dict mapping tracker_id to time in seconds.
        """
        current_ids = set()
        times = {}
        
        if detections.tracker_id is not None:
            for tid in detections.tracker_id:
                if tid is None:
                    continue
                tid = int(tid)
                current_ids.add(tid)
                
                # Increment frame count for this tracker
                self._frame_counts[tid] = self._frame_counts.get(tid, 0) + 1
                
                # Convert to seconds
                times[tid] = self._frame_counts[tid] / self.fps
        
        # Track which IDs are currently active
        self._active_ids = current_ids
        
        return times
    
    def get_time(self, tracker_id: int) -> float:
        """Get accumulated time for a tracker_id."""
        return self._frame_counts.get(tracker_id, 0) / self.fps
    
    def get_all_times(self) -> Dict[int, float]:
        """Get all accumulated times."""
        return {tid: count / self.fps for tid, count in self._frame_counts.items()}
    
    def reset(self, tracker_id: Optional[int] = None) -> None:
        """Reset timer for a specific tracker or all trackers."""
        if tracker_id is not None:
            self._frame_counts.pop(tracker_id, None)
        else:
            self._frame_counts.clear()
            self._active_ids.clear()


@dataclass
class ZoneSummary:
    """Summary statistics for a single zone."""
    zone_id: int
    zone_name: str
    active_tracker_ids: List[int]
    tracker_times: Dict[int, float]
    max_time_sec: float
    total_unique_trackers: int


@dataclass
class TimeInZoneResult:
    """Result of time-in-zone analysis."""
    zones: List[ZoneSummary]
    total_frames: int
    fps: float
    output_path: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "zones": [
                {
                    "zone_id": z.zone_id,
                    "zone_name": z.zone_name,
                    "active_trackers": z.active_tracker_ids,
                    "tracker_times": {str(k): round(v, 2) for k, v in z.tracker_times.items()},
                    "max_time_sec": round(z.max_time_sec, 2),
                    "total_unique_trackers": z.total_unique_trackers,
                }
                for z in self.zones
            ],
            "total_frames": self.total_frames,
            "fps": self.fps,
            "output_path": self.output_path,
        }


def load_zone_names(zone_configuration_path: Union[str, Path]) -> List[str]:
    """Load zone names from configuration file."""
    with open(zone_configuration_path, "r") as f:
        config = json.load(f)
    
    names = []
    for i, zone in enumerate(config.get("zones", [])):
        names.append(zone.get("name", f"zone_{i}"))
    return names


def format_time_label(tracker_id: int, seconds: float) -> str:
    """Format time label as '#ID MM:SS'."""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"#{tracker_id} {minutes:02d}:{secs:02d}"


def run_time_in_zone(
    video_path: Union[str, Path],
    zone_config_path: Union[str, Path],
    model_path: Union[str, Path],
    conf_threshold: float = 0.5,
    iou_threshold: float = 0.5,
    classes: Optional[List[int]] = None,
    write_output_video: bool = True,
    output_path: Optional[Union[str, Path]] = None,
    target_size: Optional[Tuple[int, int]] = None,
    max_frames: Optional[int] = None,
) -> TimeInZoneResult:
    """
    Run time-in-zone analysis on a video.
    
    This function:
    - Loads polygon zones from JSON config
    - Runs YOLO inference per frame
    - Tracks objects using ByteTrack
    - Times how long each tracked object stays in each zone
    - Optionally writes annotated output video
    
    Args:
        video_path: Path to input video.
        zone_config_path: Path to zone configuration JSON.
        model_path: Path to YOLO model weights.
        conf_threshold: Confidence threshold for detections.
        iou_threshold: IoU threshold for NMS.
        classes: Optional list of class IDs to filter. If None or empty, all classes.
        write_output_video: Whether to write annotated output video.
        output_path: Path for output video. Required if write_output_video=True.
        target_size: Optional (width, height) to resize frames.
        max_frames: Optional max frames to process (for testing).
        
    Returns:
        TimeInZoneResult with zone summaries and statistics.
    """
    video_path = Path(video_path)
    zone_config_path = Path(zone_config_path)
    model_path = Path(model_path)
    
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")
    if not zone_config_path.exists():
        raise FileNotFoundError(f"Zone config not found: {zone_config_path}")
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    
    if write_output_video and output_path is None:
        raise ValueError("output_path required when write_output_video=True")
    
    # Load zones
    polygons = load_polygons(zone_config_path)
    zone_names = load_zone_names(zone_config_path)
    
    print(f"Loaded {len(polygons)} zones: {zone_names}")
    
    # Open video
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if target_size:
        frame_width, frame_height = target_size
    else:
        frame_width, frame_height = original_width, original_height
    
    print(f"Video: {original_width}x{original_height} @ {fps:.1f}fps, {total_frames} frames")
    if target_size:
        print(f"Resizing to: {frame_width}x{frame_height}")
    
    # Initialize YOLO model
    print(f"Loading YOLO model: {model_path}")
    model = YOLO(str(model_path))
    
    # Initialize tracker
    tracker = sv.ByteTrack(
        track_activation_threshold=0.25,
        lost_track_buffer=30,
        minimum_matching_threshold=0.8,
        frame_rate=int(fps),
    )
    
    # Create PolygonZones
    zones = [sv.PolygonZone(polygon=poly) for poly in polygons]
    
    # Create timers for each zone
    timers = [FPSBasedTimer(fps=fps) for _ in zones]
    
    # Define colors for zones
    zone_colors = [
        sv.Color(255, 100, 100),   # Light blue
        sv.Color(100, 255, 100),   # Light green
        sv.Color(100, 100, 255),   # Light red
        sv.Color(255, 255, 100),   # Cyan
        sv.Color(255, 100, 255),   # Magenta
        sv.Color(100, 255, 255),   # Yellow
    ]
    
    # Setup annotators
    box_annotator = sv.BoxAnnotator(
        thickness=2,
    )
    label_annotator = sv.LabelAnnotator(
        text_scale=0.5,
        text_thickness=1,
        text_padding=5,
    )
    
    # Setup video writer
    out = None
    if write_output_video:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(
            str(output_path),
            fourcc,
            fps,
            (frame_width, frame_height),
        )
        if not out.isOpened():
            raise RuntimeError(f"Could not create output video: {output_path}")
    
    # Process frames
    frames_processed = 0
    frames_to_process = total_frames
    if max_frames:
        frames_to_process = min(max_frames, total_frames)
    
    print(f"\nProcessing {frames_to_process} frames...")
    
    try:
        while frames_processed < frames_to_process:
            ok, frame = cap.read()
            if not ok:
                break
            
            # Resize if needed
            if target_size:
                frame = cv2.resize(frame, target_size)
            
            # Run YOLO inference
            results = model(
                frame,
                verbose=False,
                conf=conf_threshold,
                iou=iou_threshold,
            )[0]
            
            # Convert to supervision Detections
            detections = sv.Detections.from_ultralytics(results)
            
            # Filter by classes if specified
            if classes and len(classes) > 0 and len(detections) > 0:
                class_mask = np.isin(detections.class_id, classes)
                detections = detections[class_mask]
            
            # Update tracker
            detections = tracker.update_with_detections(detections)
            
            # Annotate frame
            annotated_frame = frame.copy()
            
            # Draw boxes
            annotated_frame = box_annotator.annotate(
                scene=annotated_frame,
                detections=detections,
            )
            
            # Process each zone
            for zone_idx, (zone, timer) in enumerate(zip(zones, timers)):
                color = zone_colors[zone_idx % len(zone_colors)]
                
                # Draw zone polygon
                cv2.polylines(
                    annotated_frame,
                    [polygons[zone_idx]],
                    isClosed=True,
                    color=(color.b, color.g, color.r),
                    thickness=2,
                )
                
                # Add zone name label
                zone_name = zone_names[zone_idx] if zone_idx < len(zone_names) else f"Zone {zone_idx}"
                centroid = polygons[zone_idx].mean(axis=0).astype(int)
                cv2.putText(
                    annotated_frame,
                    zone_name,
                    (centroid[0] - 30, centroid[1] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (color.b, color.g, color.r),
                    2,
                )
                
                # Get detections in this zone
                zone_mask = zone.trigger(detections)
                detections_in_zone = detections[zone_mask]
                
                # Update timer for detections in zone
                time_in_zone = timer.tick(detections_in_zone)
                
                # Draw time labels for detections in zone
                if len(detections_in_zone) > 0 and detections_in_zone.tracker_id is not None:
                    labels = []
                    for tid in detections_in_zone.tracker_id:
                        if tid is not None:
                            tid = int(tid)
                            time_sec = timer.get_time(tid)
                            labels.append(format_time_label(tid, time_sec))
                        else:
                            labels.append("")
                    
                    annotated_frame = label_annotator.annotate(
                        scene=annotated_frame,
                        detections=detections_in_zone,
                        labels=labels,
                    )
            
            # Write frame
            if out:
                out.write(annotated_frame)
            
            frames_processed += 1
            
            if frames_processed % 30 == 0:
                print(f"  Processed {frames_processed}/{frames_to_process} frames")
    
    finally:
        cap.release()
        if out:
            out.release()
    
    print(f"\nDone! Processed {frames_processed} frames")
    
    # Build result summary
    zone_summaries = []
    for zone_idx, (zone, timer, name) in enumerate(zip(zones, timers, zone_names)):
        all_times = timer.get_all_times()
        active_ids = list(timer._active_ids)
        max_time = max(all_times.values()) if all_times else 0.0
        
        zone_summaries.append(ZoneSummary(
            zone_id=zone_idx,
            zone_name=name,
            active_tracker_ids=active_ids,
            tracker_times=all_times,
            max_time_sec=max_time,
            total_unique_trackers=len(all_times),
        ))
    
    result = TimeInZoneResult(
        zones=zone_summaries,
        total_frames=frames_processed,
        fps=fps,
        output_path=str(output_path) if output_path else None,
    )
    
    # Print summary
    print("\n=== Zone Summary ===")
    for z in zone_summaries:
        print(f"  {z.zone_name}: {z.total_unique_trackers} unique trackers, max time {z.max_time_sec:.2f}s")
    
    if write_output_video and output_path:
        output_path = Path(output_path)
        if output_path.exists():
            size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"\nOutput saved to: {output_path} ({size_mb:.2f} MB)")
    
    return result

