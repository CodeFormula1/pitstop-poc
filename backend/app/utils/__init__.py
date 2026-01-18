"""Utility modules for the CodeFx backend."""
from app.utils.range_stream import parse_range_header, iter_file_range, RangeNotSatisfiable
from app.utils.video_transcode import (
    ensure_browser_mp4,
    cleanup_temp_file,
    check_ffmpeg_installed,
    FFmpegNotFoundError,
    TranscodeError,
)

__all__ = [
    "parse_range_header",
    "iter_file_range",
    "RangeNotSatisfiable",
    "ensure_browser_mp4",
    "cleanup_temp_file",
    "check_ffmpeg_installed",
    "FFmpegNotFoundError",
    "TranscodeError",
]

