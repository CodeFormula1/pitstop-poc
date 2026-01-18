"""
Storage abstraction layer.

This module provides a pluggable storage interface that can be swapped
between LocalStorage and S3Storage without changing routes or services.
"""
from __future__ import annotations

from typing import Optional

from app.services.storage.base import Storage, StoredObject
from app.services.storage.local import LocalStorage

__all__ = ["Storage", "StoredObject", "LocalStorage", "get_storage"]

# Singleton storage instance
_storage_instance: Optional[Storage] = None


def get_storage() -> Storage:
    """
    Get the configured storage instance.
    
    Returns a singleton LocalStorage by default.
    To switch to S3, replace LocalStorage with S3Storage here.
    """
    global _storage_instance
    if _storage_instance is None:
        from app.settings import INPUT_DIR, OUTPUT_DIR
        _storage_instance = LocalStorage(
            input_dir=INPUT_DIR,
            output_dir=OUTPUT_DIR,
        )
    return _storage_instance


def reset_storage() -> None:
    """Reset the storage instance (useful for testing)."""
    global _storage_instance
    _storage_instance = None

