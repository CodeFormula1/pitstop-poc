"""Zone configuration loading and drawing utilities.

This module provides functions to:
- Load polygon zones from a JSON configuration file
- Draw zones onto video frames using supervision
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List, Union

import numpy as np
import supervision as sv


def load_polygons(zone_configuration_path: Union[str, Path]) -> List[np.ndarray]:
    """
    Load polygon zones from a JSON configuration file.
    
    Expected JSON format:
    {
        "zones": [
            {
                "name": "zone_name",
                "points": [[x1, y1], [x2, y2], [x3, y3], ...]
            },
            ...
        ]
    }
    
    Args:
        zone_configuration_path: Path to the JSON configuration file.
        
    Returns:
        List of numpy arrays, each containing polygon vertices as (N, 2) arrays.
        
    Raises:
        FileNotFoundError: If the configuration file doesn't exist.
        ValueError: If the JSON format is invalid.
    """
    config_path = Path(zone_configuration_path)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Zone configuration not found: {config_path}")
    
    with open(config_path, "r") as f:
        config = json.load(f)
    
    if "zones" not in config:
        raise ValueError("Zone configuration must contain a 'zones' key")
    
    polygons = []
    for zone in config["zones"]:
        if "points" not in zone:
            raise ValueError(f"Zone must contain 'points': {zone}")
        
        points = np.array(zone["points"], dtype=np.int32)
        if points.ndim != 2 or points.shape[1] != 2:
            raise ValueError(f"Points must be Nx2 array, got shape {points.shape}")
        
        polygons.append(points)
    
    return polygons


def draw_zones(frame: np.ndarray, polygons: List[np.ndarray]) -> np.ndarray:
    """
    Draw polygon zones onto a frame using supervision.
    
    Args:
        frame: Input frame as numpy array (H, W, C) in BGR format.
        polygons: List of polygon vertices as numpy arrays.
        
    Returns:
        Frame with zones drawn as semi-transparent overlays with borders.
    """
    if not polygons:
        return frame
    
    # Create a copy to avoid modifying the original
    annotated_frame = frame.copy()
    
    # Define colors for different zones (BGR format)
    zone_colors = [
        sv.Color(255, 0, 0),    # Blue
        sv.Color(0, 255, 0),    # Green  
        sv.Color(0, 0, 255),    # Red
        sv.Color(255, 255, 0),  # Cyan
        sv.Color(255, 0, 255),  # Magenta
        sv.Color(0, 255, 255),  # Yellow
    ]
    
    for i, polygon in enumerate(polygons):
        color = zone_colors[i % len(zone_colors)]
        
        # Create a PolygonZone for this polygon
        zone = sv.PolygonZone(polygon=polygon)
        
        # Create zone annotator
        zone_annotator = sv.PolygonZoneAnnotator(
            zone=zone,
            color=color,
            thickness=2,
            text_thickness=1,
            text_scale=0.5,
        )
        
        # Annotate the frame
        annotated_frame = zone_annotator.annotate(scene=annotated_frame)
    
    return annotated_frame

