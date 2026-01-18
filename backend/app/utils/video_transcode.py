"""
Video transcoding utilities for browser-compatible MP4 output.

OpenCV's mp4v codec produces files that many browsers cannot decode.
This module uses ffmpeg to transcode to H.264 with faststart for web playback.
"""
from __future__ import annotations

import os
import shutil
import subprocess
from typing import Callable, Optional

LogCB = Optional[Callable[[str], None]]


class FFmpegNotFoundError(RuntimeError):
    """Raised when ffmpeg is not installed or not in PATH."""
    pass


class TranscodeError(RuntimeError):
    """Raised when ffmpeg transcoding fails."""
    pass


def check_ffmpeg_installed() -> bool:
    """Check if ffmpeg is available in PATH."""
    return shutil.which("ffmpeg") is not None


def ensure_browser_mp4(
    input_mp4_path: str,
    output_mp4_path: str,
    log_cb: LogCB = None,
) -> None:
    """
    Transcode an MP4 file to browser-compatible H.264 format.
    
    Uses ffmpeg to re-encode with:
    - libx264 codec (widely supported)
    - yuv420p pixel format (required for most browsers)
    - faststart flag (moves moov atom for streaming)
    - veryfast preset (good balance of speed and quality)
    
    Args:
        input_mp4_path: Path to the source MP4 (e.g., OpenCV output)
        output_mp4_path: Path for the transcoded output
        log_cb: Optional callback for logging progress
        
    Raises:
        FFmpegNotFoundError: If ffmpeg is not installed
        TranscodeError: If transcoding fails
        FileNotFoundError: If input file doesn't exist
    """
    def log(msg: str) -> None:
        """Safe logging that won't fail."""
        if log_cb:
            try:
                log_cb(msg)
            except Exception:
                pass  # Don't let logging failures break transcoding
    
    log("Checking ffmpeg installation...")
    
    # Check ffmpeg is installed
    if not check_ffmpeg_installed():
        raise FFmpegNotFoundError(
            "ffmpeg is required to generate browser-compatible MP4. "
            "Please install ffmpeg:\n"
            "  macOS: brew install ffmpeg\n"
            "  Ubuntu/Debian: sudo apt-get install -y ffmpeg\n"
            "  Windows: Download from https://ffmpeg.org/download.html"
        )
    
    log("ffmpeg found, checking input file...")
    
    # Check input exists
    if not os.path.exists(input_mp4_path):
        raise FileNotFoundError(f"Input video not found: {input_mp4_path}")
    
    input_size = os.path.getsize(input_mp4_path)
    log(f"Input file: {input_size:,} bytes")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_mp4_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    log("Transcoding to H.264 (browser-compatible)...")
    
    # Build ffmpeg command
    cmd = [
        "ffmpeg",
        "-y",                      # Overwrite output
        "-i", input_mp4_path,      # Input file
        "-c:v", "libx264",         # H.264 codec
        "-pix_fmt", "yuv420p",     # Browser-compatible pixel format
        "-movflags", "+faststart", # Move moov atom for streaming
        "-preset", "veryfast",     # Fast encoding
        "-crf", "23",              # Quality level
        "-an",                     # No audio
        output_mp4_path,
    ]
    
    log(f"Running ffmpeg...")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
        )
        
        log(f"ffmpeg exit code: {result.returncode}")
        
        if result.returncode != 0:
            # Get last 20 lines of stderr for error message
            stderr_lines = result.stderr.strip().split("\n") if result.stderr else []
            error_tail = "\n".join(stderr_lines[-20:]) if stderr_lines else "No error output"
            log(f"ffmpeg FAILED: {error_tail[:200]}")
            raise TranscodeError(
                f"ffmpeg transcoding failed (exit code {result.returncode}):\n{error_tail}"
            )
        
        log("ffmpeg completed successfully")
        
        # Verify output was created
        if not os.path.exists(output_mp4_path):
            raise TranscodeError(f"ffmpeg did not produce output file: {output_mp4_path}")
        
        output_size = os.path.getsize(output_mp4_path)
        log(f"Output file: {output_size:,} bytes (H.264 + faststart)")
            
    except subprocess.TimeoutExpired:
        log("ffmpeg TIMEOUT")
        raise TranscodeError("ffmpeg transcoding timed out after 10 minutes")
    except OSError as e:
        log(f"ffmpeg OSError: {e}")
        raise FFmpegNotFoundError(f"ffmpeg command failed: {e}")


def cleanup_temp_file(path: str, log_cb: LogCB = None) -> None:
    """Safely delete a temporary file."""
    try:
        if os.path.exists(path):
            os.remove(path)
            if log_cb:
                log_cb(f"Cleaned up temp file: {os.path.basename(path)}")
    except OSError as e:
        if log_cb:
            log_cb(f"Warning: Could not delete temp file {path}: {e}")
