"""
Local filesystem storage implementation.

Stores files in local directories (./storage/input and ./storage/output).
"""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import Optional, Tuple
from uuid import UUID

from app.services.storage.base import Storage, StoredObject, get_content_type


class LocalStorage(Storage):
    """
    Local filesystem storage backend.
    
    Files are stored with the pattern: {job_id}_{original_filename}
    This ensures uniqueness and traceability.
    
    Directory structure:
        storage/
        ├── input/
        │   └── {job_id}_{filename}
        └── output/
            └── {job_id}_output.mp4
    """

    def __init__(self, input_dir: Path, output_dir: Path):
        """
        Initialize local storage.
        
        Args:
            input_dir: Directory for input files
            output_dir: Directory for output files
        """
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        
        # Ensure directories exist
        self.input_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _get_input_path(self, key: str) -> Path:
        """Get full path for an input file."""
        return self.input_dir / key

    def _get_output_path(self, key: str) -> Path:
        """Get full path for an output file."""
        return self.output_dir / key

    async def save_input(
        self,
        content: bytes,
        original_filename: str,
        job_id: UUID,
    ) -> StoredObject:
        """
        Save uploaded file to local input directory.
        
        File is saved as: {job_id}_{original_filename}
        """
        # Generate storage key
        safe_filename = f"{job_id}_{original_filename}"
        file_path = self._get_input_path(safe_filename)
        
        # Write file to disk
        file_path.write_bytes(content)
        
        return StoredObject(
            key=safe_filename,
            filename=original_filename,
            size_bytes=len(content),
            content_type=get_content_type(original_filename),
        )

    async def save_output_from_input(self, job_id: UUID, input_key: str) -> StoredObject:
        """
        Create output file by copying input file.
        
        This is a mock implementation. In production, the model would
        generate a new output file with annotations.
        """
        input_path = self._get_input_path(input_key)
        
        # Generate output filename
        output_filename = f"{job_id}_output.mp4"
        output_path = self._get_output_path(output_filename)
        
        # Copy input to output (mock model)
        if input_path.exists():
            shutil.copy(input_path, output_path)
            size = output_path.stat().st_size
        else:
            # Create placeholder if input doesn't exist
            output_path.write_bytes(b"mock video content")
            size = output_path.stat().st_size
        
        return StoredObject(
            key=output_filename,
            filename=output_filename,
            size_bytes=size,
            content_type="video/mp4",
        )

    def open_output_stream(self, output_key: str) -> Tuple[Path, str]:
        """
        Get path for FileResponse to stream the output file.
        
        For local storage, we return the Path directly for use with FileResponse.
        """
        path = self._get_output_path(output_key)
        content_type = get_content_type(output_key)
        return path, content_type

    def get_output_path(self, output_key: str) -> str:
        """Get full filesystem path for output file."""
        return str(self._get_output_path(output_key))

    def file_exists(self, key: str, is_input: bool = True) -> bool:
        """Check if file exists on local filesystem."""
        if is_input:
            return self._get_input_path(key).exists()
        return self._get_output_path(key).exists()

    async def delete_file(self, key: str, is_input: bool = True) -> bool:
        """Delete file from local filesystem."""
        if is_input:
            path = self._get_input_path(key)
        else:
            path = self._get_output_path(key)
        
        if path.exists():
            path.unlink()
            return True
        return False

    def get_file_size(self, key: str, is_input: bool = True) -> Optional[int]:
        """Get file size from local filesystem."""
        if is_input:
            path = self._get_input_path(key)
        else:
            path = self._get_output_path(key)
        
        if path.exists():
            return path.stat().st_size
        return None

