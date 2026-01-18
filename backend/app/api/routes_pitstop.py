"""
Pitstop API routes.

Endpoints for video upload, job management, and output retrieval.
"""
from __future__ import annotations

import os
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import JobStatus
from app.db.session import get_db
from app.schemas.pitstop import (
    PitstopJobListItem,
    PitstopJobListResponse,
    PitstopJobResponse,
    PitstopMetricsUpdate,
    PitstopRunMetricsOut,
)
from app.services import pitstop_persistence, pitstop_service
from app.services.storage import get_storage
from app.settings import ALLOWED_VIDEO_EXTENSIONS, MAX_FILE_SIZE_BYTES
from app.utils.range_stream import (
    parse_range_header,
    iter_file_range,
    get_file_size,
    RangeNotSatisfiable,
)

router = APIRouter(prefix="/pitstop", tags=["pitstop"])


@router.post("/jobs", response_model=PitstopJobResponse)
async def create_job(
    file: UploadFile = File(...),
    series: Optional[str] = Form(None),
    race: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a video file and create a new pitstop analysis job.
    
    - Accepts video files: mp4, mov, mkv, avi, webm
    - Maximum file size: 5GB (configurable)
    - Returns job_id for status polling
    
    The job will be processed in the background through stages:
    QUEUED -> DETECTING -> TRACKING -> RENDERING -> COMPLETE
    """
    # Validate file extension
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}",
            )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE_BYTES:
        max_size_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(content) // (1024*1024)}MB). Maximum size: {max_size_mb}MB",
        )
    
    # Reject empty files
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="File is empty. Please upload a valid video file.",
        )
    
    # Create job
    job = await pitstop_service.create_job(
        db=db,
        file_content=content,
        original_filename=file.filename or "video.mp4",
        series=series,
        race=race,
        notes=notes,
    )
    
    # Enqueue for background processing
    pitstop_service.enqueue_job(job.id)
    
    return PitstopJobResponse.from_job(job)


@router.get("/jobs", response_model=PitstopJobListResponse)
async def list_jobs(
    limit: int = 5,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    List recent pitstop jobs with pagination.
    
    - Default: 5 most recent jobs per page
    - Max limit: 50 to prevent abuse
    - Use offset for pagination
    
    Returns pagination metadata: items, total, limit, offset
    """
    # Clamp limit to reasonable bounds (1-50)
    limit = max(1, min(limit, 50))
    offset = max(0, offset)
    
    jobs, total = await pitstop_service.list_jobs(db, limit=limit, offset=offset)
    return PitstopJobListResponse(
        items=[PitstopJobListItem.from_job(job) for job in jobs],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/jobs/{job_id}", response_model=PitstopJobResponse)
async def get_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get the status and details of a specific job.
    
    Returns:
    - Current status and processing stage
    - Progress (0.0 to 1.0)
    - Last 200 log lines
    - Output metadata if complete
    """
    job = await pitstop_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return PitstopJobResponse.from_job(job)


@router.get("/jobs/{job_id}/metrics", response_model=PitstopRunMetricsOut)
async def get_job_metrics(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get timing metrics for a completed pitstop job.
    
    Returns metrics with null values if no metrics have been recorded yet.
    This allows the frontend to always render the metrics UI, showing "--" for missing values.
    
    Metrics include:
    - fuel_time_s: Time for refueling
    - front_left_tyre_time_s, front_right_tyre_time_s: Front tyre change times
    - back_left_tyre_time_s, back_right_tyre_time_s: Rear tyre change times  
    - driver_out_time_s: Time for driver exit
    - driver_in_time_s: Time for driver entry
    """
    # Verify the job exists
    job = await pitstop_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get metrics (may be None if not recorded yet)
    metrics = await pitstop_service.get_job_metrics(db, job_id)
    
    return PitstopRunMetricsOut.from_summary(metrics, job_id)


@router.post("/jobs/{job_id}/metrics", response_model=PitstopRunMetricsOut)
async def update_job_metrics(
    job_id: UUID,
    metrics: PitstopMetricsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Manually update timing metrics for a pitstop job.
    
    This endpoint is useful for:
    - Testing the UI before the model computes metrics automatically
    - Manual corrections to computed metrics
    
    Only provided fields will be updated. Example request body:
    ```json
    {
        "fuel_time_s": 0.42,
        "front_left_tyre_time_s": 0.38
    }
    ```
    
    Returns the updated metrics.
    """
    # Verify the job exists
    job = await pitstop_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get payload with only non-None values
    payload = metrics.to_payload()
    
    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No metrics provided. Include at least one metric field.",
        )
    
    # Upsert the breakdown summary
    summary = await pitstop_persistence.upsert_breakdown_summary(db, job_id, payload)
    
    return PitstopRunMetricsOut.from_summary(summary, job_id)


# Backward compatibility alias
@router.get("/runs/{run_id}/metrics", response_model=PitstopRunMetricsOut, include_in_schema=False)
async def get_run_metrics_legacy(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Legacy endpoint - redirects to /jobs/{job_id}/metrics."""
    return await get_job_metrics(run_id, db)


@router.get("/jobs/{job_id}/output")
async def get_job_output(
    job_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Stream/download the output video for a completed job.
    
    Supports HTTP Range requests for browser video playback:
    - Without Range header: returns full file with Accept-Ranges: bytes
    - With Range header: returns 206 Partial Content with requested byte range
    
    Returns:
    - 409 if job is not complete
    - 404 if output file not found
    - 416 if Range cannot be satisfied
    - 200 for full file
    - 206 for partial content (Range request)
    """
    job = await pitstop_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.COMPLETE:
        raise HTTPException(
            status_code=409,
            detail=f"Job is not complete. Current status: {job.status.value}, stage: {job.stage}",
        )
    
    if not job.output_path:
        raise HTTPException(status_code=404, detail="Output file path not set")
    
    # Use storage abstraction to get output
    storage = get_storage()
    
    if not storage.file_exists(job.output_path, is_input=False):
        raise HTTPException(status_code=404, detail="Output file not found in storage")
    
    # Get the file path
    file_path, _ = storage.open_output_stream(job.output_path)
    file_path_str = str(file_path)
    
    # Get file size
    file_size = get_file_size(file_path_str)
    filename = job.output_filename or f"{job_id}_output.mp4"
    
    # Check for Range header
    range_header = request.headers.get("range")
    
    if range_header:
        # Handle Range request - return 206 Partial Content
        try:
            start, end = parse_range_header(range_header, file_size)
        except RangeNotSatisfiable as e:
            raise HTTPException(
                status_code=416,
                detail=str(e),
                headers={"Content-Range": f"bytes */{file_size}"},
            )
        
        content_length = end - start + 1
        
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache",
        }
        
        return StreamingResponse(
            iter_file_range(file_path_str, start, end),
            status_code=206,
            media_type="video/mp4",
            headers=headers,
        )
    
    else:
        # No Range header - return full file with Accept-Ranges
        # Use FileResponse for efficient full-file serving
        return FileResponse(
            path=file_path_str,
            filename=filename,
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "no-cache",
            },
        )


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a job and its associated files.
    
    - Removes job from database
    - Deletes input and output files from storage
    """
    deleted = await pitstop_service.delete_job(db, job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job deleted successfully", "job_id": str(job_id)}
