from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models import JobStatus


class OutputInfo(BaseModel):
    available: bool
    filename: Optional[str] = None
    size_bytes: Optional[int] = None


class PitstopJobCreate(BaseModel):
    """Request schema - used internally, file comes from form."""

    series: Optional[str] = None
    race: Optional[str] = None
    notes: Optional[str] = None


class PitstopJobResponse(BaseModel):
    """Response schema for job creation and status."""

    job_id: UUID
    status: JobStatus
    stage: str
    progress: float = Field(ge=0.0, le=1.0)
    series: Optional[str]
    race: Optional[str]
    notes: Optional[str]
    input_filename: str
    input_size_bytes: int
    logs: List[str] = []
    output: OutputInfo
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_job(cls, job) -> "PitstopJobResponse":
        """Create response from PitstopJob model."""
        output = OutputInfo(
            available=job.status == JobStatus.COMPLETE and job.output_path is not None,
            filename=job.output_filename,
            size_bytes=job.output_size_bytes,
        )
        return cls(
            job_id=job.id,
            status=job.status,
            stage=job.stage,
            progress=job.progress,
            series=job.series,
            race=job.race,
            notes=job.notes,
            input_filename=job.input_filename,
            input_size_bytes=job.input_size_bytes,
            logs=job.get_logs_tail(200),
            output=output,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )


class PitstopJobListItem(BaseModel):
    """Lightweight schema for job listing."""

    job_id: UUID
    status: JobStatus
    stage: str
    progress: float
    series: Optional[str]
    race: Optional[str]
    input_filename: str
    input_size_bytes: int
    has_output: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_job(cls, job) -> "PitstopJobListItem":
        return cls(
            job_id=job.id,
            status=job.status,
            stage=job.stage,
            progress=job.progress,
            series=job.series,
            race=job.race,
            input_filename=job.input_filename,
            input_size_bytes=job.input_size_bytes,
            has_output=job.output_path is not None,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )


class PitstopJobListResponse(BaseModel):
    """Response for job listing endpoint with pagination metadata."""

    items: List[PitstopJobListItem]
    total: int
    limit: int
    offset: int

