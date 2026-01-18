"""
Pitstop job service.

Handles business logic for creating, managing, and processing pitstop analysis jobs.
"""
from __future__ import annotations

import asyncio
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Set, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import JobStatus, PitstopJob
from app.db.session import async_session_maker
from app.services.storage import get_storage

# Track running jobs to avoid duplicate processing
_running_jobs: Set[uuid.UUID] = set()

# Thread pool for running YOLO inference (CPU/GPU bound) without blocking event loop
_thread_pool = ThreadPoolExecutor(max_workers=2)


async def create_job(
    db: AsyncSession,
    file_content: bytes,
    original_filename: str,
    series: Optional[str] = None,
    race: Optional[str] = None,
    notes: Optional[str] = None,
) -> PitstopJob:
    """
    Create a new pitstop job.
    
    1. Saves the uploaded file to storage
    2. Creates a job record in the database
    3. Returns the job for the caller to enqueue
    """
    job_id = uuid.uuid4()
    storage = get_storage()
    
    # Save the uploaded file using storage abstraction
    stored = await storage.save_input(file_content, original_filename, job_id)
    
    # Create job record
    job = PitstopJob(
        id=job_id,
        status=JobStatus.QUEUED,
        stage="UPLOAD",
        progress=0.0,
        series=series,
        race=race,
        notes=notes,
        input_path=stored.key,  # Store the storage key, not full path
        input_filename=stored.filename,
        input_size_bytes=stored.size_bytes,
    )
    job.append_log("INFO Job created, file uploaded successfully")
    job.append_log(f"INFO Input file: {original_filename} ({stored.size_bytes:,} bytes)")
    
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    return job


async def get_job(db: AsyncSession, job_id: uuid.UUID) -> Optional[PitstopJob]:
    """Get a job by ID."""
    result = await db.execute(select(PitstopJob).where(PitstopJob.id == job_id))
    return result.scalar_one_or_none()


async def list_jobs(
    db: AsyncSession,
    limit: int = 20,
    offset: int = 0,
) -> Tuple[List[PitstopJob], int]:
    """List jobs with pagination."""
    # Get total count efficiently
    count_result = await db.execute(select(func.count()).select_from(PitstopJob))
    total = count_result.scalar() or 0
    
    # Get paginated results
    result = await db.execute(
        select(PitstopJob)
        .order_by(desc(PitstopJob.created_at))
        .offset(offset)
        .limit(limit)
    )
    jobs = list(result.scalars().all())
    
    return jobs, total


async def delete_job(db: AsyncSession, job_id: uuid.UUID) -> bool:
    """Delete a job and its associated files from storage."""
    job = await get_job(db, job_id)
    if not job:
        return False
    
    storage = get_storage()
    
    # Delete input file from storage
    if job.input_path:
        await storage.delete_file(job.input_path, is_input=True)
    
    # Delete output file from storage
    if job.output_path:
        await storage.delete_file(job.output_path, is_input=False)
    
    # Delete job record
    await db.delete(job)
    await db.commit()
    
    return True


async def _update_job_state(
    job_id: uuid.UUID,
    status: JobStatus,
    stage: str,
    progress: float,
    log_message: str,
) -> None:
    """Update job state in database (uses new session)."""
    async with async_session_maker() as db:
        result = await db.execute(select(PitstopJob).where(PitstopJob.id == job_id))
        job = result.scalar_one_or_none()
        if job:
            job.status = status
            job.stage = stage
            job.progress = progress
            job.append_log(log_message)
            await db.commit()


async def _append_log(job_id: uuid.UUID, log_message: str) -> None:
    """Append a log message to the job (uses new session)."""
    async with async_session_maker() as db:
        result = await db.execute(select(PitstopJob).where(PitstopJob.id == job_id))
        job = result.scalar_one_or_none()
        if job:
            job.append_log(log_message)
            await db.commit()


async def _update_progress(job_id: uuid.UUID, progress: float, stage: str) -> None:
    """Update job progress (uses new session)."""
    async with async_session_maker() as db:
        result = await db.execute(select(PitstopJob).where(PitstopJob.id == job_id))
        job = result.scalar_one_or_none()
        if job:
            job.progress = progress
            job.stage = stage
            await db.commit()


async def _finalize_job(
    job_id: uuid.UUID,
    status: JobStatus,
    output_key: Optional[str] = None,
    output_filename: Optional[str] = None,
    output_size: Optional[int] = None,
    error_message: Optional[str] = None,
) -> None:
    """Finalize job with output file info or error."""
    async with async_session_maker() as db:
        result = await db.execute(select(PitstopJob).where(PitstopJob.id == job_id))
        job = result.scalar_one_or_none()
        if job:
            job.status = status
            job.progress = 1.0 if status == JobStatus.COMPLETE else job.progress
            
            if output_key and output_filename and output_size:
                job.output_path = output_key  # Store the storage key
                job.output_filename = output_filename
                job.output_size_bytes = output_size
                job.stage = "COMPLETE"
                job.append_log("INFO Output video generated successfully")
                job.append_log(f"INFO Output file: {output_filename} ({output_size:,} bytes)")
            elif error_message:
                job.stage = "FAILED"
                job.append_log(f"ERROR {error_message}")
            
            await db.commit()


def _get_stage_from_progress(progress: float) -> str:
    """Determine the processing stage based on progress value."""
    if progress < 0.15:
        return "UPLOAD"
    elif progress < 0.40:
        return "DETECTING"
    elif progress < 0.70:
        return "TRACKING"
    elif progress < 1.0:
        return "RENDERING"
    else:
        return "COMPLETE"


def _run_yolo_sync(
    job_id: uuid.UUID,
    input_path: str,
    output_path: str,
    weights_path: str,
    threshold: float,
    loop: asyncio.AbstractEventLoop,
) -> Tuple[str, int]:
    """
    Run YOLO inference synchronously in a thread pool.
    
    This function runs in a separate thread to avoid blocking the async event loop.
    It updates job progress via callbacks that schedule coroutines on the main event loop.
    """
    from app.model.pitstop_yolo_runner import PitstopYoloRunner
    
    def log_callback(msg: str) -> None:
        """Log callback that schedules async log update."""
        asyncio.run_coroutine_threadsafe(_append_log(job_id, f"INFO {msg}"), loop)
    
    def progress_callback(p: float) -> None:
        """Progress callback that schedules async progress update."""
        stage = _get_stage_from_progress(p)
        asyncio.run_coroutine_threadsafe(_update_progress(job_id, p, stage), loop)
    
    runner = PitstopYoloRunner(weights_path=weights_path, threshold=threshold)
    result = runner.process_video(
        input_path=input_path,
        output_path=output_path,
        log_cb=log_callback,
        progress_cb=progress_callback,
    )
    
    return result.output_path, result.frames_processed


async def run_job_processing(job_id: uuid.UUID) -> None:
    """
    Run actual YOLO model processing on the job.
    
    Processing stages:
    1. QUEUED -> PROCESSING/DETECTING
    2. DETECTING (object detection)
    3. TRACKING (multi-object tracking)  
    4. RENDERING (video output generation)
    5. COMPLETE
    
    This runs as a background task using a ThreadPoolExecutor for the CPU-bound
    YOLO inference work.
    """
    from app import settings
    
    if job_id in _running_jobs:
        return
    
    _running_jobs.add(job_id)
    
    try:
        # Get input key and storage info from job
        storage = get_storage()
        
        async with async_session_maker() as db:
            result = await db.execute(select(PitstopJob).where(PitstopJob.id == job_id))
            job = result.scalar_one_or_none()
            if not job:
                return
            input_key = job.input_path

        # Resolve full paths
        input_path = str(settings.INPUT_DIR / input_key)
        output_filename = f"{job_id}_output.mp4"
        output_path = str(settings.OUTPUT_DIR / output_filename)
        
        # Check if weights file exists
        weights_path = settings.PITSTOP_YOLO_WEIGHTS_PATH
        if not os.path.exists(weights_path):
            await _finalize_job(
                job_id,
                JobStatus.FAILED,
                error_message=f"YOLO weights not found at: {weights_path}. Please place best.pt in backend/model_weights/",
            )
            return
        
        # Update to PROCESSING status
        await _update_job_state(
            job_id, JobStatus.PROCESSING, "DETECTING", 0.05,
            "INFO Starting YOLO model processing..."
        )
        
        await _append_log(job_id, f"INFO Loading YOLO weights from: {weights_path}")
        await _append_log(job_id, f"INFO Processing input: {input_key}")
        
        # Run YOLO inference in thread pool (blocking operation)
        loop = asyncio.get_running_loop()
        
        try:
            output_result_path, frames_processed = await loop.run_in_executor(
                _thread_pool,
                _run_yolo_sync,
                job_id,
                input_path,
                output_path,
                weights_path,
                settings.PITSTOP_YOLO_THRESHOLD,
                loop,
            )
            
            # Get output file size
            output_size = os.path.getsize(output_result_path)
            
            await _append_log(job_id, f"INFO Processed {frames_processed} frames total")
            
            # Finalize with success
            await _finalize_job(
                job_id,
                JobStatus.COMPLETE,
                output_key=output_filename,
                output_filename=output_filename,
                output_size=output_size,
            )
            
        except FileNotFoundError as e:
            await _finalize_job(job_id, JobStatus.FAILED, error_message=str(e))
        except RuntimeError as e:
            await _finalize_job(job_id, JobStatus.FAILED, error_message=str(e))
        except Exception as e:
            await _finalize_job(job_id, JobStatus.FAILED, error_message=f"YOLO processing failed: {str(e)}")
            
    except Exception as e:
        await _finalize_job(job_id, JobStatus.FAILED, error_message=str(e))
    finally:
        _running_jobs.discard(job_id)


def enqueue_job(job_id: uuid.UUID) -> None:
    """Enqueue a job for background processing."""
    asyncio.create_task(run_job_processing(job_id))
