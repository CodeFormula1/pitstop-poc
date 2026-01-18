"""
HTTP Range request utilities for streaming video files.

Supports partial content (206) responses for browser <video> playback.
"""
from __future__ import annotations

import os
import re
from typing import Generator, Optional, Tuple


class RangeNotSatisfiable(Exception):
    """Raised when the Range header cannot be satisfied."""
    pass


def parse_range_header(
    range_header: Optional[str], 
    file_size: int
) -> Tuple[int, int]:
    """
    Parse HTTP Range header and return (start, end) byte positions.
    
    Supports formats:
    - "bytes=0-499" -> (0, 499)
    - "bytes=500-" -> (500, file_size-1)
    - "bytes=-500" -> (file_size-500, file_size-1)
    
    Args:
        range_header: The Range header value (e.g., "bytes=0-1000")
        file_size: Total size of the file in bytes
        
    Returns:
        Tuple of (start, end) byte positions (inclusive)
        
    Raises:
        RangeNotSatisfiable: If the range is invalid or cannot be satisfied
    """
    if not range_header:
        return 0, file_size - 1
    
    # Parse "bytes=start-end" format
    match = re.match(r"bytes=(\d*)-(\d*)", range_header)
    if not match:
        raise RangeNotSatisfiable(f"Invalid Range header format: {range_header}")
    
    start_str, end_str = match.groups()
    
    if start_str and end_str:
        # "bytes=start-end"
        start = int(start_str)
        end = int(end_str)
    elif start_str:
        # "bytes=start-" (from start to end of file)
        start = int(start_str)
        end = file_size - 1
    elif end_str:
        # "bytes=-suffix" (last N bytes)
        suffix_length = int(end_str)
        start = max(0, file_size - suffix_length)
        end = file_size - 1
    else:
        raise RangeNotSatisfiable("Empty Range header")
    
    # Validate range
    if start < 0 or start >= file_size:
        raise RangeNotSatisfiable(f"Start position {start} out of range (file size: {file_size})")
    
    if end < start:
        raise RangeNotSatisfiable(f"End position {end} is before start {start}")
    
    # Clamp end to file size
    end = min(end, file_size - 1)
    
    return start, end


def iter_file_range(
    path: str,
    start: int,
    end: int,
    chunk_size: int = 1024 * 1024,  # 1MB chunks
) -> Generator[bytes, None, None]:
    """
    Generator that yields chunks of a file within a byte range.
    
    Args:
        path: Path to the file
        start: Start byte position (inclusive)
        end: End byte position (inclusive)
        chunk_size: Size of chunks to yield (default 1MB)
        
    Yields:
        Chunks of file data
    """
    with open(path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        
        while remaining > 0:
            read_size = min(chunk_size, remaining)
            data = f.read(read_size)
            if not data:
                break
            remaining -= len(data)
            yield data


def get_file_size(path: str) -> int:
    """Get the size of a file in bytes."""
    return os.path.getsize(path)

