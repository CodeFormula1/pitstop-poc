"""
Pitstop job service.

Handles business logic for creating, managing, and processing pitstop analysis jobs.
Uses pitstop_persistence for database operations.
"""
from __future__ import annotations

import asyncio
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Set, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import JobStatus, PitstopJob, PitstopBreakdownSummary
from app.db.session import async_session_maker
from app.services import pitstop_persistence
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
    mode: Optional[str] = None,
) -> PitstopJob:
    """
    Create a new pitstop job.
    
    1. Saves the uploaded file to storage
    2. Creates a job record in the database (status=QUEUED)
    3. Creates an empty breakdown summary for the job
    4. Returns the job for the caller to enqueue
    """
    from app import settings
    
    storage = get_storage()
    
    # Use mode from settings if not provided
    if mode is None:
        mode = settings.PITSTOP_MODE
    
    # Generate job ID first (needed for storage key)
    job_id = uuid.uuid4()
    
    # Save the uploaded file using storage abstraction
    stored = await storage.save_input(file_content, original_filename, job_id)
    
    # Create job record using persistence layer (pass pre-generated job_id)
    job = await pitstop_persistence.create_job(
        db=db,
        input_filename=stored.filename,
        input_path=stored.key,
        mode=mode,
        input_size_bytes=stored.size_bytes,
        series=series,
        race=race,
        notes=notes,
        job_id=job_id,  # Use pre-generated ID
    )
    
    # Add initial logs
    job.append_log("INFO Job created, file uploaded successfully")
    job.append_log(f"INFO Input file: {original_filename} ({stored.size_bytes:,} bytes)")
    job.append_log(f"INFO Processing mode: {mode}")
    await db.commit()
    
    # Create empty breakdown summary immediately (placeholder)
    await pitstop_persistence.create_empty_summary(db, job.id)
    
    # Refresh job to ensure all attributes are loaded (prevents MissingGreenlet errors)
    await db.refresh(job)
    
    return job


async def get_job(db: AsyncSession, job_id: uuid.UUID) -> Optional[PitstopJob]:
    """Get a job by ID."""
    return await pitstop_persistence.get_job(db, job_id)


async def get_job_metrics(
    db: AsyncSession, job_id: uuid.UUID
) -> Optional[PitstopBreakdownSummary]:
    """Get breakdown metrics for a job by ID."""
    return await pitstop_persistence.get_summary_by_job_id(db, job_id)


# Alias for backward compatibility
async def get_run_metrics(
    db: AsyncSession, run_id: uuid.UUID
) -> Optional[PitstopBreakdownSummary]:
    """Get breakdown metrics for a run by ID (alias for get_job_metrics)."""
    return await get_job_metrics(db, run_id)


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
    
    # Delete job record (cascade will delete breakdown_summary)
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
        await pitstop_persistence.update_job_status(
            db, job_id,
            status=status,
            stage=stage,
            progress=progress,
        )
        await pitstop_persistence.append_job_log(db, job_id, log_message)


async def _append_log(job_id: uuid.UUID, log_message: str) -> None:
    """Append a log message to the job (uses new session)."""
    async with async_session_maker() as db:
        await pitstop_persistence.append_job_log(db, job_id, log_message)


async def _update_progress(job_id: uuid.UUID, progress: float, stage: str) -> None:
    """Update job progress (uses new session)."""
    async with async_session_maker() as db:
        await pitstop_persistence.update_job_progress(db, job_id, progress, stage)


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
        if status == JobStatus.COMPLETE and output_key:
            # Success case
            await pitstop_persistence.update_job_status(
                db, job_id,
                status=JobStatus.COMPLETE,
                stage="COMPLETE",
                progress=1.0,
                output_path=output_key,
                output_filename=output_filename,
                output_size_bytes=output_size,
            )
            await pitstop_persistence.append_job_log(
                db, job_id, "INFO Output video generated successfully"
            )
            await pitstop_persistence.append_job_log(
                db, job_id, f"INFO Output file: {output_filename} ({output_size:,} bytes)"
            )
        elif status == JobStatus.FAILED:
            # Failure case
            await pitstop_persistence.update_job_status(
                db, job_id,
                status=JobStatus.FAILED,
                stage="FAILED",
                error_message=error_message,
            )
            await pitstop_persistence.append_job_log(
                db, job_id, f"ERROR {error_message}"
            )
        else:
            # Other status updates
            await pitstop_persistence.update_job_status(
                db, job_id,
                status=status,
            )


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
    mode: str = "classic",
    zone_config_path: Optional[str] = None,
    iou_threshold: float = 0.5,
    target_size: Optional[Tuple[int, int]] = None,
) -> Tuple[str, int, Optional[dict]]:
    """
    Run YOLO inference synchronously in a thread pool.
    
    This function runs in a separate thread to avoid blocking the async event loop.
    It updates job progress via callbacks that schedule coroutines on the main event loop.
    
    Supports two modes:
    - "classic": Original bbox annotation
    - "time_in_zone": Supervision-based tracking with zone timing
    
    Returns:
        Tuple of (output_path, frames_processed, zone_summary_dict or None)
    """
    from app.model.pitstop_yolo_runner import PitstopYoloRunner
    
    def log_callback(msg: str) -> None:
        """Log callback that schedules async log update."""
        asyncio.run_coroutine_threadsafe(_append_log(job_id, f"INFO {msg}"), loop)
    
    def progress_callback(p: float) -> None:
        """Progress callback that schedules async progress update."""
        stage = _get_stage_from_progress(p)
        asyncio.run_coroutine_threadsafe(_update_progress(job_id, p, stage), loop)
    
    runner = PitstopYoloRunner(
        weights_path=weights_path,
        threshold=threshold,
        mode=mode,
        zone_config_path=zone_config_path,
        iou_threshold=iou_threshold,
        target_size=target_size,
    )
    result = runner.process_video(
        input_path=input_path,
        output_path=output_path,
        log_cb=log_callback,
        progress_cb=progress_callback,
    )
    
    return result.output_path, result.frames_processed, result.zone_summary


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
            job = await pitstop_persistence.get_job(db, job_id)
            if not job:
                return
            input_key = job.input_path
            job_mode = job.mode

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
        
        # Get processing mode and zone config (use job's stored mode)
        mode = job_mode or settings.PITSTOP_MODE
        zone_config_path = settings.ZONE_CONFIG_PATH if mode == "time_in_zone" else None
        iou_threshold = settings.PITSTOP_IOU_THRESHOLD
        target_size = (settings.PITSTOP_TARGET_WIDTH, settings.PITSTOP_TARGET_HEIGHT) if mode == "time_in_zone" else None
        
        await _append_log(job_id, f"INFO Loading YOLO weights from: {weights_path}")
        await _append_log(job_id, f"INFO Processing mode: {mode}")
        await _append_log(job_id, f"INFO Processing input: {input_key}")
        
        # Run YOLO inference in thread pool (blocking operation)
        loop = asyncio.get_running_loop()
        
        try:
            output_result_path, frames_processed, zone_summary = await loop.run_in_executor(
                _thread_pool,
                _run_yolo_sync,
                job_id,
                input_path,
                output_path,
                weights_path,
                settings.PITSTOP_YOLO_THRESHOLD,
                loop,
                mode,
                zone_config_path,
                iou_threshold,
                target_size,
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
            
            # If we have zone summary data, persist it
            if zone_summary and mode == "time_in_zone":
                await _persist_zone_metrics(job_id, zone_summary)
            
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


async def _persist_zone_metrics(job_id: uuid.UUID, zone_summary: dict) -> None:
    """
    Persist zone metrics to breakdown summary.
    
    Maps zone names to database fields:
    - Zone names containing 'fuel' -> fuel_time_s
    - Zone names containing 'front_left' or 'fl' -> front_left_tyre_time_s
    - etc.
    
    For now, stores max_time_sec from each zone.
    """
    async with async_session_maker() as db:
        # Build payload from zone summary
        payload = {}
        
        zones = zone_summary.get("zones", [])
        for zone in zones:
            zone_name = zone.get("zone_name", "").lower()
            max_time = zone.get("max_time_sec", 0.0)
            
            # Map zone names to DB fields
            if "fuel" in zone_name:
                payload["fuel_time_s"] = max_time
            elif "front_left" in zone_name or "fl_tyre" in zone_name:
                payload["front_left_tyre_time_s"] = max_time
            elif "front_right" in zone_name or "fr_tyre" in zone_name:
                payload["front_right_tyre_time_s"] = max_time
            elif "back_left" in zone_name or "rear_left" in zone_name or "bl_tyre" in zone_name or "rl_tyre" in zone_name:
                payload["back_left_tyre_time_s"] = max_time
            elif "back_right" in zone_name or "rear_right" in zone_name or "br_tyre" in zone_name or "rr_tyre" in zone_name:
                payload["back_right_tyre_time_s"] = max_time
            elif "driver_out" in zone_name or "exit" in zone_name:
                payload["driver_out_time_s"] = max_time
            elif "driver_in" in zone_name or "entry" in zone_name:
                payload["driver_in_time_s"] = max_time
        
        if payload:
            await pitstop_persistence.upsert_breakdown_summary(db, job_id, payload)
            await pitstop_persistence.append_job_log(
                db, job_id, f"INFO Zone metrics persisted: {list(payload.keys())}"
            )


def enqueue_job(job_id: uuid.UUID) -> None:
    """Enqueue a job for background processing."""
    asyncio.create_task(run_job_processing(job_id))
