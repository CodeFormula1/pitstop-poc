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
    mode: str = "classic"
    series: Optional[str]
    race: Optional[str]
    notes: Optional[str]
    input_filename: str
    input_size_bytes: int
    logs: List[str] = []
    output: OutputInfo
    error_message: Optional[str] = None
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
            mode=getattr(job, 'mode', 'classic'),
            series=job.series,
            race=job.race,
            notes=job.notes,
            input_filename=job.input_filename,
            input_size_bytes=job.input_size_bytes,
            logs=job.get_logs_tail(200),
            output=output,
            error_message=getattr(job, 'error_message', None),
            created_at=job.created_at,
            updated_at=job.updated_at,
        )


class PitstopJobListItem(BaseModel):
    """Lightweight schema for job listing."""

    job_id: UUID
    status: JobStatus
    stage: str
    progress: float
    mode: str = "classic"
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
            mode=getattr(job, 'mode', 'classic'),
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


class PitstopMetricsUpdate(BaseModel):
    """Request schema for updating job metrics (POST).
    
    All fields are optional - only provided fields will be updated.
    Use this endpoint to manually set metrics for testing UI.
    """
    
    fuel_time_s: Optional[float] = Field(None, ge=0, description="Fuel time in seconds")
    front_left_tyre_time_s: Optional[float] = Field(None, ge=0, description="Front left tyre change time")
    front_right_tyre_time_s: Optional[float] = Field(None, ge=0, description="Front right tyre change time")
    back_left_tyre_time_s: Optional[float] = Field(None, ge=0, description="Back left tyre change time")
    back_right_tyre_time_s: Optional[float] = Field(None, ge=0, description="Back right tyre change time")
    driver_out_time_s: Optional[float] = Field(None, ge=0, description="Driver exit time")
    driver_in_time_s: Optional[float] = Field(None, ge=0, description="Driver entry time")
    
    def to_payload(self) -> dict:
        """Convert to dict with only non-None values for upsert."""
        return {k: v for k, v in self.model_dump().items() if v is not None}


class PitstopRunMetricsOut(BaseModel):
    """Response schema for run metrics endpoint.
    
    Note: Uses job_id to match the updated schema (previously run_id).
    """

    job_id: UUID
    fuel_time_s: Optional[float] = None
    front_left_tyre_time_s: Optional[float] = None
    front_right_tyre_time_s: Optional[float] = None
    back_left_tyre_time_s: Optional[float] = None
    back_right_tyre_time_s: Optional[float] = None
    driver_out_time_s: Optional[float] = None
    driver_in_time_s: Optional[float] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_summary(cls, summary, job_id: UUID) -> "PitstopRunMetricsOut":
        """Create response from PitstopBreakdownSummary model or return empty metrics."""
        if summary is None:
            return cls(job_id=job_id)
        return cls(
            job_id=summary.job_id,
            fuel_time_s=summary.fuel_time_s,
            front_left_tyre_time_s=summary.front_left_tyre_time_s,
            front_right_tyre_time_s=summary.front_right_tyre_time_s,
            back_left_tyre_time_s=summary.back_left_tyre_time_s,
            back_right_tyre_time_s=summary.back_right_tyre_time_s,
            driver_out_time_s=summary.driver_out_time_s,
            driver_in_time_s=summary.driver_in_time_s,
        )
