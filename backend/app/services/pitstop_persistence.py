"""
Pitstop persistence service.

Clean database operations for pitstop jobs and breakdown summaries.
Separates DB logic from routes and business logic.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import JobStatus, PitstopBreakdownSummary, PitstopJob


async def create_job(
    db: AsyncSession,
    input_filename: str,
    input_path: str,
    mode: str = "classic",
    input_size_bytes: int = 0,
    series: Optional[str] = None,
    race: Optional[str] = None,
    notes: Optional[str] = None,
    job_id: Optional[uuid.UUID] = None,
) -> PitstopJob:
    """
    Create a new pitstop job with QUEUED status.
    
    Args:
        db: Database session
        input_filename: Original filename of uploaded video
        input_path: Storage path/key for the input file
        mode: Processing mode ('classic' or 'time_in_zone')
        input_size_bytes: Size of input file in bytes
        series: Optional racing series name
        race: Optional race name
        notes: Optional notes
        job_id: Optional UUID for the job (auto-generated if not provided)
        
    Returns:
        Created PitstopJob instance
    """
    job = PitstopJob(
        id=job_id or uuid.uuid4(),
        status=JobStatus.QUEUED,
        stage="UPLOAD",
        progress=0.0,
        mode=mode,
        input_filename=input_filename,
        input_path=input_path,
        input_size_bytes=input_size_bytes,
        series=series,
        race=race,
        notes=notes,
    )
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    return job


async def create_empty_summary(
    db: AsyncSession,
    job_id: uuid.UUID,
) -> PitstopBreakdownSummary:
    """
    Create an empty breakdown summary for a job.
    
    All metric fields will be NULL initially.
    
    Args:
        db: Database session
        job_id: UUID of the parent job
        
    Returns:
        Created PitstopBreakdownSummary instance
    """
    summary = PitstopBreakdownSummary(
        id=uuid.uuid4(),
        job_id=job_id,
        # All metric fields default to None/NULL
        fuel_time_s=None,
        front_left_tyre_time_s=None,
        front_right_tyre_time_s=None,
        back_left_tyre_time_s=None,
        back_right_tyre_time_s=None,
        driver_out_time_s=None,
        driver_in_time_s=None,
    )
    
    db.add(summary)
    await db.commit()
    await db.refresh(summary)
    
    return summary


async def get_job(
    db: AsyncSession,
    job_id: uuid.UUID,
) -> Optional[PitstopJob]:
    """
    Get a job by ID.
    
    Args:
        db: Database session
        job_id: UUID of the job
        
    Returns:
        PitstopJob if found, None otherwise
    """
    result = await db.execute(
        select(PitstopJob).where(PitstopJob.id == job_id)
    )
    return result.scalar_one_or_none()


async def get_summary_by_job_id(
    db: AsyncSession,
    job_id: uuid.UUID,
) -> Optional[PitstopBreakdownSummary]:
    """
    Get breakdown summary for a job.
    
    Args:
        db: Database session
        job_id: UUID of the parent job
        
    Returns:
        PitstopBreakdownSummary if found, None otherwise
    """
    result = await db.execute(
        select(PitstopBreakdownSummary).where(
            PitstopBreakdownSummary.job_id == job_id
        )
    )
    return result.scalar_one_or_none()


async def update_job_status(
    db: AsyncSession,
    job_id: uuid.UUID,
    status: JobStatus,
    stage: Optional[str] = None,
    progress: Optional[float] = None,
    output_path: Optional[str] = None,
    output_filename: Optional[str] = None,
    output_size_bytes: Optional[int] = None,
    error_message: Optional[str] = None,
) -> Optional[PitstopJob]:
    """
    Update job status and optional fields.
    
    Args:
        db: Database session
        job_id: UUID of the job to update
        status: New JobStatus
        stage: Optional new stage
        progress: Optional new progress (0.0-1.0)
        output_path: Optional output file path
        output_filename: Optional output filename
        output_size_bytes: Optional output file size
        error_message: Optional error message (for FAILED status)
        
    Returns:
        Updated PitstopJob if found, None otherwise
    """
    job = await get_job(db, job_id)
    if not job:
        return None
    
    job.status = status
    
    if stage is not None:
        job.stage = stage
    
    if progress is not None:
        job.progress = progress
    
    if output_path is not None:
        job.output_path = output_path
    
    if output_filename is not None:
        job.output_filename = output_filename
    
    if output_size_bytes is not None:
        job.output_size_bytes = output_size_bytes
    
    if error_message is not None:
        job.error_message = error_message
    
    await db.commit()
    await db.refresh(job)
    
    return job


async def upsert_breakdown_summary(
    db: AsyncSession,
    job_id: uuid.UUID,
    payload: Dict[str, Any],
) -> PitstopBreakdownSummary:
    """
    Update or create a breakdown summary for a job.
    
    If a summary exists for the job_id, updates it with the payload.
    If no summary exists, creates one with the payload values.
    
    Args:
        db: Database session
        job_id: UUID of the parent job
        payload: Dict with metric fields to update:
            - fuel_time_s: float
            - front_left_tyre_time_s: float
            - front_right_tyre_time_s: float
            - back_left_tyre_time_s: float
            - back_right_tyre_time_s: float
            - driver_out_time_s: float
            - driver_in_time_s: float
            
    Returns:
        Updated or created PitstopBreakdownSummary
    """
    # Try to get existing summary
    summary = await get_summary_by_job_id(db, job_id)
    
    if summary is None:
        # Create new summary
        summary = PitstopBreakdownSummary(
            id=uuid.uuid4(),
            job_id=job_id,
        )
        db.add(summary)
    
    # Update fields from payload
    allowed_fields = {
        "fuel_time_s",
        "front_left_tyre_time_s",
        "front_right_tyre_time_s",
        "back_left_tyre_time_s",
        "back_right_tyre_time_s",
        "driver_out_time_s",
        "driver_in_time_s",
    }
    
    for field, value in payload.items():
        if field in allowed_fields:
            setattr(summary, field, value)
    
    await db.commit()
    await db.refresh(summary)
    
    return summary


async def append_job_log(
    db: AsyncSession,
    job_id: uuid.UUID,
    message: str,
) -> Optional[PitstopJob]:
    """
    Append a log message to a job.
    
    Args:
        db: Database session
        job_id: UUID of the job
        message: Log message to append
        
    Returns:
        Updated PitstopJob if found, None otherwise
    """
    job = await get_job(db, job_id)
    if not job:
        return None
    
    job.append_log(message)
    
    await db.commit()
    await db.refresh(job)
    
    return job


async def update_job_progress(
    db: AsyncSession,
    job_id: uuid.UUID,
    progress: float,
    stage: Optional[str] = None,
) -> Optional[PitstopJob]:
    """
    Update job progress and optionally stage.
    
    Args:
        db: Database session
        job_id: UUID of the job
        progress: New progress value (0.0-1.0)
        stage: Optional new stage
        
    Returns:
        Updated PitstopJob if found, None otherwise
    """
    job = await get_job(db, job_id)
    if not job:
        return None
    
    job.progress = progress
    
    if stage is not None:
        job.stage = stage
    
    await db.commit()
    await db.refresh(job)
    
    return job

