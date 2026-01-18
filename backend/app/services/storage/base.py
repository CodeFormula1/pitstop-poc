"""
Storage abstraction base class.

This module defines the Storage interface that all storage backends must implement.
To add S3 support later, create an S3Storage class that implements this interface.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Optional, Tuple, Union
from uuid import UUID


@dataclass
class StoredObject:
    """
    Metadata about a stored file.
    
    Attributes:
        key: Storage key/path (relative path for local, S3 key for S3)
        filename: Original filename
        size_bytes: File size in bytes
        content_type: MIME type of the file
    """
    key: str
    filename: str
    size_bytes: int
    content_type: str = "video/mp4"


class Storage(ABC):
    """
    Abstract base class for storage backends.
    
    Implementations:
        - LocalStorage: Stores files on local filesystem
        - S3Storage: Stores files in AWS S3 (to be implemented)
    
    Usage:
        storage = get_storage()  # Returns configured storage backend
        stored = await storage.save_input(file_content, "video.mp4", job_id)
        stream = storage.open_output_stream(job_id)
    """

    @abstractmethod
    async def save_input(
        self,
        content: bytes,
        original_filename: str,
        job_id: UUID,
    ) -> StoredObject:
        """
        Save an input file to storage.
        
        Args:
            content: File content as bytes
            original_filename: Original filename from upload
            job_id: UUID of the job this file belongs to
            
        Returns:
            StoredObject with metadata about the stored file
        """
        pass

    @abstractmethod
    async def save_output_from_input(self, job_id: UUID, input_key: str) -> StoredObject:
        """
        Create an output file from the input file.
        
        For now, this copies the input file to output (mock model).
        In production, the model would generate a new output file.
        
        Args:
            job_id: UUID of the job
            input_key: Storage key of the input file
            
        Returns:
            StoredObject with metadata about the output file
        """
        pass

    @abstractmethod
    def open_output_stream(self, output_key: str) -> Tuple[Union[BinaryIO, Path], str]:
        """
        Open a stream or get path for reading the output file.
        
        Args:
            output_key: Storage key of the output file
            
        Returns:
            Tuple of (file object or path, content_type)
            - For local storage: returns Path for FileResponse
            - For S3: would return presigned URL or stream
        """
        pass

    @abstractmethod
    def get_output_path(self, output_key: str) -> str:
        """
        Get the full path/URL for an output file.
        
        Args:
            output_key: Storage key of the output file
            
        Returns:
            Full path (local) or URL (S3)
        """
        pass

    @abstractmethod
    def file_exists(self, key: str, is_input: bool = True) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            key: Storage key of the file
            is_input: Whether this is an input file (True) or output file (False)
            
        Returns:
            True if file exists, False otherwise
        """
        pass

    @abstractmethod
    async def delete_file(self, key: str, is_input: bool = True) -> bool:
        """
        Delete a file from storage.
        
        Args:
            key: Storage key of the file
            is_input: Whether this is an input file (True) or output file (False)
            
        Returns:
            True if file was deleted, False if it didn't exist
        """
        pass

    @abstractmethod
    def get_file_size(self, key: str, is_input: bool = True) -> Optional[int]:
        """
        Get the size of a file in bytes.
        
        Args:
            key: Storage key of the file
            is_input: Whether this is an input file (True) or output file (False)
            
        Returns:
            File size in bytes, or None if file doesn't exist
        """
        pass


# Content type mapping based on file extension
CONTENT_TYPE_MAP = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
}


def get_content_type(filename: str) -> str:
    """Get content type from filename extension."""
    ext = Path(filename).suffix.lower()
    return CONTENT_TYPE_MAP.get(ext, "application/octet-stream")

